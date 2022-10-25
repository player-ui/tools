/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import type {
  NamedType,
  NodeTypeStrings,
  NodeTypeMap,
  TransformFunction,
  NodeType,
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
  functionToRun: (input: NodeTypeMap[T]) => void,
  recursive = true
): TransformFunction {
  /** walker for an XLR tree to touch every node */
  const walker: TransformFunction = (
    node: NamedType | NodeType,
    capability: string
  ) => {
    // Run transform on base node before running on children
    if (capability === capabilityToTransform) {
      if (node.type === typeToTransform) {
        functionToRun(node as unknown as NodeTypeMap[T]);
      }

      if (!recursive) {
        return;
      }

      if (node.type === 'object') {
        if (node.extends) {
          walker(node, capability);
        }

        for (const key in node.properties) {
          const value = node.properties[key];
          walker(value.node, capability);
        }

        if (node.additionalProperties) {
          walker(node.additionalProperties, capability);
        }
      } else if (node.type === 'array') {
        walker(node.elementType, capability);
      } else if (node.type === 'and') {
        node.and.forEach((element) => walker(element, capability));
      } else if (node.type === 'or') {
        node.or.forEach((element) => walker(element, capability));
      } else if (node.type === 'ref') {
        node.genericArguments?.forEach((element) =>
          walker(element, capability)
        );
      } else if (node.type === 'tuple') {
        if (node.additionalItems) {
          walker(node.additionalItems, capability);
        }

        node.elementTypes.forEach((element) => walker(element, capability));
      } else if (node.type === 'function') {
        node.parameters.forEach((param) => {
          walker(param.type, capability);
          if (param.default) {
            walker(param.default, capability);
          }
        });
        if (node.returnType) {
          walker(node.returnType, capability);
        }
      } else if (node.type === 'record') {
        walker(node.keyType, capability);
        walker(node.valueType, capability);
      } else if (node.type === 'conditional') {
        walker(node.check.left, capability);
        walker(node.check.right, capability);
        walker(node.value.true, capability);
        walker(node.value.false, capability);
      }
    }
  };

  return walker;
}
