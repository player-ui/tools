import { test, expect, describe, beforeEach } from 'vitest';
import type { NamedTypeWithGenerics, ObjectType } from '@player-tools/xlr';
import {
  applyCommonProps,
  applyAssetWrapperOrSwitch,
  applyValueRefs,
  applyTemplateProperty,
} from '../index';

describe('Transform Tests', () => {
  let MockAsset: NamedTypeWithGenerics<ObjectType>;

  beforeEach(() => {
    MockAsset = {
      name: 'MockAsset',
      type: 'object',
      source: 'transform.test.ts',
      properties: {
        id: {
          required: true,
          node: {
            type: 'string',
            title: 'Asset.id',
            description: 'Each asset requires a unique id per view',
          },
        },
        type: {
          required: true,
          node: {
            type: 'string',
            const: 'mock',
            title: 'Asset.type',
            description:
              'The asset type determines the semantics of how a user interacts with a page',
          },
        },
        value: {
          required: false,
          node: {
            type: 'string',
            title: 'MockAsset.value',
            description:
              'The transition value of the action in the state machine',
          },
        },
        primaryChild: {
          required: true,
          node: {
            type: 'ref',
            ref: 'AssetWrapper<AnyAsset>',
            genericArguments: [
              {
                type: 'ref',
                ref: 'AnyAsset',
              },
            ],
            title: 'ActionAsset.label',
            description: "A text-like asset for the action's label",
          },
        },
        secondaryChildren: {
          required: false,
          node: {
            type: 'array',
            elementType: {
              type: 'ref',
              ref: 'Asset',
            },
          },
        },
      },
      additionalProperties: {
        type: 'unknown',
      },
      title: 'MockAsset',
      description: 'Mock Asset for test',
      genericTokens: [
        {
          symbol: 'AnyAsset',
          constraints: {
            type: 'ref',
            ref: 'Asset',
          },
          default: {
            type: 'ref',
            ref: 'Asset',
          },
        },
      ],
    };
  });

  test('CommonProps Transform', () => {
    expect(applyCommonProps(MockAsset, 'Assets')).toMatchSnapshot();
  });

  test('AssetWrapperOrSwitch Transform', () => {
    expect(applyAssetWrapperOrSwitch(MockAsset, 'Assets')).toMatchSnapshot();
  });

  test('applyValueRefs Transform', () => {
    expect(applyValueRefs(MockAsset, 'Assets')).toMatchSnapshot();
  });

  test('applyTemplateProperty Transform', () => {
    expect(applyTemplateProperty(MockAsset, 'Assets')).toMatchSnapshot();
  });
});
