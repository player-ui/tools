import type { NamedType } from '@player-tools/xlr';
import ts from 'typescript';
import { TSWriter } from '../xlr-to-ts';

describe('Type Exports', () => {
  it('Basic Type Conversion', () => {
    const xlr = {
      name: 'ActionAsset',
      type: 'object',
      source: 'common-to-ts.test.ts',
      properties: {
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
            genericArguments: [
              {
                type: 'ref',
                ref: 'AnyTextAsset',
              },
            ],
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
                  source:
                    '/private/var/tmp/_bazel_kreddy8/6fc13ccb395252816f0c23d8394e8532/sandbox/darwin-sandbox/181/execroot/player/node_modules/@player-ui/beacon-plugin/dist/index.d.ts',
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
      extends: {
        type: 'ref',
        ref: "Asset<'action'>",
        genericArguments: [
          {
            type: 'string',
            const: 'action',
          },
        ],
      },
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
