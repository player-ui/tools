import { test, expect, describe, beforeEach } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "../..";
import { toTextDocument } from "../../utils";

const simpleDupIDDocument = toTextDocument(
  JSON.stringify(
    {
      views: [
        {
          id: "no",
          type: "bar",
          foo: {
            asset: {
              id: "bar",
            },
          },
          bar: {
            asset: {
              id: "bar",
            },
          },
        },
      ],
    },
    null,
    2
  )
);

describe("duplicate-id-plugin", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);
  });

  test("finds dupe ids", async () => {
    const validations = await service.validateTextDocument(simpleDupIDDocument);

    expect(validations).toHaveLength(10);
    expect(validations?.map((v) => v.message)).toMatchInlineSnapshot(`
      [
        "Content Validation Error - missing: Property "id" missing from type "Flow"",
        "Content Validation Error - missing: Property "navigation" missing from type "Flow"",
        "View is not reachable",
        "Warning - View Type bar was not loaded into Validator definitions",
        "Warning - Asset Type undefined was not loaded into Validator definitions",
        "Asset Validation Error - missing: Property "type" missing from type "Asset"",
        "The id "bar" is already in use in this view.",
        "The id "bar" is already in use in this view.",
        "Warning - Asset Type undefined was not loaded into Validator definitions",
        "Asset Validation Error - missing: Property "type" missing from type "Asset"",
      ]
    `);
  });

  test("fixes dup ids", async () => {
    const diags = await service.validateTextDocument(simpleDupIDDocument);

    const actions = await service.getCodeActionsInRange(simpleDupIDDocument, {
      diagnostics: diags ?? [],
    });

    expect(actions).toHaveLength(2);
    const editActions = actions[0].edit?.changes?.[simpleDupIDDocument.uri];

    const appliedAction = TextDocument.applyEdits(
      simpleDupIDDocument,
      editActions ?? []
    );

    expect(appliedAction).toStrictEqual(
      JSON.stringify(
        {
          views: [
            {
              id: "no",
              type: "bar",
              foo: {
                asset: {
                  id: "foo-asset",
                },
              },
              bar: {
                asset: {
                  id: "bar",
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
