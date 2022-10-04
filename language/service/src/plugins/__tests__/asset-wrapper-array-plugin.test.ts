import { PlayerLanguageService } from '../..';
import { toTextDocument } from '../../utils';

describe('asset-wrapper-array-plugin', () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypes([
      './common/static_xlrs/core',
      './common/static_xlrs/plugin',
    ]);
  });

  test('finds arrays that should be asset wrappers', async () => {
    const textDocument = toTextDocument(
      JSON.stringify(
        {
          id: 'foo',
          navigation: {
            BEGIN: 'FLOW_1',
            FLOW_1: {
              startState: 'VIEW_1',
              VIEW_1: {
                state_type: 'VIEW',
                ref: 'bar',
                transitions: {},
              },
            },
          },
          views: [
            {
              id: 'bar',
              type: 'info',
              primaryInfo: [
                {
                  id: 'asset-1',
                  type: 'text',
                  value: 'Foo',
                },
              ],
            },
          ],
        },
        null,
        2
      )
    );

    const diags = await service.validateTextDocument(textDocument);

    expect(diags).toHaveLength(2);
    expect(diags?.map((d) => d.message)).toContain(
      'Implicit Array -> "collection" assets is not supported.'
    );

    expect(diags).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "View Validation Error - value: Does not match any of the expected types for type: 'AssetWrapperOrSwitch'",
          "range": Object {
            "end": Object {
              "character": 7,
              "line": 23,
            },
            "start": Object {
              "character": 21,
              "line": 17,
            },
          },
          "severity": 1,
        },
        Object {
          "message": "Implicit Array -> \\"collection\\" assets is not supported.",
          "range": Object {
            "end": Object {
              "character": 19,
              "line": 17,
            },
            "start": Object {
              "character": 6,
              "line": 17,
            },
          },
          "severity": 1,
        },
      ]
    `);
  });
});
