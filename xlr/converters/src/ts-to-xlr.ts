import ts from 'typescript';
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
} from '@player-tools/xlr';
import type { TopLevelDeclaration } from '@player-tools/xlr-utils';
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
  resolveConditional,
} from '@player-tools/xlr-utils';
import { ConversionError } from './types';

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
  type: 'any',
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
    const declarations = sourceFile.statements.filter(
      (statement): statement is TopLevelDeclaration =>
        ts.isTypeAliasDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement)
    );

    const types = declarations
      .filter((declaration) => isExportedDeclaration(declaration))
      .map((statement) => this.convertDeclaration(statement) as NamedType)
      .filter(<T>(v: T): v is NonNullable<T> => !!v);

    return {
      data: { version: 1, types },
      convertedTypes: types.map(({ name }) => name),
    };
  }

  /** Converts a single type/interface declaration to XLRs */
  public convertDeclaration(
    node: TopLevelDeclaration
  ): NamedType<ObjectType> | NamedTypeWithGenerics<ObjectType> {
    const sourceFile = node.parent as ts.SourceFile;
    const { fileName } = sourceFile;
    if (ts.isTypeAliasDeclaration(node)) {
      let genericTokens;
      if (isGenericTypeDeclaration(node)) {
        genericTokens = this.generateGenerics(node.typeParameters);
      }

      return {
        name: node.name.getText(),
        source: fileName,
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
        type: 'object',
        source: fileName,
        ...this.fromTsObjectMembers(node),
        ...decorateNode(node),
        genericTokens,
      };
      // See if there are interfaces being implemented/extended
      if (node.heritageClauses) {
        return this.handleHeritageClauses(
          node.heritageClauses,
          baseObject as ObjectType,
          this.context.typeChecker
        ) as NamedType<ObjectType>;
      }

      return baseObject as NamedType<ObjectType>;
    }

    this.context.throwError(
      `Error: type node is not an Interface or a Type, can't convert as Declaration`
    );
  }

  /** Converts an arbitrary ts.TypeNode to XLRs */
  public convertTsTypeNode(node: ts.TypeNode): NodeType | undefined {
    if (this.context.cache.convertedNodes.has(node)) {
      return this.context.cache.convertedNodes.get(node);
    }

    const convertedNode = this.tsNodeToType(node);
    this.context.cache.convertedNodes.set(node, convertedNode);
    return convertedNode;
  }

  private tsNodeToType(node: ts.TypeNode): NodeType | undefined {
    if (ts.isUnionTypeNode(node)) {
      return {
        type: 'or',
        or: node.types
          .map((child) => this.convertTsTypeNode(child))
          .filter(isNonNullable),
        ...decorateNode(node),
      };
    }

    if (ts.isIntersectionTypeNode(node)) {
      return {
        type: 'and',
        and: node.types
          .map((child) => this.convertTsTypeNode(child))
          .filter(isNonNullable),
        ...decorateNode(node),
      };
    }

    if (ts.isParenthesizedTypeNode(node)) {
      const children = [...node.getChildren()];

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
          }, Is Type Node: ${ts.SyntaxKind[element.kind]}`
        );
      }

      return this.convertTsTypeNode(element);
    }

    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      return { type: 'any', ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.UnknownKeyword) {
      return { type: 'unknown', ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.StringKeyword) {
      return { type: 'string', ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.NumberKeyword) {
      return { type: 'number', ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.BooleanKeyword) {
      return { type: 'boolean', ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.UndefinedKeyword) {
      return { type: 'undefined', ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.NeverKeyword) {
      return { type: 'never', ...decorateNode(node) };
    }

    if (node.kind === ts.SyntaxKind.ObjectKeyword) {
      return {
        type: 'object',
        properties: {},
        additionalProperties: AnyTypeNode,
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
        type: 'template',
        format,
      };
    }

    if (ts.isArrayTypeNode(node)) {
      return {
        type: 'array',
        elementType: this.convertTsTypeNode(node.elementType) ?? AnyTypeNode,
        ...decorateNode(node),
      };
    }

    if (ts.isConditionalTypeNode(node)) {
      const xlrNode = {
        type: 'conditional',
        check: {
          left: this.convertTsTypeNode(node.checkType) as NodeType,
          right: this.convertTsTypeNode(node.extendsType) as NodeType,
        },
        value: {
          true: this.convertTsTypeNode(node.trueType) as NodeType,
          false: this.convertTsTypeNode(node.falseType) as NodeType,
        },
      } as ConditionalType;
      return resolveConditional(xlrNode);
    }

    if (ts.isTypeReferenceNode(node)) {
      return this.resolveRefNode(node);
    }

    if (ts.isTupleTypeNode(node)) {
      return {
        type: 'tuple',
        ...this.fromTsTuple(node),
        ...decorateNode(node),
      };
    }

    if (ts.isLiteralTypeNode(node)) {
      if (ts.isNumericLiteral(node.literal)) {
        return {
          type: 'number',
          const: Number(node.literal.text),
          ...decorateNode(node),
        };
      }

      if (ts.isStringLiteral(node.literal)) {
        return {
          type: 'string',
          const: node.literal.text,
          ...decorateNode(node),
        };
      }

      if (node.literal.kind === ts.SyntaxKind.TrueKeyword) {
        return {
          type: 'boolean',
          const: true,
          ...decorateNode(node),
        };
      }

      if (node.literal.kind === ts.SyntaxKind.FalseKeyword) {
        return {
          type: 'boolean',
          const: false,
          ...decorateNode(node),
        };
      }

      if (node.literal.kind === ts.SyntaxKind.NullKeyword) {
        return { type: 'null', ...decorateNode(node) };
      }

      if (node.literal.kind === ts.SyntaxKind.PrefixUnaryExpression) {
        this.context.throwError('Prefix unary expressions not supported');
      }

      this.context.throwError('Literal type not understood');
    } else if (ts.isTypeLiteralNode(node)) {
      return {
        type: 'object',
        ...this.fromTsObjectMembers(node),
        ...decorateNode(node),
      };
    } else if (ts.isFunctionTypeNode(node)) {
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
                  param.initializer as unknown as ts.TypeNode
                )
              : undefined,
          };
        }
      );

      const returnType =
        node.type.kind === ts.SyntaxKind.VoidKeyword
          ? undefined
          : this.convertTsTypeNode(node.type);

      return {
        type: 'function',
        parameters,
        returnType,
        ...decorateNode(node),
      };
    }

    // Handle generics
    else if (ts.isIndexedAccessTypeNode(node)) {
      if (
        ts.isTypeReferenceNode(node.objectType) &&
        ts.isLiteralTypeNode(node.indexType)
      ) {
        const baseObject = this.convertTsTypeNode(
          node.objectType
        ) as ObjectType;
        const accessor = node.indexType.literal.getText().replace(/["']/g, '');
        if (Object.keys(baseObject.properties ?? {}).includes(accessor)) {
          return baseObject.properties[accessor].node;
        }

        if (baseObject.additionalProperties) {
          return baseObject.additionalProperties;
        }
      }

      return { type: 'null' };
    } else {
      this.context.throwError(`Unimplemented type ${ts.SyntaxKind[node.kind]}`);
    }
  }

  private fromTsObjectMembers(
    node: ts.InterfaceDeclaration | ts.TypeLiteralNode
  ): Pick<ObjectType, 'properties' | 'additionalProperties'> {
    const ret: Pick<ObjectType, 'properties' | 'additionalProperties'> = {
      properties: {},
      additionalProperties: false,
    };

    node.members.forEach((member) => {
      if (ts.isPropertySignature(member) && member.type) {
        const name = member.name.getText();
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
            'Will not convert non-string index signature'
          );
        }

        ret.additionalProperties =
          this.convertTsTypeNode(member.type) ?? AnyTypeNode;
      }
    });

    return ret;
  }

  private fromTsTuple(
    node: ts.TupleTypeNode
  ): Pick<TupleType, 'elementTypes' | 'additionalItems' | 'minItems'> {
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

    const elementTypes = elements.map(
      (element) =>
        this.convertTsTypeNode(tsStripOptionalType(element)) ?? AnyTypeNode
    );

    const additionalItems = rest
      ? this.convertTsTypeNode((rest.type as ts.ArrayTypeNode).elementType) ??
        AnyTypeNode
      : false;

    const firstOptional = elements.findIndex((element) =>
      ts.isOptionalTypeNode(element)
    );
    const minItems = firstOptional === -1 ? elements.length : firstOptional;

    return {
      elementTypes,
      ...(additionalItems && additionalItems.type === 'any'
        ? { additionalItems: AnyTypeNode }
        : { additionalItems }),
      minItems,
    };
  }

  private handleHeritageClauses(
    clauses: ts.NodeArray<ts.HeritageClause>,
    baseObject: ObjectType,
    typeChecker: ts.TypeChecker
  ): ObjectType {
    let newProperties: { [x: string]: ObjectProperty } = {};
    let newAdditionalProperties: NodeType | false = false;

    clauses.forEach((heritageClause) => {
      const parent = heritageClause.types[0];
      const parentType = typeChecker.getTypeAtLocation(parent);
      const parentSymbol = parentType.symbol;
      const parentDeclarations = parentSymbol?.declarations;
      let parentInterface = parentDeclarations?.[0];

      if (
        parentInterface &&
        ts.isTypeLiteralNode(parentInterface) &&
        ts.isTypeAliasDeclaration(parentInterface.parent)
      ) {
        // check for if the node is a type to get the actual type declaration
        parentInterface = parentInterface.parent;
      }

      if (parentInterface && isTopLevelNode(parentInterface)) {
        const parentInterfaceType = this.convertDeclaration(parentInterface);
        if (parentInterface.typeParameters && parent.typeArguments) {
          const filledInInterface = this.solveGenerics(
            parentInterfaceType as NodeTypeWithGenerics,
            parentInterface.typeParameters,
            parent.typeArguments
          ) as NamedType<ObjectType>;
          newProperties = filledInInterface.properties;
          newAdditionalProperties = filledInInterface.additionalProperties;
        } else {
          if (isGenericNodeType(baseObject)) {
            baseObject.genericTokens.push(
              ...((parentInterfaceType as NodeTypeWithGenerics).genericTokens ??
                [])
            );
          }

          newProperties = parentInterfaceType.properties;
          newAdditionalProperties = parentInterfaceType.additionalProperties;
        }
      }
    });
    newAdditionalProperties =
      baseObject.additionalProperties === false
        ? newAdditionalProperties
        : false;
    return {
      ...baseObject,
      properties: { ...newProperties, ...baseObject.properties },
      additionalProperties: newAdditionalProperties,
    };
  }

  private solveGenerics(
    baseInterface: NodeTypeWithGenerics,
    typeParameters: ts.NodeArray<ts.TypeParameterDeclaration>,
    typeArguments?: ts.NodeArray<ts.TypeNode>
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
          ts.SyntaxKind.AnyKeyword
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
    params: ts.NodeArray<ts.TypeParameterDeclaration> | undefined
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

    if (node.typeName.kind === ts.SyntaxKind.QualifiedName) {
      refName = `${node.typeName.left.getText()}.${node.typeName.right.getText()}`;
    } else {
      refName = node.typeName.text;
    }

    // the use of a generic in an interface/type
    if (isTypeReferenceGeneric(node, this.context.typeChecker)) {
      if (ts.isIndexedAccessTypeNode(node.parent)) {
        const genericSymbol = this.context.typeChecker.getSymbolAtLocation(
          node.typeName
        );
        const typeParameters = this.generateGenerics(
          genericSymbol?.declarations as unknown as ts.NodeArray<ts.TypeParameterDeclaration>
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

      return { type: 'ref', ref: node.getText(), ...decorateNode(node) };
    }

    if (refName === 'Array') {
      const typeArgs = node.typeArguments as ts.NodeArray<ts.TypeNode>;
      return {
        type: 'array',
        elementType: typeArgs
          ? this.convertTsTypeNode(typeArgs[0]) ?? AnyTypeNode
          : AnyTypeNode,
        ...decorateNode(node),
      };
    }

    if (refName === 'Record') {
      const indexType = node.typeArguments?.[0] as ts.TypeNode;
      const valueType = node.typeArguments?.[1] as ts.TypeNode;
      return {
        type: 'record',
        keyType: this.convertTsTypeNode(indexType) ?? AnyTypeNode,
        valueType: this.convertTsTypeNode(valueType) ?? AnyTypeNode,
        ...decorateNode(node),
      };
    }

    if (refName === 'Pick' || refName === 'Omit') {
      const baseType = node.typeArguments?.[0] as ts.TypeNode;
      const modifiers = node.typeArguments?.[1] as ts.TypeNode;

      const baseObj = this.convertTsTypeNode(baseType) as NamedType<ObjectType>;
      const modifierNames = getStringLiteralsFromUnion(modifiers);

      return (
        applyPickOrOmitToNodeType(baseObj, refName, modifierNames) ?? {
          type: 'never',
        }
      );
    }

    if (refName === 'Partial' || refName === 'Required') {
      const baseType = node.typeArguments?.[0] as ts.TypeNode;
      const baseObj = this.convertTsTypeNode(baseType) as NodeType;
      const modifier = refName !== 'Partial';

      return applyPartialOrRequiredToNodeType(baseObj, modifier);
    }

    // catch all for all other type references
    if (!this.context.customPrimitives.includes(refName)) {
      const typeInfo = getReferencedType(node, this.context.typeChecker);
      if (typeInfo) {
        const genericType = this.convertDeclaration(typeInfo.declaration);
        const genericParams = typeInfo.declaration.typeParameters;
        const genericArgs = node.typeArguments;
        if (genericType && genericParams && genericArgs) {
          return this.solveGenerics(
            genericType as NamedTypeWithGenerics,
            genericParams,
            genericArgs
          );
        }

        if (genericType) {
          return genericType;
        }
      }

      this.context.throwError(
        `Can't find referenced type ${refName}, is it available in the current package or node_modules?`
      );
    }

    const genericArgs: Array<NodeType | NamedType<ObjectType>> = [];
    if (node.typeArguments) {
      node.typeArguments.forEach((typeArg) => {
        let convertedNode;
        if (isTopLevelNode(typeArg)) {
          convertedNode = this.convertDeclaration(typeArg);
        } else {
          convertedNode = this.convertTsTypeNode(typeArg);
        }

        if (convertedNode) {
          genericArgs.push(convertedNode);
        } else {
          this.context.throwError(
            `Conversion Error: Couldn't convert type argument in type ${refName}`
          );
        }
      });
    }

    return {
      type: 'ref',
      ref: node.getText(),
      ...decorateNode(node),
      genericArguments: genericArgs.length > 0 ? genericArgs : undefined,
    };
  }
}
