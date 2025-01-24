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

const dupIDDocumentWithTemplate = toTextDocument(
  JSON.stringify(
    {
      id: "test",
      views: [
        {
          id: "root",
          type: "info",
          primaryInfo: {
            asset: {
              id: "root-primaryInfo-collection",
              type: "collection",
              template: [
                {
                  data: "some.data",
                  output: "values",
                  value: {
                    asset: {
                      id: "root-primaryInfo-collection-values-collection",
                      type: "collection",
                      template: [
                        {
                          data: "some.other.data",
                          output: "values",
                          value: {
                            asset: {
                              id: "root-primaryInfo-collection-values-collection-values-text",
                              type: "text",
                              value: "something",
                            },
                          },
                        },
                        {
                          data: "some.other.data",
                          output: "values",
                          value: {
                            asset: {
                              id: "root-primaryInfo-collection-values-_index_collection-values_index1_-text",
                              type: "text",
                              value: "something",
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      ],
      navigation: {
        BEGIN: "FLOW_1",
        FLOW_1: {
          VIEW_1: {
            ref: "root",
            state_type: "VIEW",
            transitions: {
              "*": "END_Done",
            },
          },
          END_Done: {
            state_type: "END",
            outcome: "done",
          },
          startState: "VIEW_1",
        },
      },
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

  test("finds templates with missing index segments", async () => {
    const validations = await service.validateTextDocument(
      dupIDDocumentWithTemplate
    );

    expect(validations).toHaveLength(2);
    expect(validations?.map((v) => v.message)).toMatchInlineSnapshot(`
      [
        "The id for this templated elements is missing the following index segments: _index_",
        "The id for this templated elements is missing the following index segments: _index_, _index1_",
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
