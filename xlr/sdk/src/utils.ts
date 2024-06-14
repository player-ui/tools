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
} from "@player-tools/xlr";
import { isGenericNamedType } from "@player-tools/xlr-utils";

type TypedTransformFunction<T extends NodeTypeStrings = NodeTypeStrings> = (
  input: NodeTypeMap[T]
) => NodeTypeMap[T];

export type TransformFunctionMap = {
  [nodeType in NodeTypeStrings]?: Array<TypedTransformFunction<nodeType>>;
};

const isMatchingCapability = (
  capability: string,
  capabilitiesToMatch: string | Array<string>
): boolean => {
  if (Array.isArray(capabilitiesToMatch)) {
    return capabilitiesToMatch.includes(capability);
  }

  return capability === capabilitiesToMatch;
};

export function xlrTransformWalker(
  transformMap: TransformFunctionMap
): (node: NodeType) => NodeType {
  const walker = (n: NamedType | NodeType): NodeType => {
    let node = { ...n };
    const transformFunctions = transformMap[node.type] as unknown as Array<
      TypedTransformFunction<typeof node.type>
    >;

    for (const transformFn of transformFunctions ?? []) {
      node = transformFn(node);
    }

    if (node.type === "object") {
      const newObjectProperties: Record<string, ObjectProperty> = {};

      for (const key in node.properties) {
        const value = node.properties[key];
        newObjectProperties[key] = {
          required: value.required,
          node: walker(value.node),
        };
      }

      // need to walk generic tokens
      return {
        ...node,
        properties: { ...newObjectProperties },
        ...(isGenericNamedType(node)
          ? {
              genericTokens: node.genericTokens.map((token) => {
                return {
                  ...token,
                  constraints: token.constraints
                    ? walker(token.constraints)
                    : undefined,
                  default: token.default ? walker(token.default) : undefined,
                };
              }),
            }
          : {}),
        extends: node.extends ? (walker(node.extends) as RefNode) : undefined,
        additionalProperties: node.additionalProperties
          ? walker(node.additionalProperties)
          : false,
      };
    }

    if (node.type === "array") {
      return {
        ...node,
        elementType: walker(node.elementType),
      };
    }

    if (node.type === "and") {
      return {
        ...node,
        and: node.and.map((element) => walker(element)),
      };
    }

    if (node.type === "or") {
      return {
        ...node,
        or: node.or.map((element) => walker(element)),
      };
    }

    if (node.type === "ref") {
      return {
        ...node,
        ...(node.genericArguments
          ? {
              genericArguments: node.genericArguments?.map((arg) =>
                walker(arg)
              ),
            }
          : {}),
      };
    }

    if (node.type === "tuple") {
      return {
        ...node,
        elementTypes: node.elementTypes.map((element) => {
          return {
            name: element.name,
            type: walker(element.type),
            optional: element.optional,
          };
        }),
        additionalItems: node.additionalItems
          ? walker(node.additionalItems)
          : false,
      };
    }

    if (node.type === "function") {
      return {
        ...node,
        parameters: node.parameters.map((param) => {
          return {
            ...param,
            type: walker(param.type),
            default: param.default ? walker(param.default) : undefined,
          };
        }),
        returnType: node.returnType ? walker(node.returnType) : undefined,
      };
    }

    if (node.type === "record") {
      return {
        ...node,
        keyType: walker(node.keyType),
        valueType: walker(node.valueType),
      };
    }

    if (node.type === "conditional") {
      return {
        ...node,
        check: {
          left: walker(node.check.left),
          right: walker(node.check.left),
        },
        value: {
          true: walker(node.value.true),
          false: walker(node.value.false),
        },
      };
    }

    return node;
  };

  return walker;
}

/**
 * Helper function for simple transforms
 * Walks an XLR tree looking for the specified node type calls the supplied function when called
 */
export function simpleTransformGenerator<
  T extends NodeTypeStrings = NodeTypeStrings
>(
  typeToTransform: T,
  capabilityToTransform: string | Array<string>,
  functionToRun: TypedTransformFunction<T>
): TransformFunction {
  /** walker for an XLR tree to touch every node */
  return (n: NamedType | NodeType, capability: string) => {
    // Run transform on base node before running on children
    if (isMatchingCapability(capability, capabilityToTransform)) {
      return xlrTransformWalker({ [typeToTransform]: [functionToRun] })(n);
    }

    return n;
  };
}
