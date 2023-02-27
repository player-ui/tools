import { Position } from 'vscode-languageserver-types';
import { PlayerLanguageService } from '../..';
import { toTextDocument } from '../../utils';

describe('binding-plugin', () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypes([
      './common/static_xlrs/core',
      './common/static_xlrs/plugin',
    ]);
  });

  test('auto completes bindings', async () => {
    const testDocument = toTextDocument(
      JSON.stringify(
        {
          views: [
            {
              id: 'bar',
              type: 'input',
              binding: '',
            },
          ],
          schema: {
            ROOT: {
              foo: {
                type: 'FooType',
              },
            },
            FooType: {
              bar: {
                type: 'StringType',
              },
            },
          },
        },
        null,
        2
      )
    );
    const completions = await service.getCompletionsAtPosition(
      testDocument,
      Position.create(5, 18)
    );

    expect(completions.items).toHaveLength(2);
    expect(completions.items.map((c) => c.label)).toMatchInlineSnapshot(`
      Array [
        "foo",
        "foo.bar",
      ]
    `);
  });
});
