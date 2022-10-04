import type { NamedType } from '@player-tools/xlr';
import ts from 'typescript';
import { TSWriter } from '../xlr-to-ts';

describe('Type Exports', () => {
  it('Basic Type Conversion', () => {
    const xlr = {
      name: 'ActionAsset',
      source: 'ActionAsset.ts',
      type: 'object',
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
            const: 'action',
            title:
              'The asset type determines the semantics of how a user interacts with a page',
          },
        },
        value: {
          required: false,
          node: {
            type: 'string',
            title: 'ActionAsset.value',
            description:
              'The transition value of the action in the state machine',
          },
        },
        label: {
          required: false,
          node: {
            type: 'ref',
            ref: 'AssetWrapper<AnyTextAsset>',
            title: 'ActionAsset.label',
            description: "A text-like asset for the action's label",
          },
        },
        exp: {
          required: false,
          node: {
            type: 'ref',
            ref: 'Expression',
            title: 'ActionAsset.exp',
            description:
              'An optional expression to execute before transitioning',
          },
        },
        accessibility: {
          required: false,
          node: {
            type: 'string',
            title: 'ActionAsset.accessibility',
            description:
              'An optional string that describes the action for screen-readers',
          },
        },
        metaData: {
          required: false,
          node: {
            type: 'object',
            properties: {
              beacon: {
                required: false,
                node: {
                  name: 'BeaconDataType',
                  type: 'or',
                  or: [
                    {
                      type: 'string',
                      title: 'BeaconDataType',
                    },
                    {
                      type: 'record',
                      keyType: {
                        type: 'string',
                      },
                      valueType: {
                        type: 'any',
                      },
                      title: 'BeaconDataType',
                    },
                  ],
                  title: 'ActionAsset.metaData.beacon',
                  description: 'Additional data to beacon',
                },
              },
              skipValidation: {
                required: false,
                node: {
                  type: 'boolean',
                  title: 'ActionAsset.metaData.skipValidation',
                  description:
                    'Force transition to the next view without checking for validation',
                },
              },
            },
            additionalProperties: false,
            title: 'ActionAsset.metaData',
            description:
              'Additional optional data to assist with the action interactions on the page',
          },
        },
      },
      additionalProperties: false,
      title: 'ActionAsset',
      description:
        'User actions can be represented in several places.\nEach view typically has one or more actions that allow the user to navigate away from that view.\nIn addition, several asset types can have actions that apply to that asset only.',
      genericTokens: [
        {
          symbol: 'AnyTextAsset',
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
    } as NamedType;

    const converter = new TSWriter(ts.factory);

    const { type: tsNode, referencedTypes: referencedImports } =
      converter.convertNamedType(xlr);

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const resultFile = ts.createSourceFile(
      'output.d.ts',
      '',
      ts.ScriptTarget.ES2017,
      false, // setParentNodes
      ts.ScriptKind.TS
    );

    const nodeText = printer.printNode(
      ts.EmitHint.Unspecified,
      tsNode,
      resultFile
    );

    expect(nodeText).toMatchSnapshot();
    expect(referencedImports).toMatchInlineSnapshot(`
      Set {
        "AssetWrapper",
        "Expression",
        "Asset",
      }
    `);
  });
});
