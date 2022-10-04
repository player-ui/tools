import type { Node } from 'jsonc-parser';
import type { ConditionalType, NodeType } from '@player-tools/xlr';
import { isPrimitiveTypeNode } from './type-checks';

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
