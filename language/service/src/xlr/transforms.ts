/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
import type {
  ArrayType,
  NamedType,
  ObjectType,
  OrType,
  RefType,
  TransformFunction,
} from '@player-tools/xlr';
import { simpleTransformGenerator } from '@player-tools/xlr-sdk';
import { isPrimitiveTypeNode } from '@player-tools/xlr-utils';

/**
 *
 */
export const applyCommonProps: TransformFunction = (
  node: NamedType,
  capability: string
) => {
  if (capability === 'Assets') {
    if (node.type === 'object' && !node.properties.applicability) {
      node.properties.applicability = {
        required: false,
        node: {
          type: 'or',
          name: 'Applicability',
          description:
            'Evaluate the given expression (or boolean) and if falsy, remove this node from the tree. This is re-computed for each change in the data-model',
          or: [
            {
              type: 'boolean',
            },
            {
              type: 'ref',
              ref: 'Expression',
            },
          ],
        },
      };
    }
  }

  if (node.type === 'object' && !node.properties._comment) {
    node.properties._comment = {
      required: false,
      node: {
        description: 'Adds a comment for the given node',
        type: 'string',
      },
    };
  }
};

/**
 *
 */
export const applyAssetWrapperOrSwitch: TransformFunction = (
  node: NamedType,
  capability: string
) => {
  simpleTransformGenerator('ref', 'Assets', (xlrNode) => {
    if (xlrNode.ref.includes('AssetWrapper')) {
      xlrNode.ref = xlrNode.ref.replace('AssetWrapper', 'AssetWrapperOrSwitch');
    }
  })(node, capability);
};

/**
 *
 */
export const applyValueRefs: TransformFunction = (
  node: NamedType,
  capability: string
) => {
  if (capability === 'Assets' && node.type === 'object') {
    for (const key in node.properties) {
      if (key === 'id' || key === 'type') {
        continue;
      }

      const value = node.properties[key];
      if (value.node.type === 'or') {
        value.node.or.push({
          type: 'ref',
          ref: 'ExpressionRef',
        });
        value.node.or.push({
          type: 'ref',
          ref: 'BindingRef',
        });
      } else if (isPrimitiveTypeNode(value.node)) {
        const newUnionType: OrType = {
          type: 'or',
          description: value.node.description,
          or: [
            value.node,
            {
              type: 'ref',
              ref: 'ExpressionRef',
            },
            {
              type: 'ref',
              ref: 'BindingRef',
            },
          ],
        };
        value.node = newUnionType;
      } else if (value.node.type === 'object') {
        applyValueRefs(value.node as NamedType<ObjectType>, capability);
      }
    }
  }
};

/**
 *
 */
export const applyTemplateProperty: TransformFunction = (
  node: NamedType,
  capability: string
) => {
  if (capability === 'Assets' && node.type === 'object') {
    const templateTypes: Array<RefType> = [];

    /** walks the asset to find arrays that could be possible templates */
    const assetWalker = (
      rootNode: NamedType<ObjectType>,
      collector: Array<RefType>
    ) => {
      for (const key in rootNode.properties) {
        const value = rootNode.properties[key];
        if (value.node.type === 'array') {
          value.required = false;
          collector.push({
            type: 'ref',
            ref: `Template<${
              value.node.elementType.type === 'ref'
                ? value.node.elementType.ref
                : value.node.elementType.name
            }, "${key}">`,
          });
        }

        if (value.node.type === 'object') {
          assetWalker(value.node as NamedType<ObjectType>, collector);
        }
      }
    };

    assetWalker(node, templateTypes);

    if (templateTypes.length > 0) {
      const templateType: ArrayType = {
        type: 'array',
        elementType:
          templateTypes.length > 1
            ? { type: 'or', or: templateTypes }
            : templateTypes[0],
        description: 'A list of templates to process for this node',
      };
      node.properties.template = {
        required: false,
        node: templateType,
      };
    }
  }
};
