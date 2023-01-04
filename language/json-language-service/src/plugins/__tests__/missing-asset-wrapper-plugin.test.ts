import { TextDocument } from 'vscode-languageserver-textdocument';
import { PlayerLanguageService } from '../..';
import { toTextDocument } from '../../utils';

const simpleAssetWrapperDocument = toTextDocument(
  JSON.stringify(
    {
      id: 'foo',
      navigation: {
        BEGIN: 'FLOW_1',
        FLOW_1: {
          startState: 'VIEW_1',
          VIEW_1: {
            state_type: 'VIEW',
            ref: 'input',
            transitions: {},
          },
        },
      },
      views: [
        {
          id: 'input',
          type: 'input',
          binding: 'foo.bar',
          label: {
            id: 'input-label',
            type: 'text',
            value: 'Label',
          },
        },
      ],
    },
    null,
    2
  )
);

describe('missing-asset-wrapper', () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypes([
      './common/static_xlrs/core',
      './common/static_xlrs/plugin',
    ]);
  });

  it('adds validation for the asset wrapper', async () => {
    const validations = await service.validateTextDocument(
      simpleAssetWrapperDocument
    );

    expect(validations).toHaveLength(1);
    expect(validations?.map((v) => v.message)).toMatchInlineSnapshot(`
      Array [
        "View Validation Error - value: Does not match any of the expected types for type: 'AssetWrapperOrSwitch'",
      ]
    `);
  });

  it('fixes the violation', async () => {
    const diags = await service.validateTextDocument(
      simpleAssetWrapperDocument
    );

    const actions = await service.getCodeActionsInRange(
      simpleAssetWrapperDocument,
      {
        diagnostics: diags ?? [],
      }
    );

    expect(actions).toHaveLength(1);
    const editActions =
      actions[0].edit?.changes?.[simpleAssetWrapperDocument.uri];

    const appliedAction = TextDocument.applyEdits(
      simpleAssetWrapperDocument,
      editActions ?? []
    );

    expect(appliedAction).toStrictEqual(
      JSON.stringify(
        {
          id: 'foo',
          navigation: {
            BEGIN: 'FLOW_1',
            FLOW_1: {
              startState: 'VIEW_1',
              VIEW_1: {
                state_type: 'VIEW',
                ref: 'input',
                transitions: {},
              },
            },
          },
          views: [
            {
              id: 'input',
              type: 'input',
              binding: 'foo.bar',
              label: {
                asset: {
                  id: 'input-label',
                  type: 'text',
                  value: 'Label',
                },
              },
            },
          ],
        },
        null,
        2
      )
    );
  });
});
