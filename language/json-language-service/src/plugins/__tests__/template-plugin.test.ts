import { test, expect, describe, beforeEach } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "../..";
import { toTextDocument } from "../../utils";

describe("template-plugin", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);
  });

  test("fixes old templates", async () => {
    const testDocument = toTextDocument(
      JSON.stringify(
        {
          id: "foo",
          views: [
            {
              id: "bar",
              type: "collection",
              templateData: "foo.bar",
              templateOutput: "values",
              template: {
                asset: {
                  id: "asset-_index_",
                  type: "text",
                  value: "_index_",
                },
              },
            },
          ],
        },
        null,
        2
      )
    );

    const diags = await service.validateTextDocument(testDocument);

    expect(diags?.map((m) => m.message)).toMatchInlineSnapshot(`
      [
        "Content Validation Error - missing: Property "navigation" missing from type "Flow"",
        "View is not reachable",
        "Migrate to the template[] syntax.",
        "Migrate to the template[] syntax.",
        "View Validation Error - type: Expected an array but got an "object"",
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
        "id": "foo",
        "views": [
          {
            "id": "bar",
            "type": "collection",
            "template": [
              {
                "value": {
                  "asset": {
                    "id": "asset-_index_",
                    "type": "text",
                    "value": "_index_"
                  }
                },
                "output": "values",
                "data": "foo.bar"
              }
            ]
          }
        ]
      }"
    `);
  });
});
