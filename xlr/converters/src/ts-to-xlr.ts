import ts from "typescript";
import type {
  NodeType,
  FunctionTypeParameters,
  TupleType,
  NamedType,
  ObjectType,
  NamedTypeWithGenerics,
  NodeTypeWithGenerics,
  ObjectProperty,
  AnyType,
  ParamTypeNode,
  ConditionalType,
  RefType,
  ArrayType,
  OrType,
} from "@player-tools/xlr";
import type {
  TopLevelDeclaration,
  TopLevelNode,
} from "@player-tools/xlr-utils";
import {
  buildTemplateRegex,
  decorateNode,
  fillInGenerics,
  getReferencedType,
  getStringLiteralsFromUnion,
  isExportedDeclaration,
  isGenericInterfaceDeclaration,
  isGenericNodeType,
  isGenericTypeDeclaration,
  isOptionalProperty,
  isTypeReferenceGeneric,
  tsStripOptionalType,
  isNonNullable,
  applyPartialOrRequiredToNodeType,
  applyPickOrOmitToNodeType,
  isTopLevelNode,
  isTopLevelDeclaration,
  resolveConditional,
  applyExcludeToNodeType,
  isPrimitiveTypeNode,
  isTypeScriptLibType,
} from "@player-tools/xlr-utils";
import { ConversionError } from "./types";

export type MappedType = "Pick" | "Omit" | "Required" | "Partial" | "Exclude";

/**
 * Returns if the string is one of TypeScript"s MappedTypes
 */
export function isMappedTypeNode(x: string): x is MappedType {
  return ["Pick", "Omit", "Required", "Partial", "Exclude"].includes(x);
}

/**
 * Extract the property name from a PropertyName node, handling both
 * identifier and string literal forms.
 *
 * TypeScript allows property names to be:
 * - Identifiers: `propertyName`
 * - String literals: `"property-name"` or `'property-name'`
 * - Numeric literals: `123`
 * - Computed: `[expression]`
 *
 * This function returns the unquoted string value for identifiers and string literals.
 * For computed property names, falls back to getText().
 */
function getPropertyNameText(name: ts.PropertyName): string {
  if (ts.isIdentifier(name)) {
    return name.text;
  }

  if (ts.isStringLiteral(name)) {
    return name.text; // .text already returns unquoted value
  }

  if (ts.isNumericLiteral(name)) {
    return name.text;
  }

  // For computed property names, fall back to getText()
  return name.getText();
}

export interface TSConverterContext {
  /** */
  customPrimitives: Array<string>;

  /** */
  typeChecker: ts.TypeChecker;

  /** */
  throwError: (message: string) => never;

  /** Cached conversion operations */
  cache: {
    /** Converted TS Nodes */
    convertedNodes: Map<ts.TypeNode, NodeType | undefined>;

    /** Processed Template Strings */
    convertedTemplates: Map<ts.TemplateLiteralTypeNode, string>;
  };
}

const AnyTypeNode: AnyType = {
  type: "any",
};

/** Converts TS Nodes/Files to XLRs */
export class TsConverter {
  private context: TSConverterContext;

  constructor(typeChecker: ts.TypeChecker, customPrimitives?: Array<string>) {
    this.context = {
      customPrimitives: customPrimitives ?? [],
      typeChecker,
      throwError: (message: string) => {
        throw new ConversionError(message);
      },
      cache: {
        convertedNodes: new Map(),
        convertedTemplates: new Map(),
      },
    };
  }

  /** Converts all exported objects to a XLR representation */
  public convertSourceFile(sourceFile: ts.SourceFile) {
    const declarations = sourceFile.statements.filter(isTopLevelNode);

    const types = declarations
      .filter((declaration) => isExportedDeclaration(declaration))
      .map((statement) => this.convertTopLevelNode(statement) as NamedType)
      .filter(<T>(v: T): v is NonNullable<T> => !!v);

    return {
      data: { version: 1, types },
      convertedTypes: types.map(({ name }) => name),
    };
  }

  public convertTopLevelNode(
    node: TopLevelNode,
  ): NamedType | NamedTypeWithGenerics {
    const sourceFile = node.parent as ts.SourceFile;
    const { fileName } = sourceFile;

    if (ts.isVariableStatement(node)) {
      return {
        source: fileName,
        ...this.convertVariable(node),
      } as NamedType;
    }

    return {
      source: fileName,
      ...this.convertDeclaration(node),
    } as NamedType;
  }

  /** Converts a single type/interface declaration to XLRs */
  public convertDeclaration(
    node: TopLevelDeclaration,
  ): ObjectType | NodeTypeWithGenerics<ObjectType> {
    if (ts.isTypeAliasDeclaration(node)) {
      let genericTokens;
      if (isGenericTypeDeclaration(node)) {
        genericTokens = this.generateGenerics(node.typeParameters);
      }

      return {
        name: node.name.getText(),
        ...(this.convertTsTypeNode(node.type) ?? AnyTypeNode),
        ...decorateNode(node),
        genericTokens,
      } as NamedTypeWithGenerics<ObjectType>;
    }

    if (ts.isInterfaceDeclaration(node)) {
      let genericTokens;
      if (isGenericInterfaceDeclaration(node)) {
        genericTokens = this.generateGenerics(node.typeParameters);
      }

      const baseObject = {
        name: node.name.getText(),
        type: "object",
        ...this.tsObjectMembersToProperties(node),
        ...decorateNode(node),
        genericTokens,
      };
      // See if there are interfaces being implemented/extended
      if (node.heritageClauses) {
        return this.handleHeritageClauses(
          node.heritageClauses,
          baseObject as ObjectType,
          this.context.typeChecker,
        ) as NamedType<ObjectType>;
      }

      return baseObject as ObjectType;
    }

    this.context.throwError(
      `Error: type node is not an Interface or a Type, can't convert as Declaration`,
    );
  }

  public convertVariable(node: ts.VariableStatement): NodeType {
    const variableDeclarations = node.declarationList.declarations;
    if (variableDeclarations.length === 1) {
      const variable = variableDeclarations[0];

      if (variable.initializer) {
        let resultingNode;
        if (
          ts.isCallExpression(variable.initializer) ||
          ts.isArrowFunction(variable.initializer)
        ) {
          resultingNode = this.resolveFunctionCall(
            variable.initializer,
            node.parent,
          );
        } else {
          resultingNode = this.tsLiteralToType(variable.initializer);
        }

        // If resultingNode is a reference to a function or custom primitive and not a concrete value
        // we need to update the name to be the name of the exporting variable
        // not the name of the identifier its aliasing
        if (resultingNode.type === "function" || resultingNode.type === "ref") {
          resultingNode = { ...resultingNode, name: variable.name.getText() };
        }

        return {
          name: variable.name.getText(),
          ...resultingNode,
        } as NamedType;
      }
    }

    this.context.throwError(
      `Error: Multi-variable declaration on line ${node.pos} is not supported for conversion`,
    );
  }

  /** Converts an arbitrary ts.TypeNode to XLRs */
  public convertTsTypeNode(node: ts.TypeNode): NodeType {
    if (this.context.cache.convertedNodes.has(node)) {
      const cachedType = this.context.cache.convertedNodes.get(
        node,
      ) as NodeType;
      // return deep copy of node so modifications don't effect referenced to the original
      return JSON.parse(JSON.stringify(cachedType));
    }

    const convertedNode = this.tsNodeToType(node);
    this.context.cache.convertedNodes.set(node, convertedNode);
    return convertedNode;
  }

  /** Should not be called directly unless you want to bypass the cache, use `convertTsTypeNode` */
  private tsNodeToType(node: ts.TypeNode): NodeType {
    if (ts.isUnionTypeNode(node)) {
      return {
        type: "or",
        or: node.types
          .map((child) => this.convertTsTypeNode(child))
          .filter(isNonNullable),
        ...decorateNode(node),
      };
    }

    if (ts.isIntersectionTypeNode(node)) {
      return {
        type: "and",
        and: node.types
          .map((child) => this.convertTsTypeNode(child))
          .filter(isNonNullable),
        ...decorateNode(node),
      };
    }

    if (ts.isParenthesizedTypeNode(node)) {
      const children: ts.Node[] = [];
      node.forEachChild((child) => {
        children.push(child);
      });

      if (children[0]?.kind === ts.SyntaxKind.OpenParenToken) {
        children.shift();
      }

      if (
        children[children.length - 1]?.kind === ts.SyntaxKind.CloseParenToken
      ) {
        children.pop();
      }

      const element = children[0];

      if (children.length !== 1 || !ts.isTypeNode(element)) {
        this.context.throwError(
          `Parenthesis type not understood. Length ${
            children.length
          }, Is Type Node: ${ts.SyntaxKind[element.kind]}`,
        );
      }

      return this.convertTsTypeNode(element);
    }

    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      return { type: "any", ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.UnknownKeyword) {
      return { type: "unknown", ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.StringKeyword) {
      return { type: "string", ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.NumberKeyword) {
      return { type: "number", ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.BooleanKeyword) {
      return { type: "boolean", ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      return { type: "undefined", ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.NeverKeyword) {
      return { type: "never", ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.ObjectKeyword) {
      return {
        type: "object",
        properties: {},
        additionalProperties: AnyTypeNode,
        ...decorateNode(node),
      };
    }

    if (node.kind === ts.SyntaxKind.VoidKeyword) {
      return {
        type: "void",
        ...decorateNode(node),
      };
    }

    if (ts.isTemplateLiteralTypeNode(node)) {
      let format;

      if (this.context.cache.convertedTemplates.has(node)) {
        format = this.context.cache.convertedTemplates.get(node) as string;
      } else {
        format = buildTemplateRegex(node, this.context.typeChecker);
        this.context.cache.convertedTemplates.set(node, format);
      }

      return {
        type: "template",
        format,
      };
    }

    if (ts.isArrayTypeNode(node)) {
      return {
        type: "array",
        elementType: this.convertTsTypeNode(node.elementType) ?? AnyTypeNode,
        ...decorateNode(node),
      };
    }

    if (ts.isConditionalTypeNode(node)) {
      const xlrNode = {
        type: "conditional",
        check: {
          left: this.convertTsTypeNode(node.checkType) as NodeType,
          right: this.convertTsTypeNode(node.extendsType) as NodeType,
        },
        value: {
          true: this.convertTsTypeNode(node.trueType) as NodeType,
          false: this.convertTsTypeNode(node.falseType) as NodeType,
        },
      } as ConditionalType;
      // Resolve simple conditionals now, defer complex ones to runtime
      if (
        isPrimitiveTypeNode(xlrNode.check.left) &&
        isPrimitiveTypeNode(xlrNode.check.right)
      ) {
        return resolveConditional(xlrNode);
      } else {
        return xlrNode;
      }
    }

    if (ts.isTypeReferenceNode(node)) {
      return this.resolveRefNode(node);
    }

    if (ts.isTupleTypeNode(node)) {
      return {
        type: "tuple",
        ...this.tsTupleToType(node),
        ...decorateNode(node),
      };
    }

    if (ts.isLiteralTypeNode(node)) {
      return this.tsLiteralToType(node.literal);
    }

    if (ts.isTypeLiteralNode(node)) {
      return {
        type: "object",
        ...this.tsObjectMembersToProperties(node),
        ...decorateNode(node),
      };
    }

    if (
      ts.isFunctionTypeNode(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isArrowFunction(node)
    ) {
      const parameters: Array<FunctionTypeParameters> = node.parameters.map(
        (param) => {
          let typeNode;
          if (param.type) {
            typeNode = this.convertTsTypeNode(param.type);
          }

          return {
            name: param.name.getText(),
            type: typeNode ?? AnyTypeNode,
            optional: param.questionToken ? true : undefined,
            default: param.initializer
              ? this.convertTsTypeNode(
                  param.initializer as unknown as ts.TypeNode,
                )
              : undefined,
          };
        },
      );

      let returnType;
      if (node.type !== undefined) {
        returnType = this.convertTsTypeNode(node.type);
      }

      return {
        type: "function",
        parameters,
        returnType,
        ...decorateNode(node),
      };
    }

    // Handle generics
    if (ts.isIndexedAccessTypeNode(node)) {
      if (
        ts.isTypeReferenceNode(node.objectType) &&
        ts.isLiteralTypeNode(node.indexType)
      ) {
        const baseObject = this.convertTsTypeNode(node.objectType);
        const accessor = node.indexType.literal.getText().replace(/["']/g, "");
        if (!baseObject) {
          this.context.throwError(
            `Error: Couldn't resolve index access on property ${accessor} on type ${node.objectType.typeName.getText()}`,
          );
        } else if (baseObject.type === "object") {
          if (Object.keys(baseObject.properties ?? {}).includes(accessor)) {
            return baseObject.properties[accessor].node;
          }

          if (baseObject.additionalProperties) {
            return baseObject.additionalProperties;
          }
        } else if (baseObject.type === "ref") {
          return { ...baseObject, property: accessor };
        } else {
          this.context.throwError(
            `Error: Index access on non object/ref type ${baseObject.type}`,
          );
        }
      }

      let queryNode = node.objectType;
      // handle cases where the object being accessed is wrapped in () because of linting
      if (ts.isParenthesizedTypeNode(node.objectType)) {
        queryNode = node.objectType.type;
      }

      if (ts.isTypeQueryNode(queryNode)) {
        const elements = this.tsNodeToType(node.objectType) as TupleType;
        return {
          type: "or",
          or: [...elements.elementTypes.map((element) => element.type)],
        };
      }

      // Fallback: Use TypeChecker to resolve dynamic indexed access types
      // This handles cases like T[keyof T], WeakKeyTypes[keyof WeakKeyTypes], etc.
      const effectiveType = this.context.typeChecker.getTypeAtLocation(node);
      const syntheticType = this.context.typeChecker.typeToTypeNode(
        effectiveType,
        node,
        ts.NodeBuilderFlags.NoTruncation,
      );
      if (syntheticType) {
        return this.tsNodeToType(syntheticType);
      }

      this.context.throwError(
        `Error: could not solve IndexedAccessType: ${node.getFullText()}`,
      );
    }

    if (ts.isTypeQueryNode(node)) {
      const effectiveType = this.context.typeChecker.getTypeAtLocation(node);
      const syntheticType = this.context.typeChecker.typeToTypeNode(
        effectiveType,
        node,
        ts.NodeBuilderFlags.NoTruncation,
      );
      if (syntheticType) {
        return this.tsNodeToType(syntheticType);
      }

      this.context.throwError(
        `Error: could not synthesize type for ${node.getText()}`,
      );
    }

    if (ts.isTypeOperatorNode(node)) {
      return this.tsNodeToType(node.type);
    }

    this.context.throwError(
      `Unimplemented type ${ts.SyntaxKind[node.kind]} at ${node.getText()}`,
    );
  }

  private tsLiteralToType(node: ts.Expression): NodeType {
    // Handle "as const" assertions by unwrapping to the inner expression
    if (ts.isAsExpression(node)) {
      return this.tsLiteralToType(node.expression);
    }

    if (ts.isNumericLiteral(node)) {
      return {
        type: "number",
        const: Number(node.text),
        ...decorateNode(node),
      };
    }

    if (ts.isStringLiteral(node)) {
      return {
        type: "string",
        const: node.text,
        ...decorateNode(node),
      };
    }

    if (node.kind === ts.SyntaxKind.TrueKeyword) {
      return {
        type: "boolean",
        const: true,
        ...decorateNode(node),
      };
    }

    if (node.kind === ts.SyntaxKind.FalseKeyword) {
      return {
        type: "boolean",
        const: false,
        ...decorateNode(node),
      };
    }

    if (node.kind === ts.SyntaxKind.NullKeyword) {
      return { type: "null", ...decorateNode(node) };
    }

    if (ts.isPrefixUnaryExpression(node)) {
      this.context.throwError("Prefix unary expressions not supported");
    }

    if (ts.isArrayLiteralExpression(node)) {
      const arrayElements: unknown[] = [];
      node.elements.forEach((element) => {
        if (ts.isSpreadElement(element)) {
          const arrayReference = this.resolveLiteralReference(
            element.expression,
          ) as ArrayType;
          arrayElements.push(...(arrayReference.const ?? []));
        } else {
          arrayElements.push(this.tsLiteralToType(element));
        }
      });
      return {
        type: "array",
        elementType: { type: "any" },
        const: arrayElements,
      };
    }

    if (ts.isObjectLiteralExpression(node)) {
      const ret = {
        type: "object",
        properties: {},
        additionalProperties: false,
      } as ObjectType;

      node.properties.forEach((property) => {
        if (ts.isPropertyAssignment(property) && property.name) {
          const propertyName = getPropertyNameText(property.name);
          ret.properties[propertyName] = {
            required: true,
            node: this.tsLiteralToType(property.initializer),
          };
        } else if (ts.isSpreadAssignment(property)) {
          const spreadValue = this.resolveLiteralReference(
            property.expression,
          ) as ObjectType;
          ret.properties = {
            ...ret.properties,
            ...spreadValue.properties,
          };
        }
      });

      return ret;
    }

    if (ts.isIdentifier(node)) {
      return this.resolveLiteralReference(node);
    }

    this.context.throwError(
      `Literal type not understood ${
        ts.SyntaxKind[node.kind]
      } at ${node.getText()}`,
    );
  }

  private resolveLiteralReference(expression: ts.Expression): NodeType {
    if (ts.isIdentifier(expression)) {
      const symbol = this.context.typeChecker.getSymbolAtLocation(expression);
      let expressionReference = symbol?.declarations?.[0];
      if (
        symbol &&
        expressionReference &&
        ts.isImportSpecifier(expressionReference)
      ) {
        const referencedDeclaration =
          this.context.typeChecker.getAliasedSymbol(symbol);
        expressionReference = referencedDeclaration.declarations?.[0];
      }

      if (
        expressionReference &&
        ts.isVariableDeclaration(expressionReference) &&
        expressionReference.initializer
      ) {
        return this.convertVariable(
          expressionReference.parent.parent as ts.VariableStatement,
        );
      }

      this.context.throwError(
        `Error: Can't resolve non-variable declaration ${expressionReference?.getText()}`,
      );
    }

    this.context.throwError(
      `Error: Can't resolve non-identifier reference in literal ${expression.getText()}`,
    );
  }

  private resolveFunctionCall(
    functionCall: ts.CallExpression | ts.ArrowFunction,
    document: ts.Node,
  ): NodeType {
    if (ts.isArrowFunction(functionCall)) {
      const declaredReturnType = (functionCall.parent as ts.VariableDeclaration)
        .type;
      if (declaredReturnType) {
        return this.tsNodeToType(declaredReturnType);
      }
    }

    const functionReturnType =
      this.context.typeChecker.getTypeAtLocation(functionCall);

    let syntheticNode = this.context.typeChecker.typeToTypeNode(
      functionReturnType,
      document,
      undefined,
    );

    // Synthetic node loses parameter location information, and text making it unable
    // to get the parameter name in tsNodeToType
    if (ts.isArrowFunction(functionCall)) {
      const syntheticWithParameters = {
        ...syntheticNode,
        parameters: functionCall.parameters,
      };
      syntheticNode = syntheticWithParameters as unknown as ts.TypeNode;
    }

    if (syntheticNode) {
      if (
        ts.isTypeReferenceNode(syntheticNode) &&
        ts.isIdentifier(syntheticNode.typeName)
      ) {
        const { typeName } = syntheticNode;

        if (this.context.customPrimitives.includes(typeName.text)) {
          return this.makeBasicRefNode(syntheticNode);
        }

        // Can't use typechecker on synthetic nodes
        const declarationSymbol = (typeName as any).symbol as ts.Symbol;

        if (declarationSymbol && declarationSymbol.declarations?.[0]) {
          const declaration = declarationSymbol.declarations[0];
          if (
            ts.isTypeAliasDeclaration(declaration) ||
            ts.isInterfaceDeclaration(declaration)
          ) {
            return this.convertDeclaration(declaration);
          }
        }

        this.context.throwError(
          `Error: could not get referenced type ${syntheticNode.getText()}`,
        );
      }

      return this.tsNodeToType(syntheticNode) as NodeType;
    }

    this.context.throwError(
      `Error: could not determine effective return type of ${functionCall.getText()}`,
    );
  }

  private tsObjectMembersToProperties(
    node: ts.InterfaceDeclaration | ts.TypeLiteralNode,
  ): Pick<ObjectType, "properties" | "additionalProperties"> {
    const ret: Pick<ObjectType, "properties" | "additionalProperties"> = {
      properties: {},
      additionalProperties: false,
    };

    node.members.forEach((member) => {
      if (ts.isPropertySignature(member) && member.type) {
        const name = getPropertyNameText(member.name);
        ret.properties[name] = {
          required: !isOptionalProperty(member),
          node: {
            ...(this.convertTsTypeNode(member.type) ?? AnyTypeNode),
            ...decorateNode(member),
          },
        };
      } else if (ts.isIndexSignatureDeclaration(member)) {
        const param = member.parameters[0];
        if (param.type?.kind !== ts.SyntaxKind.StringKeyword) {
          this.context.throwError(
            "Will not convert non-string index signature",
          );
        }

        ret.additionalProperties =
          this.convertTsTypeNode(member.type) ?? AnyTypeNode;
      }
    });

    return ret;
  }

  private tsTupleToType(
    node: ts.TupleTypeNode,
  ): Pick<TupleType, "elementTypes" | "additionalItems" | "minItems"> {
    if (node.elements.length === 0) {
      return { elementTypes: [], additionalItems: false, minItems: 0 };
    }

    const hasRest = ts.isRestTypeNode(node.elements[node.elements.length - 1]);

    const [elements, rest] = hasRest
      ? [
          node.elements.slice(0, node.elements.length - 1),
          node.elements[node.elements.length - 1] as ts.RestTypeNode,
        ]
      : [[...node.elements], undefined];

    const elementTypes = elements.map((element) => {
      if (ts.isNamedTupleMember(element)) {
        let typeNode;
        if (element.type) {
          typeNode = this.convertTsTypeNode(element.type);
        }

        return {
          name: element.name.text,
          type: typeNode ?? AnyTypeNode,
          optional: element.questionToken ? true : undefined,
        };
      }

      return {
        type: this.convertTsTypeNode(tsStripOptionalType(element)),
        optional: ts.isOptionalTypeNode(element),
      };
    });

    const additionalItems = rest
      ? (this.convertTsTypeNode((rest.type as ts.ArrayTypeNode).elementType) ??
        AnyTypeNode)
      : false;

    const firstOptional = elementTypes.findIndex(
      (element) => element.optional === true,
    );
    const minItems = firstOptional === -1 ? elements.length : firstOptional;

    return {
      elementTypes,
      ...(additionalItems && additionalItems.type === "any"
        ? { additionalItems: AnyTypeNode }
        : { additionalItems }),
      minItems,
    };
  }

  private handleHeritageClauses(
    clauses: ts.NodeArray<ts.HeritageClause>,
    baseObject: ObjectType,
    typeChecker: ts.TypeChecker,
  ): ObjectType {
    let newProperties: { [x: string]: ObjectProperty } = {};
    const additionalPropertiesCollector: Array<NodeType> = [];
    let extendsType: RefType | undefined;

    clauses.forEach((heritageClause) => {
      heritageClause.types.forEach((parent) => {
        let typeToApply: ObjectType;

        // Check if its a Mapped Type
        const typeName = parent.expression.getText();
        if (isMappedTypeNode(typeName)) {
          typeToApply = this.makeMappedType(typeName, parent) as ObjectType;
        } else {
          const parentType = typeChecker.getTypeAtLocation(parent);
          const parentSymbol = parentType.symbol;
          const parentDeclarations = parentSymbol?.declarations;

          if (!parentDeclarations?.[0]) {
            this.context.throwError(
              `Error: Unable to get underlying interface for extending class ${parent.getFullText()}`,
            );
          }

          let parentInterface: TopLevelDeclaration;

          if (
            ts.isTypeLiteralNode(parentDeclarations?.[0]) &&
            ts.isTypeAliasDeclaration(parentDeclarations?.[0].parent)
          ) {
            // check for if the node is a type to get the actual type declaration
            parentInterface = parentDeclarations?.[0].parent;
          } else {
            parentInterface = parentDeclarations?.[0] as TopLevelDeclaration;
          }

          if (
            this.context.customPrimitives.includes(parentInterface.name.text)
          ) {
            extendsType = this.makeBasicRefNode(parent);
            return;
          }

          typeToApply = this.convertDeclaration(parentInterface);

          if (typeToApply.extends) {
            extendsType = typeToApply.extends;
          }

          if (parentInterface.typeParameters && parent.typeArguments) {
            typeToApply = this.resolveGenerics(
              typeToApply as NodeTypeWithGenerics,
              parentInterface.typeParameters,
              parent.typeArguments,
            ) as NamedType<ObjectType>;
          } else if (isGenericNodeType(baseObject)) {
            baseObject.genericTokens.push(
              ...((typeToApply as NodeTypeWithGenerics).genericTokens ?? []),
            );
          }
        }

        newProperties = {
          ...newProperties,
          ...typeToApply.properties,
        };
        if (typeToApply.additionalProperties) {
          additionalPropertiesCollector.push(typeToApply.additionalProperties);
        }
      });
    });
    // Resolve Additional Properties
    let additionalProperties: NodeType | false = false;
    if (baseObject.additionalProperties === false) {
      if (additionalPropertiesCollector.length === 1) {
        additionalProperties = additionalPropertiesCollector[0];
      } else if (additionalPropertiesCollector.length >= 1) {
        additionalProperties = {
          type: "or",
          or: additionalPropertiesCollector,
        };
      }
    }

    return {
      ...baseObject,
      ...(extendsType ? { extends: extendsType } : {}),
      properties: { ...newProperties, ...baseObject.properties },
      additionalProperties,
    };
  }

  private resolveGenerics(
    baseInterface: NodeTypeWithGenerics,
    typeParameters: ts.NodeArray<ts.TypeParameterDeclaration>,
    typeArguments?: ts.NodeArray<ts.TypeNode>,
  ): NodeTypeWithGenerics | NodeType {
    // map type args to generics
    if (typeArguments && typeArguments.length === 0) return baseInterface;
    const genericMap: Map<string, NodeType> = new Map();
    typeParameters.forEach((tp, i) => {
      let typeToProcess: ts.TypeNode;
      if (typeArguments && i < typeArguments.length) {
        typeToProcess = typeArguments[i];
      } else if (tp.default) {
        typeToProcess = tp.default;
      } else {
        // might need to do some error checking here if there is no type to fill in
        typeToProcess = ts.factory.createKeywordTypeNode(
          ts.SyntaxKind.AnyKeyword,
        );
      }

      const processedNodeType = this.convertTsTypeNode(typeToProcess);
      if (processedNodeType) {
        genericMap.set(tp.name.getText(), processedNodeType);
      }
    });

    return fillInGenerics(baseInterface, genericMap);
  }

  private generateGenerics(
    params: ts.NodeArray<ts.TypeParameterDeclaration> | undefined,
  ): Array<ParamTypeNode> {
    const genericArray: Array<ParamTypeNode> = [];

    params?.forEach((param) => {
      const serializedObject: ParamTypeNode = {
        symbol: param.name.text,
      };
      if (param.constraint) {
        // any case is unsafe but it can be either a Type or TypeNode and both are parsed fine
        serializedObject.constraints = this.convertTsTypeNode(param.constraint);
      } else {
        serializedObject.constraints = AnyTypeNode;
      }

      if (param.default) {
        // any case is unsafe but it can be either a Type or TypeNode and both are parsed fine
        serializedObject.default = this.convertTsTypeNode(param.default);
      } else {
        serializedObject.default = AnyTypeNode;
      }

      genericArray.push(serializedObject);
    });

    return genericArray;
  }

  private resolveRefNode(node: ts.TypeReferenceNode): NodeType {
    let refName: string;
    let namespace: string | undefined;

    if (node.typeName.kind === ts.SyntaxKind.QualifiedName) {
      namespace = node.typeName.left.getText();
      refName = node.typeName.right.getText();
    } else {
      refName = node.typeName.text;
    }

    // the use of a generic in an interface/type
    if (isTypeReferenceGeneric(node, this.context.typeChecker)) {
      if (ts.isIndexedAccessTypeNode(node.parent)) {
        const genericSymbol = this.context.typeChecker.getSymbolAtLocation(
          node.typeName,
        );
        const typeParameters = this.generateGenerics(
          genericSymbol?.declarations as unknown as ts.NodeArray<ts.TypeParameterDeclaration>,
        );
        const typeParameter = typeParameters[0];
        if (typeParameter) {
          if (typeParameter.constraints) {
            return typeParameter.constraints;
          }

          if (typeParameter.default) {
            return typeParameter.default;
          }
        }

        return AnyTypeNode;
      }

      return { type: "ref", ref: node.getText(), ...decorateNode(node) };
    }

    if (refName === "Array") {
      const typeArgs = node.typeArguments as ts.NodeArray<ts.TypeNode>;
      return {
        type: "array",
        elementType: typeArgs
          ? (this.convertTsTypeNode(typeArgs[0]) ?? AnyTypeNode)
          : AnyTypeNode,
        ...decorateNode(node),
      };
    }

    if (refName === "Record") {
      const indexType = node.typeArguments?.[0] as ts.TypeNode;
      const valueType = node.typeArguments?.[1] as ts.TypeNode;
      return {
        type: "record",
        keyType: this.convertTsTypeNode(indexType) ?? AnyTypeNode,
        valueType: this.convertTsTypeNode(valueType) ?? AnyTypeNode,
        ...decorateNode(node),
      };
    }

    if (isMappedTypeNode(refName)) {
      return this.makeMappedType(refName, node);
    }

    // Skip TypeScript built-in lib types (Map, Set, WeakMap, Promise, etc.)
    // These should be treated as primitives, not expanded
    if (isTypeScriptLibType(node, this.context.typeChecker)) {
      return this.makeBasicRefNode(node);
    }

    // catch all for all other type references
    if (!this.context.customPrimitives.includes(refName)) {
      const typeInfo = getReferencedType(node, this.context.typeChecker);
      if (typeInfo) {
        const convertedType = this.convertTopLevelNode(typeInfo.declaration);
        const genericParams = typeInfo.declaration.typeParameters;
        const genericArgs = node.typeArguments;
        if (convertedType && genericParams && genericArgs) {
          const resolvedType = this.resolveGenerics(
            convertedType as NamedTypeWithGenerics,
            genericParams,
            genericArgs,
          );

          // Preserve full type name including generic arguments for instantiated generics
          // e.g., SimpleModifier<"format"> should keep the name as "SimpleModifier<'format'>"
          if ("name" in resolvedType && genericArgs.length > 0) {
            const argsText = Array.from(genericArgs)
              .map((arg) => arg.getText())
              .join(", ");
            const baseName = namespace ? `${namespace}.${refName}` : refName;
            return { ...resolvedType, name: `${baseName}<${argsText}>` };
          }

          // Preserve full qualified name for namespaced types (e.g., Validation.CrossfieldReference)
          if (namespace && "name" in resolvedType) {
            return { ...resolvedType, name: `${namespace}.${refName}` };
          }
          return resolvedType;
        }

        if (convertedType) {
          // Preserve full qualified name for namespaced types (e.g., Validation.CrossfieldReference)
          if (namespace && "name" in convertedType) {
            return { ...convertedType, name: `${namespace}.${refName}` };
          }
          return convertedType;
        }
      }

      this.context.throwError(
        `Can't find referenced type ${refName}, is it available in the current package or node_modules?`,
      );
    }

    return this.makeBasicRefNode(node);
  }

  private makeMappedType(
    refName: MappedType,
    node: ts.NodeWithTypeArguments,
  ): ObjectType {
    if (refName === "Pick" || refName === "Omit" || refName === "Exclude") {
      const baseType = node.typeArguments?.[0] as ts.TypeNode;
      const modifiers = node.typeArguments?.[1] as ts.TypeNode;

      const baseObj = this.convertTsTypeNode(baseType);

      if (refName === "Exclude") {
        if (baseObj.type === "or") {
          return applyExcludeToNodeType(
            baseObj as OrType,
            this.convertTsTypeNode(modifiers),
          ) as ObjectType;
        }

        throw new ConversionError(
          "Error: Can't solve Exclude type on non-union node",
        );
      } else {
        return applyPickOrOmitToNodeType(
          baseObj,
          refName,
          getStringLiteralsFromUnion(modifiers),
        ) as ObjectType;
      }
    }

    if (refName === "Partial" || refName === "Required") {
      const baseType = node.typeArguments?.[0] as ts.TypeNode;
      const baseObj = this.convertTsTypeNode(baseType) as NodeType;
      const modifier = refName !== "Partial";

      return applyPartialOrRequiredToNodeType(baseObj, modifier) as ObjectType;
    }

    this.context.throwError(`Can't convert non-MappedType ${refName}`);
  }

  private makeBasicRefNode(node: ts.NodeWithTypeArguments): RefType {
    const genericArgs: Array<NodeType | NamedType<ObjectType>> = [];
    if (node.typeArguments) {
      node.typeArguments.forEach((typeArg) => {
        let convertedNode;
        if (isTopLevelDeclaration(typeArg)) {
          convertedNode = this.convertDeclaration(typeArg);
        } else {
          convertedNode = this.convertTsTypeNode(typeArg);
        }

        if (convertedNode) {
          genericArgs.push(convertedNode);
        } else {
          this.context.throwError(
            `Conversion Error: Couldn't convert type argument in type ${node.getText()}`,
          );
        }
      });
    }

    let ref: string;

    if (ts.isTypeReferenceNode(node)) {
      // Handle qualified names (e.g., Validation.CrossfieldReference) - keep full path in ref
      if (node.typeName.kind === ts.SyntaxKind.QualifiedName) {
        ref = `${node.typeName.left.getText()}.${node.typeName.right.getText()}`;
      } else if (node.pos === -1 && ts.isIdentifier(node.typeName)) {
        ref = node.typeName.text;
      } else {
        ref = node.getText();
      }
    } else {
      ref = node.getText();
    }

    return {
      type: "ref",
      ref,
      ...decorateNode(node),
      genericArguments: genericArgs.length > 0 ? genericArgs : undefined,
    };
  }
}
