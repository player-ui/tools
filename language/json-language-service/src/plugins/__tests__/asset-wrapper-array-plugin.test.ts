import { test, expect, describe, beforeEach } from "vitest";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "../..";
import { toTextDocument } from "../../utils";

describe("asset-wrapper-array-plugin", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);
  });

  test("finds arrays that should be asset wrappers", async () => {
    const textDocument = toTextDocument(
      JSON.stringify(
        {
          id: "foo",
          navigation: {
            BEGIN: "FLOW_1",
            FLOW_1: {
              startState: "VIEW_1",
              VIEW_1: {
                state_type: "VIEW",
                ref: "bar",
                transitions: {},
              },
            },
          },
          views: [
            {
              id: "bar",
              type: "info",
              primaryInfo: [
                {
                  id: "asset-1",
                  type: "text",
                  value: "Foo",
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

    expect(diags?.map((d) => d.message)).toMatchInlineSnapshot(`
      [
        "View Validation Error - value: Does not match any of the expected types for type: 'AssetWrapperOrSwitch'",
        "View Validation Error - value: Expected: array | (binding/expression)",
        "Implicit Array -> "collection" assets is not supported.",
      ]
    `);

    expect(diags).toMatchInlineSnapshot(`
      [
        {
          "message": "View Validation Error - value: Does not match any of the expected types for type: 'AssetWrapperOrSwitch'",
          "range": {
            "end": {
              "character": 7,
              "line": 23,
            },
            "start": {
              "character": 21,
              "line": 17,
            },
          },
          "severity": 1,
        },
        {
          "message": "View Validation Error - value: Expected: array | (binding/expression)",
          "range": {
            "end": {
              "character": 7,
              "line": 23,
            },
            "start": {
              "character": 21,
              "line": 17,
            },
          },
          "severity": 3,
        },
        {
          "message": "Implicit Array -> "collection" assets is not supported.",
          "range": {
            "end": {
              "character": 19,
              "line": 17,
            },
            "start": {
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
