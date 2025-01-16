/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */

import type {
  ArrayType,
  NamedType,
  NodeType,
  OrType,
  RefType,
  TransformFunction,
} from "@player-tools/xlr";
import { simpleTransformGenerator } from "@player-tools/xlr-sdk";
import { isPrimitiveTypeNode } from "@player-tools/xlr-utils";

/**
 * Adds applicability and _comment properties to Assets
 */

export const applyCommonProps: TransformFunction = (node, capability) => {
  return simpleTransformGenerator("object", ["Assets", "Views"], (xlrNode) => {
    if (!xlrNode.properties.applicability) {
      // eslint-disable-next-line no-param-reassign
      xlrNode.properties.applicability = {
        required: false,
        node: {
          type: "or",
          name: "Applicability",
          description:
            "Evaluate the given expression (or boolean) and if falsy, remove this node from the tree. This is re-computed for each change in the data-model",
          or: [
            {
              type: "boolean",
            },
            {
              type: "ref",
              ref: "Expression",
            },
          ],
        },
      };
    }

    if (!xlrNode.properties._comment) {
      // eslint-disable-next-line no-param-reassign
      xlrNode.properties._comment = {
        required: false,
        node: {
          description: "Adds a comment for the given node",
          type: "string",
        },
      };
    }

    return xlrNode;
  })(node, capability);
};

/**
 * Replaces AssetWrapper References with AssetWrapperOrSwitch
 */
export const applyAssetWrapperOrSwitch: TransformFunction = (
  node,
  capability
) => {
  return simpleTransformGenerator("ref", ["Assets", "Views"], (xlrNode) => {
    if (xlrNode.ref.includes("AssetWrapper")) {
      return {
        ...xlrNode,
        ref: xlrNode.ref.replace("AssetWrapper", "AssetWrapperOrSwitch"),
      };
    }

    return xlrNode;
  })(node, capability);
};

/**
 * Modifies any primitive type property node (except id/type) to be Bindings or Expressions
 */
export const applyValueRefs: TransformFunction = (node, capability) => {
  return simpleTransformGenerator(
    "object",
    ["Assets", "Views"],
    (inputNode) => {
      const xlrNode = { ...inputNode };
      for (const key in xlrNode.properties) {
        if (key === "id") {
          continue;
        }

        const value = xlrNode.properties[key];
        if (value.node.type === "or") {
          value.node.or.push({
            type: "ref",
            ref: "ExpressionRef",
          });
          value.node.or.push({
            type: "ref",
            ref: "BindingRef",
          });
        } else if (isPrimitiveTypeNode(value.node)) {
          const newUnionType: OrType = {
            type: "or",
            description: value.node.description,
            or: [
              value.node,
              {
                type: "ref",
                ref: "ExpressionRef",
              },
              {
                type: "ref",
                ref: "BindingRef",
              },
            ],
          };
          value.node = newUnionType;
        }
      }

      return xlrNode;
    }
  )(node, capability);
};

/**
 * Computes possible template keys and adds them to an Asset
 */
export const applyTemplateProperty: TransformFunction = (node, capability) => {
  return simpleTransformGenerator(
    "object",
    ["Assets", "Views"],
    (inputNode) => {
      const templateTypes: Array<RefType> = [];
      const xlrNode = { ...inputNode };
      for (const key in xlrNode.properties) {
        const value = xlrNode.properties[key];
        if (value.node.type === "array") {
          value.required = false;
          templateTypes.push({
            type: "ref",
            ref: `Template<${
              value.node.elementType.type === "ref"
                ? value.node.elementType.ref
                : value.node.elementType.name
            }, "${key}">`,
            genericArguments: [
              value.node.elementType,
              {
                type: "string",
                const: key,
              },
            ],
          });
        }
      }

      if (templateTypes.length > 0) {
        const templateType: ArrayType = {
          type: "array",
          elementType:
            templateTypes.length > 1
              ? { type: "or", or: templateTypes }
              : templateTypes[0],
          description: "A list of templates to process for this node",
        };
        xlrNode.properties.template = {
          required: false,
          node: templateType,
        };
      }

      return xlrNode;
    }
  )(node, capability);
};
