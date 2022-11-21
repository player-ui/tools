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
 * Attempts to resolve a conditional type
 */
export function resolveConditional(conditional: ConditionalType): NodeType {
  const { left, right } = conditional.check;
  if (isPrimitiveTypeNode(left) && isPrimitiveTypeNode(right)) {
    if (left.const && right.const) {
      return left.const === right.const
        ? conditional.value.true
        : conditional.value.false;
    }

    // special case for any/unknown being functionally the same
    if (
      (left.type === 'any' || left.type === 'unknown') &&
      (right.type === 'any' || right.type === 'unknown')
    ) {
      return conditional.value.true;
    }

    // special case for null/undefined being functionally the same
    if (
      (left.type === 'null' || left.type === 'undefined') &&
      (right.type === 'null' || right.type === 'undefined')
    ) {
      return conditional.value.true;
    }

    if (left.type === right.type) {
      return conditional.value.true;
    }

    return conditional.value.false;
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

  // Compose first level generics here since `fillInGenerics` won't process them if a map is passed in
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
  if (genericReference.property && filledInNode.type === 'object') {
    return (
      filledInNode.properties[genericReference.property].node ??
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
  const baseObjectName = base.name ?? 'object literal';
  const operandObjectName = operand.name ?? 'object literal';
  const newObject = {
    ...base,
    name: `${baseObjectName} & ${operandObjectName}`,
    description: `Effective type combining ${baseObjectName} and ${operandObjectName}`,
  };

  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const property in operand.properties) {
    if (
      newObject.properties[property] !== undefined &&
      newObject.properties[property].node.type !==
        operand.properties[property].node.type &&
      errorOnOverlap
    ) {
      throw new Error(
        `Can't compute effective type for ${baseObjectName} and ${operandObjectName} because of conflicting properties ${property}`
      );
    }

    newObject.properties[property] = operand.properties[property];
  }

  if (newObject.additionalProperties && operand.additionalProperties) {
    newObject.additionalProperties = {
      type: 'and',
      and: [newObject.additionalProperties, operand.additionalProperties],
    };
  } else if (operand.additionalProperties) {
    newObject.additionalProperties = operand.additionalProperties;
  }

  return newObject;
}
