/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
import type {
  NamedType,
  NodeTypeStrings,
  NodeTypeMap,
  TransformFunction,
  NodeType,
  ObjectProperty,
  RefNode,
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
  functionToRun: (input: NodeTypeMap[T]) => NodeTypeMap[T]
): TransformFunction {
  /** walker for an XLR tree to touch every node */
  const walker: TransformFunction = (
    n: NamedType | NodeType,
    capability: string
  ) => {
    // Run transform on base node before running on children
    if (capability === capabilityToTransform) {
      const node = { ...n };
      if (node.type === typeToTransform) {
        return functionToRun(node as unknown as NodeTypeMap[T]);
      }

      if (node.type === 'object') {
        const newObjectProperties: Record<string, ObjectProperty> = {};

        for (const key in node.properties) {
          const value = node.properties[key];
          newObjectProperties[key] = {
            required: value.required,
            node: walker(value.node, capability),
          };
        }

        return {
          ...node,
          properties: { ...newObjectProperties },
          extends: node.extends
            ? (walker(node.extends, capability) as RefNode)
            : undefined,
          additionalProperties: node.additionalProperties
            ? walker(node.additionalProperties, capability)
            : false,
        };
      }

      if (node.type === 'array') {
        return {
          ...node,
          elementType: walker(node.elementType, capability),
        };
      }

      if (node.type === 'and') {
        return {
          ...node,
          and: node.and.map((element) => walker(element, capability)),
        };
      }

      if (node.type === 'or') {
        return {
          ...node,
          or: node.or.map((element) => walker(element, capability)),
        };
      }

      if (node.type === 'ref') {
        return {
          ...node,
          genericArguments: node.genericArguments?.map((arg) =>
            walker(arg, capability)
          ),
        };
      }

      if (node.type === 'tuple') {
        return {
          ...node,
          elementTypes: node.elementTypes.map((type) =>
            walker(type, capability)
          ),
          additionalItems: node.additionalItems
            ? walker(node.additionalItems, capability)
            : false,
        };
      }

      if (node.type === 'function') {
        return {
          ...node,
          parameters: node.parameters.map((param) => {
            return {
              ...param,
              type: walker(param.type, capability),
              default: param.default
                ? walker(param.default, capability)
                : undefined,
            };
          }),
          returnType: node.returnType
            ? walker(node.returnType, capability)
            : undefined,
        };
      }

      if (node.type === 'record') {
        return {
          ...node,
          keyType: walker(node.keyType, capability),
          valueType: walker(node.valueType, capability),
        };
      }

      if (node.type === 'conditional') {
        return {
          ...node,
          check: {
            left: walker(node.check.left, capability),
            right: walker(node.check.left, capability),
          },
          value: {
            true: walker(node.value.true, capability),
            false: walker(node.value.false, capability),
          },
        };
      }
    }

    return n;
  };

  return walker;
}
