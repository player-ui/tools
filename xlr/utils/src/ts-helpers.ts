/* eslint-disable no-bitwise */
import * as ts from 'typescript';
import type {
  NamedType,
  NodeType,
  ObjectProperty,
  ObjectType,
  OrType,
} from '@player-tools/xlr';
import { computeExtends, resolveConditional } from './validation-helpers';
import { isGenericNodeType } from './type-checks';

/**
 * Returns the required type or the optionally required type
 */
export function tsStripOptionalType(node: ts.TypeNode): ts.TypeNode {
  return ts.isOptionalTypeNode(node) ? node.type : node;
}

/**
 * Returns if the top level declaration is exported
 */
export function isExportedDeclaration(node: ts.Statement) {
  const modifiers = ts.canHaveModifiers(node)
    ? ts.getModifiers(node)
    : undefined;
  return (
    modifiers &&
    modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
  );
}

/**
 * Returns if the node is exported from the source file
 */
export function isNodeExported(node: ts.Node): boolean {
  return (
    (ts.getCombinedModifierFlags(node as ts.Declaration) &
      ts.ModifierFlags.Export) !==
      0 ||
    (!!node.parent && node.parent.kind === ts.SyntaxKind.SourceFile)
  );
}

/**
 * Returns the actual type and will following import chains if needed
 */
export function getReferencedType(
  node: ts.TypeReferenceNode,
  typeChecker: ts.TypeChecker
) {
  let symbol = typeChecker.getSymbolAtLocation(node.typeName);

  if (
    symbol &&
    (symbol.flags & ts.SymbolFlags.Alias) === ts.SymbolFlags.Alias
  ) {
    // follow alias if it is a symbol
    symbol = typeChecker.getAliasedSymbol(symbol);
  }

  const varDecl = symbol?.declarations?.[0];
  if (
    varDecl &&
    (ts.isInterfaceDeclaration(varDecl) || ts.isTypeAliasDeclaration(varDecl))
  ) {
    return { declaration: varDecl, exported: isNodeExported(varDecl) };
  }
}

/**
 * Returns list of string literals from potential union of strings
 */
export function getStringLiteralsFromUnion(node: ts.Node): Set<string> {
  if (ts.isUnionTypeNode(node)) {
    return new Set(
      node.types.map((type) => {
        if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
          return type.literal.text;
        }

        return '';
      })
    );
  }

  if (ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal)) {
    return new Set([node.literal.text]);
  }

  return new Set();
}

/**
 * Converts a format string into a regex that can be used to validate a given string matches the template
 */
export function buildTemplateRegex(
  node: ts.TemplateLiteralTypeNode,
  typeChecker: ts.TypeChecker
): string {
  let regex = node.head.text;
  node.templateSpans.forEach((span) => {
    // process template tag
    let type = span.type.kind;
    if (ts.isTypeReferenceNode(span.type)) {
      let symbol = typeChecker.getSymbolAtLocation(
        span.type.typeName
      ) as ts.Symbol;

      if (
        symbol &&
        (symbol.flags & ts.SymbolFlags.Alias) === ts.SymbolFlags.Alias
      ) {
        // follow alias if it is a symbol
        symbol = typeChecker.getAliasedSymbol(symbol);
      }

      type = (symbol?.declarations?.[0] as ts.TypeAliasDeclaration).type.kind;
    }

    if (type === ts.SyntaxKind.StringKeyword) {
      regex += '.*';
    } else if (type === ts.SyntaxKind.NumberKeyword) {
      regex += '[0-9]*';
    } else if (type === ts.SyntaxKind.BooleanKeyword) {
      regex += 'true|false';
    }

    // add non-tag element
    regex += span.literal.text;
  });
  return regex;
}

/**
 * Walks generics to fill in values from a combination of the default, constraint, and passed in map values
 * TODO convert this to use simpleTransformGenerator
 */
export function fillInGenerics(
  xlrNode: NodeType,
  generics?: Map<string, NodeType>
): NodeType {
  // Need to make sure not to set generics in passed in map to avoid using generics outside of tree
  let localGenerics: Map<string, NodeType>;

  if (generics) {
    localGenerics = new Map(generics);
  } else {
    localGenerics = new Map();
    if (isGenericNodeType(xlrNode)) {
      xlrNode.genericTokens?.forEach((token) => {
        localGenerics.set(
          token.symbol,
          (token.default ?? token.constraints) as NodeType
        );
      });
    }
  }

  if (xlrNode.type === 'ref') {
    if (localGenerics.has(xlrNode.ref)) {
      return {
        ...(localGenerics.get(xlrNode.ref) as NodeType),
        ...(xlrNode.genericArguments
          ? {
              genericArguments: xlrNode.genericArguments.map((ga) =>
                fillInGenerics(ga, localGenerics)
              ),
            }
          : {}),
        ...(xlrNode.title ? { title: xlrNode.title } : {}),
        ...(xlrNode.name ? { name: xlrNode.name } : {}),
        ...(xlrNode.description ? { description: xlrNode.description } : {}),
        ...(xlrNode.comment ? { comment: xlrNode.comment } : {}),
      };
    }

    return {
      ...xlrNode,
      ...(xlrNode.genericArguments
        ? {
            genericArguments: xlrNode.genericArguments.map((ga) =>
              fillInGenerics(ga, localGenerics)
            ),
          }
        : {}),
    };
  }

  if (xlrNode.type === 'object') {
    const newProperties: { [name: string]: ObjectProperty } = {};
    Object.getOwnPropertyNames(xlrNode.properties).forEach((propName) => {
      const prop = xlrNode.properties[propName];
      newProperties[propName] = {
        required: prop.required,
        node: fillInGenerics(prop.node, localGenerics),
      };
    });

    return {
      ...xlrNode,
      properties: newProperties,
    };
  }

  if (xlrNode.type === 'array') {
    // eslint-disable-next-line no-param-reassign
    xlrNode.elementType = fillInGenerics(xlrNode.elementType, localGenerics);
  } else if (xlrNode.type === 'or' || xlrNode.type === 'and') {
    let pointer;
    if (xlrNode.type === 'or') {
      pointer = xlrNode.or;
    } else {
      pointer = xlrNode.and;
    }

    return {
      ...xlrNode,
      [xlrNode.type]: pointer.map((prop) => {
        return fillInGenerics(prop, localGenerics);
      }),
    };
  } else if (xlrNode.type === 'record') {
    return {
      ...xlrNode,
      keyType: fillInGenerics(xlrNode.keyType, localGenerics),
      valueType: fillInGenerics(xlrNode.valueType, localGenerics),
    };
  } else if (xlrNode.type === 'conditional') {
    const filledInConditional = {
      ...xlrNode,
      check: {
        left: fillInGenerics(xlrNode.check.left, localGenerics),
        right: fillInGenerics(xlrNode.check.right, localGenerics),
      },
      value: {
        true: fillInGenerics(xlrNode.value.true, localGenerics),
        false: fillInGenerics(xlrNode.value.false, localGenerics),
      },
    };

    // Check to see if we have enough information to resolve this conditional
    if (
      filledInConditional.check.left.type !== 'ref' &&
      filledInConditional.check.right.type !== 'ref'
    ) {
      return {
        name: xlrNode.name,
        title: xlrNode.title,
        ...resolveConditional(filledInConditional),
      } as NamedType;
    }

    return filledInConditional;
  }

  return xlrNode;
}

/** Applies the TS `Pick` type to an interface/union/intersection */
export function applyPickOrOmitToNodeType(
  baseObject: NodeType,
  operation: 'Pick' | 'Omit',
  properties: Set<string>
): NodeType | undefined {
  if (baseObject.type === 'object') {
    const newObject = { ...baseObject };
    Object.keys(baseObject.properties).forEach((key) => {
      if (
        (operation === 'Omit' && properties.has(key)) ||
        (operation === 'Pick' && !properties.has(key))
      ) {
        delete newObject.properties[key];
      }
    });

    /**
     * Filter out objects in cases:
     * - A Pick operation and there are no properties left
     * - An Omit operation and there are no properties left and no additional properties allowed
     */
    if (
      Object.keys(newObject.properties).length === 0 &&
      (operation !== 'Omit' || newObject.additionalProperties === false)
    ) {
      return undefined;
    }

    return newObject;
  }

  let pointer;
  if (baseObject.type === 'and') {
    pointer = baseObject.and;
  } else if (baseObject.type === 'or') {
    pointer = baseObject.or;
  } else {
    throw new Error(
      `Error: Can not apply ${operation} to type ${baseObject.type}`
    );
  }

  const pickedTypes = pointer
    .map((type) => {
      const node = applyPickOrOmitToNodeType(type, operation, properties);
      if (node === undefined) {
        return undefined;
      }

      return { ...node, additionalProperties: false } as ObjectType;
    })
    .filter((type) => type !== undefined) as NodeType[];

  if (pickedTypes.length === 0) {
    return undefined;
  }

  if (pickedTypes.length === 1) {
    return pickedTypes[0];
  }

  if (baseObject.type === 'and') {
    return { ...baseObject, and: pickedTypes };
  }

  return { ...baseObject, or: pickedTypes };
}

/** Applies the TS `Omit` type to an interface/union/intersection */
export function applyPartialOrRequiredToNodeType(
  baseObject: NodeType,
  modifier: boolean
): NodeType {
  if (baseObject.type === 'object') {
    const newObject = { ...baseObject };
    Object.keys(baseObject.properties).forEach((key) => {
      newObject.properties[key].required = modifier;
    });

    return newObject;
  }

  if (baseObject.type === 'and') {
    const pickedTypes = baseObject.and.map((type) =>
      applyPartialOrRequiredToNodeType(type, modifier)
    );
    return { ...baseObject, and: pickedTypes };
  }

  if (baseObject.type === 'or') {
    const pickedTypes = baseObject.or.map((type) =>
      applyPartialOrRequiredToNodeType(type, modifier)
    );
    return { ...baseObject, or: pickedTypes };
  }

  throw new Error(
    `Error: Can not apply ${modifier ? 'Required' : 'Partial'} to type ${
      baseObject.type
    }`
  );
}

/** Applies the TS `Exclude` type to a union */
export function applyExcludeToNodeType(
  baseObject: OrType,
  filters: NodeType | OrType
): NodeType {
  const remainingMembers = baseObject.or.filter((type) => {
    if (filters.type === 'or') {
      return !filters.or.some((filter) => !computeExtends(type, filter));
    }

    return !computeExtends(type, filters);
  });

  if (remainingMembers.length === 1) {
    return remainingMembers[0];
  }

  return {
    ...baseObject,
    or: remainingMembers,
  };
}
