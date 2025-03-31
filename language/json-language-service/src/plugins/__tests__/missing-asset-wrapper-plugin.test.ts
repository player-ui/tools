import { test, expect, describe, beforeEach } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "../..";
import { toTextDocument } from "../../utils";

const simpleAssetWrapperDocument = toTextDocument(
  JSON.stringify(
    {
      id: "foo",
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          startState: "VIEW_1",
          VIEW_1: {
            state_type: "VIEW",
            ref: "input",
            transitions: {},
          },
        },
      },
      views: [
        {
          id: "input",
          type: "input",
          binding: "foo.bar",
          label: {
            id: "input-label",
            type: "text",
            value: "Label",
          },
        },
      ],
    },
    null,
    2,
  ),
);

describe("missing-asset-wrapper", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);
  });

  test("adds validation for the asset wrapper", async () => {
    const validations = await service.validateTextDocument(
      simpleAssetWrapperDocument,
    );

    expect(validations).toHaveLength(2);
    expect(validations?.map((v) => v.message)).toMatchInlineSnapshot(`
      [
        "View Validation Error - value: Does not match any of the expected types for type: 'AssetWrapperOrSwitch'",
        "Expected: AssetWrapper & object literal | StaticSwitch & object literal | DynamicSwitch & object literal",
      ]
    `);
  });

  test("fixes the violation", async () => {
    const diags = await service.validateTextDocument(
      simpleAssetWrapperDocument,
    );

    expect(diags).toMatchInlineSnapshot(`
      [
        {
          "message": "View Validation Error - value: Does not match any of the expected types for type: 'AssetWrapperOrSwitch'",
          "range": {
            "end": {
              "character": 7,
              "line": 22,
            },
            "start": {
              "character": 15,
              "line": 18,
            },
          },
          "severity": 1,
        },
        {
          "message": "Expected: AssetWrapper & object literal | StaticSwitch & object literal | DynamicSwitch & object literal",
          "range": {
            "end": {
              "character": 7,
              "line": 22,
            },
            "start": {
              "character": 15,
              "line": 18,
            },
          },
          "severity": 3,
        },
      ]
    `);

    const actions = await service.getCodeActionsInRange(
      simpleAssetWrapperDocument,
      {
        diagnostics: diags ?? [],
      },
    );

    expect(actions).toMatchInlineSnapshot(`
      [
        {
          "edit": {
            "changes": {
              "foo": [
                {
                  "newText": "{
              "asset": {
                "id": "input-label",
                "type": "text",
                "value": "Label"
              }
            }",
                  "range": {
                    "end": {
                      "character": 7,
                      "line": 22,
                    },
                    "start": {
                      "character": 15,
                      "line": 18,
                    },
                  },
                },
              ],
            },
          },
          "kind": "quickfix",
          "title": "Wrap in "asset"",
        },
      ]
    `);

    const editActions =
      actions[0]?.edit?.changes?.[simpleAssetWrapperDocument.uri];

    const appliedAction = TextDocument.applyEdits(
      simpleAssetWrapperDocument,
      editActions ?? [],
    );

    expect(appliedAction).toStrictEqual(
      JSON.stringify(
        {
          id: "foo",
          navigation: {
            BEGIN: "FLOW_1",
            FLOW_1: {
              startState: "VIEW_1",
              VIEW_1: {
                state_type: "VIEW",
                ref: "input",
                transitions: {},
              },
            },
          },
          views: [
            {
              id: "input",
              type: "input",
              binding: "foo.bar",
              label: {
                asset: {
                  id: "input-label",
                  type: "text",
                  value: "Label",
                },
              },
            },
          ],
        },
        null,
        2,
      ),
    );
  });
});
