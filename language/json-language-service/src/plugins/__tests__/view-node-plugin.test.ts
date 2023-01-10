import { Position } from 'vscode-languageserver-types';
import { PlayerLanguageService } from '../..';
import { toTextDocument } from '../../utils';

describe('duplicate-id-plugin', () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypes([
      './common/static_xlrs/core',
      './common/static_xlrs/plugin',
    ]);
  });

  it('validates view ids', async () => {
    const textDocument = toTextDocument(
      JSON.stringify({
        id: 'test',
        views: [
          {
            id: 'yes',
            type: 'view',
          },
          {
            // Should warn
            id: 'no',
            type: 'view',
          },
        ],
        navigation: {
          BEGIN: 'FLOW_1',
          FLOW_1: {
            startState: 'VIEW_1',
            VIEW_1: {
              state_type: 'VIEW',
              ref: 'yes',
              transitions: {},
            },
            VIEW_2: {
              state_type: 'VIEW',
              // Should error
              ref: 'nope',
              transitions: {},
            },
          },
        },
      })
    );

    const validations = await service.validateTextDocument(textDocument);
    expect(validations).toHaveLength(4);
    expect(validations?.map((v) => v.message)).toMatchInlineSnapshot(`
      Array [
        "Warning - View Type view was not loaded into Validator definitions",
        "View is not reachable",
        "Warning - View Type view was not loaded into Validator definitions",
        "View with id: nope does not exist.",
      ]
    `);
  });

  it('completes view ids in view obj', async () => {
    const textDocument = toTextDocument(
      JSON.stringify(
        {
          views: [
            {
              id: '',
              type: 'view',
            },
          ],
          navigation: {
            BEGIN: 'FLOW_1',
            FLOW_1: {
              startState: 'VIEW_1',
              VIEW_1: {
                state_type: 'VIEW',
                ref: 'view-1',
                transitions: {},
              },
              VIEW_2: {
                state_type: 'VIEW',
                ref: 'other-view',
                transitions: {},
              },
            },
          },
        },
        null,
        2
      )
    );

    const completions = await service.getCompletionsAtPosition(
      textDocument,
      Position.create(3, 13)
    );

    expect(completions.items?.map((i) => i.label)).toContain('view-1');
    expect(completions.items?.map((i) => i.label)).toContain('other-view');
    expect(completions.items?.map((i) => i.label)).toMatchInlineSnapshot(`
      Array [
        "view-1",
        "other-view",
      ]
    `);
  });

  it('completes view ids in view nodes', async () => {
    const textDocument = toTextDocument(
      JSON.stringify(
        {
          views: [
            {
              id: 'view-1',
              type: 'view',
            },
          ],
          navigation: {
            BEGIN: 'FLOW_1',
            FLOW_1: {
              startState: 'VIEW_1',
              VIEW_1: {
                state_type: 'VIEW',
                ref: '',
                transitions: {},
              },
            },
          },
        },
        null,
        2
      )
    );

    const completions = await service.getCompletionsAtPosition(
      textDocument,
      Position.create(13, 15)
    );

    expect(completions.items?.map((i) => i.label)).toContain('view-1');
    expect(completions.items?.map((i) => i.label)).toMatchInlineSnapshot(`
      Array [
        "view-1",
      ]
    `);
  });
});
