/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import type { Node } from 'jsonc-parser';
import type {
  ConditionalType,
  NodeType,
  ObjectType,
  RefNode,
} from '@player-tools/xlr';
import { isGenericNodeType, isPrimitiveTypeNode } from './type-checks';
import { fillInGenerics } from './ts-helpers';

export interface PropertyNode {
  /** Equivalent Property Name */
  key: string;

  /** Equivalent Property Value */
  value: Node;
}

/**
 * Takes a property node and returns the underlying Key/Value Pairs
 */
export function propertyToTuple(node: Node): PropertyNode {
  let key = node.children?.[0].value as string;
  if (key.includes('-')) {
    key = `'${key}'`;
  }

  return {
    key,
    value: node.children?.[1] as Node,
  };
}

/**
 * Turns a node's children into a map for easy access
 */
export function makePropertyMap(node: Node): Map<string, Node> {
  const m = new Map();
  node.children?.forEach((child) => {
    const property = propertyToTuple(child);
    m.set(property.key, property.value);
  });
  return m;
}

/**
 * Checks if property is a leaf node or another node
 */
export function isNode(obj: Node | string | number | boolean): obj is Node {
  return (
    typeof obj !== 'string' ||
    typeof obj !== 'number' ||
    typeof obj !== 'boolean'
  );
}

/**
 * Computes if the first arg extends the second arg
 */
export function computeExtends(a: NodeType, b: NodeType): boolean {
  // special case for any/unknown being functionally the same
  if (
    (a.type === 'any' || a.type === 'unknown') &&
    (b.type === 'any' || b.type === 'unknown')
  ) {
    return true;
  }

  // special case for null/undefined being functionally the same
  if (
    (a.type === 'null' || a.type === 'undefined') &&
    (b.type === 'null' || b.type === 'undefined')
  ) {
    return true;
  }

  // check simple case of equal types
  if (a.type === b.type) {
    if (isPrimitiveTypeNode(a) && isPrimitiveTypeNode(b)) {
      if (a.const && b.const) {
        if (a.const === b.const) {
          return true;
        }
      } else {
        return true;
      }
    }

    if (a.type === 'ref' && b.type === 'ref') {
      return a.ref === b.ref;
    }

    if (a.type === 'object' && b.type === 'object') {
      for (const property in b.properties) {
        const propertyNode = b.properties[property];
        if (
          !a.properties[property] ||
          !computeExtends(a.properties[property].node, propertyNode.node)
        ) {
          return false;
        }
      }

      return true;
    }
  }

  if (isPrimitiveTypeNode(a) && b.type === 'or') {
    return b.or.every((member) => computeExtends(a, member));
  }

  if (isPrimitiveTypeNode(b) && a.type === 'or') {
    return a.or.every((member) => computeExtends(b, member));
  }

  if (a.type === 'or' && b.type === 'or') {
    return a.or.every((x) => b.or.some((y) => computeExtends(x, y)));
  }

  return false;
}

/**
 * Attempts to resolve a conditional type
 */
export function resolveConditional(conditional: ConditionalType): NodeType {
  const { left, right } = conditional.check;
  if (isPrimitiveTypeNode(left) && isPrimitiveTypeNode(right)) {
    const conditionalResult = conditional.value.false;

    // Compose first level generics here since `conditionalResult` won't have them
    if (isGenericNodeType(conditional)) {
      const genericMap: Map<string, NodeType> = new Map();
      conditional.genericTokens.forEach((token) => {
        genericMap.set(
          token.symbol,
          token.default ?? token.constraints ?? { type: 'any' }
        );
      });

      return fillInGenerics(conditionalResult, genericMap);
    }

    return conditionalResult;
  }

  // unable to process return original
  return conditional;
}

/**
 *
 */
export function resolveReferenceNode(
  genericReference: RefNode,
  typeToFill: NodeType
): NodeType {
  const genericArgs = genericReference.genericArguments;
  const genericMap: Map<string, NodeType> = new Map();

  // Compose first level generics here from `genericReference`
  if (genericArgs && isGenericNodeType(typeToFill)) {
    typeToFill.genericTokens.forEach((token, index) => {
      genericMap.set(
        token.symbol,
        genericArgs[index] ?? token.default ?? token.constraints
      );
    });
  }

  // Fill in generics
  const filledInNode = fillInGenerics(typeToFill, genericMap);

  // Remove generic tokens that were resolve
  if (isGenericNodeType(filledInNode) && genericArgs?.length) {
    if (genericArgs.length < filledInNode.genericTokens.length) {
      filledInNode.genericTokens = filledInNode.genericTokens.slice(
        genericArgs?.length
      );
    } else if (genericArgs.length === filledInNode.genericTokens.length) {
      filledInNode.genericTokens = [];
    }
  }

  // Resolve index access
  if (genericReference.property && filledInNode.type === 'object') {
    return (
      filledInNode.properties[genericReference.property]?.node ??
      filledInNode.additionalProperties ?? { type: 'undefined' }
    );
  }

  return filledInNode;
}

/**
 * Combines two ObjectType objects to get a representation of the effective TypeScript interface of `base` extending `operand`
 - * @param base The base interface
 - * @param operand The interface that is extended
 - * @param errorOnOverlap whether or not conflicting properties should throw an error or use the property from operand
 - * @returns `ObjectType`
 */
export function computeEffectiveObject(
  base: ObjectType,
  operand: ObjectType,
  errorOnOverlap = true
): ObjectType {
  const baseObjectName = base.name ?? base.title ?? 'object literal';
  const operandObjectName = operand.name ?? operand.title ?? 'object literal';
  const newObject = {
    ...JSON.parse(JSON.stringify(base)),
    name: `${baseObjectName} & ${operandObjectName}`,
    description: `Effective type combining ${baseObjectName} and ${operandObjectName}`,
    genericTokens: [
      ...(isGenericNodeType(base) ? base.genericTokens : []),
      ...(isGenericNodeType(operand) ? operand.genericTokens : []),
    ],
  };
  // TODO this check needs to account for primitive -> primitive generic overlap

  for (const property in operand.properties) {
    if (newObject.properties[property] !== undefined && errorOnOverlap) {
      if (
        !computeExtends(
          newObject.properties[property].node,
          operand.properties[property].node,
        )
      ) {
        throw new Error(
          `Can't compute effective type for ${baseObjectName} and ${operandObjectName} because of conflicting properties ${property}`
        );
      }
    }

    newObject.properties[property] = operand.properties[property];
  }

  if (newObject.additionalProperties && operand.additionalProperties) {
    if (
      !isPrimitiveTypeNode(newObject.additionalProperties) ||
      !isPrimitiveTypeNode(operand.additionalProperties) ||
      newObject.additionalProperties.type !== operand.additionalProperties.type
    ) {
      newObject.additionalProperties = {
        type: 'and',
        and: [newObject.additionalProperties, operand.additionalProperties],
      };
    }
  } else if (operand.additionalProperties) {
    newObject.additionalProperties = operand.additionalProperties;
  }

  return newObject;
}
