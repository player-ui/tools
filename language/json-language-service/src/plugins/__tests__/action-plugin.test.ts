import { TextDocument } from 'vscode-languageserver-textdocument';
import { PlayerLanguageService } from '../..';
import { toTextDocument } from '../../utils';

describe('action-plugin', () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypes([
      './common/static_xlrs/core',
      './common/static_xlrs/plugin',
    ]);
  });

  test('fixes old actions', async () => {
    let testDocument = toTextDocument(
      JSON.stringify(
        {
          id: 'foo',
          views: [
            {
              id: 'bar',
              type: 'collection',
              actions: [
                {
                  id: 'action-1',
                  value: 'Next',
                },
                {
                  value: 'other',
                  label: {
                    asset: {
                      id: 'other-label',
                      type: 'text',
                      value: 'Other',
                    },
                  },
                },
              ],
            },
          ],
        },
        null,
        2
      )
    );

    let diags = await service.validateTextDocument(testDocument);

    expect(diags).toHaveLength(4);
    expect(diags?.map((m) => m.message)).toMatchInlineSnapshot(`
      Array [
        "Content Validation Error - missing: Property 'navigation' missing from type 'Flow'",
        "View is not reachable",
        "Migrate to an action-asset",
        "Migrate to an action-asset",
      ]
    `);

    const actions = await service.getCodeActionsInRange(testDocument, {
      diagnostics: diags ?? [],
    });

    expect(actions).toHaveLength(2);

    const editActions = actions[0].edit?.changes?.[testDocument.uri];

    const appliedAction = TextDocument.applyEdits(
      testDocument,
      editActions ?? []
    );

    expect(appliedAction).toMatchInlineSnapshot(`
      "{
        \\"id\\": \\"foo\\",
        \\"views\\": [
          {
            \\"id\\": \\"bar\\",
            \\"type\\": \\"collection\\",
            \\"actions\\": [
              {
        \\"asset\\": {
          \\"type\\": \\"action\\",
          \\"id\\": \\"action-1\\",
          \\"value\\": \\"Next\\"
        }
      },
              {
                \\"value\\": \\"other\\",
                \\"label\\": {
                  \\"asset\\": {
                    \\"id\\": \\"other-label\\",
                    \\"type\\": \\"text\\",
                    \\"value\\": \\"Other\\"
                  }
                }
              }
            ]
          }
        ]
      }"
    `);

    testDocument = TextDocument.update(
      testDocument,
      [
        {
          text: appliedAction,
        },
      ],
      2
    );
    diags = await service.validateTextDocument(testDocument);

    const nextActions = await service.getCodeActionsInRange(testDocument, {
      diagnostics: diags ?? [],
    });

    expect(nextActions).toHaveLength(1);

    const nextAction = nextActions[0].edit?.changes?.[testDocument.uri];

    const nextAppliedAction = TextDocument.applyEdits(
      testDocument,
      nextAction ?? []
    );

    expect(nextAppliedAction).toMatchInlineSnapshot(`
      "{
        \\"id\\": \\"foo\\",
        \\"views\\": [
          {
            \\"id\\": \\"bar\\",
            \\"type\\": \\"collection\\",
            \\"actions\\": [
              {
        \\"asset\\": {
          \\"type\\": \\"action\\",
          \\"id\\": \\"action-1\\",
          \\"value\\": \\"Next\\"
        }
      },
              {
        \\"asset\\": {
          \\"type\\": \\"action\\",
          \\"value\\": \\"other\\",
          \\"label\\": {
            \\"asset\\": {
              \\"id\\": \\"other-label\\",
              \\"type\\": \\"text\\",
              \\"value\\": \\"Other\\"
            }
          }
        }
      }
            ]
          }
        ]
      }"
    `);
  });
});
