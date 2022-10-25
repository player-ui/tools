/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import type {
  NamedType,
  NodeTypeStrings,
  NodeTypeMap,
  TransformFunction,
} from '@player-tools/xlr';

/**
 * Helper function for simple transforms
 * Walks an XLR tree looking for the specified node type calls the supplied function when called
 */
export function simpleTransformGenerator<
  T extends NodeTypeStrings = NodeTypeStrings
>(
  typeToTransform: T,
  capabilityToTransform: string,
  functionToRun: (input: NodeTypeMap[T]) => void
): TransformFunction {
  /** walker for an XLR tree to touch every node */
  const walker: TransformFunction = (node: NamedType, capability: string) => {
    // Run transform on base node before running on children
    if (capability === capabilityToTransform) {
      if (node.type === typeToTransform) {
        functionToRun(node as unknown as NodeTypeMap[T]);
      }

      if (node.type === 'object') {
        if (node.extends) {
          walker(node, capability);
        }

        for (const key in node.properties) {
          const value = node.properties[key];
          walker(value.node as NamedType, capability);
        }

        if (node.additionalProperties) {
          walker(node.additionalProperties as NamedType, capability);
        }
      } else if (node.type === 'array') {
        walker(node.elementType as NamedType, capability);
      } else if (node.type === 'and') {
        node.and.forEach((element) => walker(element as NamedType, capability));
      } else if (node.type === 'or') {
        node.or.forEach((element) => walker(element as NamedType, capability));
      } else if (node.type === 'ref') {
        node.genericArguments?.forEach((element) =>
          walker(element as NamedType, capability)
        );
      } else if (node.type === 'tuple') {
        if (node.additionalItems) {
          walker(node.additionalItems as NamedType, capability);
        }

        node.elementTypes.forEach((element) =>
          walker(element as NamedType, capability)
        );
      } else if (node.type === 'function') {
        node.parameters.forEach((param) => {
          walker(param.type as NamedType, capability);
          if (param.default) {
            walker(param.default as NamedType, capability);
          }
        });
        if (node.returnType) {
          walker(node.returnType as NamedType, capability);
        }
      } else if (node.type === 'record') {
        walker(node.keyType as NamedType, capability);
        walker(node.valueType as NamedType, capability);
      } else if (node.type === 'conditional') {
        walker(node.check.left as NamedType, capability);
        walker(node.check.right as NamedType, capability);
        walker(node.value.true as NamedType, capability);
        walker(node.value.false as NamedType, capability);
      }
    }
  };

  return walker;
}
