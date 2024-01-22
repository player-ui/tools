import { test, expect, describe, beforeEach } from 'vitest';
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from '@player-tools/static-xlrs';
import { PlayerLanguageService } from '../..';
import { toTextDocument } from '../../utils';

describe('nav-state-plugin', () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.XLRService.XLRSDK.loadDefinitionsFromModule(Types);
    await service.XLRService.XLRSDK.loadDefinitionsFromModule(
      ReferenceAssetsWebPluginManifest
    );
  });

  test('validates node transitions', async () => {
    const testDocument = toTextDocument(
      JSON.stringify(
        {
          id: 'foo',
          views: [{ id: 'view-1', type: 'view' }],
          navigation: {
            BEGIN: 'FLOW_1',
            FLOW_1: {
              startState: 'VIEW_1',
              VIEW_1: {
                state_type: 'VIEW',
                ref: 'view-1',
                transitions: {
                  next: 'ACTION_1',
                },
              },
            },
          },
        },
        null,
        2
      )
    );

    const diags = await service.validateTextDocument(testDocument);

    expect(diags).toHaveLength(2);
    expect(diags?.map((m) => m.message)).toMatchInlineSnapshot(`
      [
        "Warning - View Type view was not loaded into Validator definitions",
        "Node 'ACTION_1' not found",
      ]
    `);
  });

  test('validates node transitions with multiple flows', async () => {
    const testDocument = toTextDocument(
      JSON.stringify(
        {
          id: 'foo',
          views: [
            { id: 'view-1', type: 'view' },
            { id: 'view-2', type: 'view' },
          ],
          navigation: {
            BEGIN: 'FLOW_1',
            FLOW_1: {
              startState: 'VIEW_1',
              VIEW_1: {
                state_type: 'VIEW',
                ref: 'view-1',
                transitions: {
                  next: 'END_Done',
                },
              },
              END_Done: {
                state_type: 'END',
                outcome: 'done',
              },
            },
            FLOW_2: {
              startState: 'VIEW_2',
              VIEW_2: {
                state_type: 'VIEW',
                ref: 'view-2',
                transitions: {
                  back: 'END_Back',
                },
              },
              END_Back: {
                state_type: 'END',
                outcome: 'done',
              },
            },
          },
        },
        null,
        2
      )
    );
    const diags = await service.validateTextDocument(testDocument);

    expect(diags?.filter((d) => d.severity !== 2)).toMatchInlineSnapshot(`
      Array [
        Object {
          "message": "Warning - View Type view was not loaded into Validator definitions",
          "range": Object {
            "end": Object {
              "character": 5,
              "line": 6,
            },
            "start": Object {
              "character": 4,
              "line": 3,
            },
          },
          "severity": 1,
        },
        Object {
          "message": "Warning - View Type view was not loaded into Validator definitions",
          "range": Object {
            "end": Object {
              "character": 5,
              "line": 10,
            },
            "start": Object {
              "character": 4,
              "line": 7,
            },
          },
          "severity": 1,
        },
      ]
    `);
  });
});
