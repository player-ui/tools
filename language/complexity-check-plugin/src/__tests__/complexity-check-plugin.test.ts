import { test, expect, describe, beforeEach } from "vitest";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import {
  PlayerLanguageService,
  toTextDocument,
} from "@player-tools/json-language-service";
import { DiagnosticSeverity } from "vscode-languageserver-types";

import { ComplexityCheck } from "../complexity-check";

describe("complexity plugin", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    service.addLSPPlugin(
      new ComplexityCheck({
        maxAcceptableComplexity: 60,
      }),
    );
    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);
  });

  test("Measures complexity for single view", async () => {
    const textDocument = toTextDocument(
      JSON.stringify({
        id: "test",
        views: [
          {
            id: "yes",
            type: "info",
            title: {
              asset: {
                id: "info-title",
                type: "text",
                value: "{{some.text}}",
              },
            },
            subTitle: {
              asset: {
                id: "info-subTitle",
                type: "text",
                value: "@[somethingSubtitle]@",
              },
            },
          },
        ],
        navigation: {
          BEGIN: "FLOW_1",
          FLOW_1: {
            startState: "ACTION_1",
            ACTION_1: {
              state_type: "ACTION",
              exp: ["something"],
              transitions: {
                "*": "VIEW_1",
              },
            },
            VIEW_1: {
              state_type: "VIEW",
              ref: "yes",
              transitions: {
                "*": "ACTION_2",
              },
            },
            ACTION_2: {
              state_type: "ACTION",
              exp: ["{{somethingElse}} = 1", "something else"],
              transitions: {
                "*": "VIEW_1",
              },
            },
          },
        },
      }),
    );

    const validations = await service.validateTextDocument(textDocument);
    expect(validations).toHaveLength(9);
    /**
     * Score break down
     * 1 x for each view node (1 total) = 1
     * 1 x from exps in ACTION states (3 total) = 3
     * 1 x for each asset node (2 total) = 2
     * 4 x for each expression (`2 total) = 8
     * 4 x for each data evaluated (1 total) = 4
     */
    expect(validations?.map((v) => v.message)[0]).toMatchInlineSnapshot(`
        "Content complexity is 18"
    `);
  });

  test("Measures complexity for evaluating nested bindings", async () => {
    const textDocument = toTextDocument(
      JSON.stringify({
        id: "test",
        views: [
          {
            id: "yes",
            type: "info",
            title: {
              asset: {
                id: "info-title",
                type: "text",
                value: "{{some.infoText}}",
              },
            },
            subTitle: {
              asset: {
                id: "info-subTitle",
                type: "text",
                value: "@[something]@",
              },
            },
            body: {
              asset: {
                id: "info-body",
                type: "text",
                value:
                  "@[conditional({{bar}} == true, {{foo}} = 1, {{foo}} = 2)]@",
              },
            },
          },
        ],
        navigation: {
          BEGIN: "FLOW_1",
          FLOW_1: {
            startState: "ACTION_1",
            ACTION_1: {
              state_type: "ACTION",
              exp: ["something"],
              transitions: {
                "*": "VIEW_1",
              },
            },
            VIEW_1: {
              onStart: [
                "setDataVal('returns.IRS1040.Return.ReturnData.PPPerson.TaxpayerFilerInfoPP.FieldAttributes.PresidentialElectionCampaignIndPP.Covered', true)",
                "dob = {{returns.IRS1040.Return.ReturnData.PPPerson.TaxpayerFilerInfoPP.DateOfBirthPP}}",
                "dob_year = concat(dob[6], dob[7], dob[8], dob[9])",
                "{{local.taxpayer.age}} = {{returns.IRS1040.Return.ReturnHeader.TaxYr}} - dob_year",
                "conditional(dob == (concat('01/01/', year_18)), {{local.taxpayer.age}} = 18)",
              ],
              state_type: "VIEW",
              ref: "yes",
              transitions: {
                "*": "ACTION_2",
              },
            },
            ACTION_2: {
              state_type: "ACTION",
              exp: ["{{something}} = 1", "something else"],
              transitions: {
                "*": "VIEW_2",
              },
            },
            VIEW_2: {
              state_type: "VIEW",
              ref: "yes",
              transitions: {
                "*": "ACTION_3",
              },
            },
            ACTION_3: {
              state_type: "ACTION",
              exp: ["{{something}} = 1", "something else"],
              transitions: {
                "*": "VIEW_1",
              },
            },
          },
        },
      }),
    );

    const validations = await service.validateTextDocument(textDocument);
    expect(validations).toHaveLength(20);
    /**
     * Score break down
     * 1 x for each view node (1 total) = 1
     * 1 x from exps in ACTION states (5 total) = 5
     * 1 x for each asset node (3 total) = 3
     * 4 x for each expression (2 total) = 8
     * 4 x for each data evaluated (10 total) = 40
     */
    expect(validations?.map((v) => v.message)[0]).toMatchInlineSnapshot(`
        "Content complexity is 57"
    `);
  });

  test("Measures complexity for templates", async () => {
    const textDocument = toTextDocument(
      JSON.stringify({
        id: "test",
        views: [
          {
            id: "yes",
            type: "info",
            title: {
              asset: {
                id: "info-title",
                type: "text",
                value: "{{some.text}}",
              },
            },
            template: [
              {
                data: "foo.pets",
                output: "values",
                value: {
                  asset: {
                    type: "collection",
                    id: "outer-collection-_index_",
                    template: [
                      {
                        data: "foo.people",
                        output: "values",
                        value: {
                          asset: {
                            id: "outer-collection-_index_-values_index1_",
                            type: "text",
                            value: "{{foo.people._index_}}",
                          },
                        },
                      },
                    ],
                  },
                },
              },
            ],
            data: {
              foo: [1, 2],
            },
          },
        ],
        navigation: {
          BEGIN: "FLOW_1",
          FLOW_1: {
            startState: "ACTION_1",
            ACTION_1: {
              state_type: "ACTION",
              exp: ["something"],
              transitions: {
                "*": "VIEW_1",
              },
            },
            VIEW_1: {
              state_type: "VIEW",
              ref: "yes",
              transitions: {
                "*": "ACTION_2",
              },
            },
            ACTION_2: {
              state_type: "ACTION",
              exp: ["{{somethingElse}} = 1", "something else"],
              transitions: {
                "*": "VIEW_1",
              },
            },
          },
        },
      }),
    );

    const validations = await service.validateTextDocument(textDocument);
    expect(validations).toHaveLength(13);
    /**
     * Score break down
     * 1 x for each view node (1 total) = 1
     * 1 x from exps in ACTION states (3 total) = 3
     * 1 x for each asset node (3 total) = 3
     * 1 x template parent found (3 total) = 3
     * 4 x for each expression (2 total) = 8
     * 4 x for each data evaluated (1 total) = 4
     */
    expect(validations?.map((v) => v.message)[0]).toMatchInlineSnapshot(`
        "Content complexity is 22"
    `);
  });

  test("Accounts for weighted types", async () => {
    let customService: PlayerLanguageService = new PlayerLanguageService();

    customService = new PlayerLanguageService();
    customService.addLSPPlugin(
      new ComplexityCheck({
        maxAcceptableComplexity: 60,
        typeWeights: { text: 1, info: 2, table: 5 },
      }),
    );
    await customService.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const textDocument = toTextDocument(
      JSON.stringify({
        id: "test",
        views: [
          {
            id: "yes",
            type: "info",
            title: {
              asset: {
                id: "info-title",
                type: "text",
                value: "{{some.infoText}}",
              },
            },
            subTitle: {
              asset: {
                id: "info-subTitle",
                type: "text",
                value: "@[something]@",
              },
            },
          },
        ],
        navigation: {
          BEGIN: "FLOW_1",
          FLOW_1: {
            startState: "ACTION_1",
            ACTION_1: {
              state_type: "ACTION",
              exp: ["something"],
              transitions: {
                "*": "VIEW_1",
              },
            },
            VIEW_1: {
              state_type: "VIEW",
              ref: "yes",
              transitions: {
                "*": "ACTION_2",
              },
            },
            ACTION_2: {
              state_type: "ACTION",
              exp: ["{{somethingElse}} = 1", "something else"],
              transitions: {
                "*": "VIEW_1",
              },
            },
          },
        },
      }),
    );

    const validations = await customService.validateTextDocument(textDocument);
    expect(validations).toHaveLength(9);
    /**
     * Score break down
     * 1 x for each view node (1 total) = 1
     * 4 x for each view type = info (1 total) = 2
     * 1 x from exps in ACTION states (3 total) = 3
     * 1 x for each asset node (2 total) = 2
     * 1 x for each asset type = text (2 total) = 2
     * 4 x for each expression (2 total) = 8
     * 4 x for each data evaluated (1 total) = 4
     */
    expect(validations?.map((v) => v.message)[0]).toMatchInlineSnapshot(`
        "Content complexity is 22"
    `);
  });

  test("Outputs warning message correctly", async () => {
    let customService: PlayerLanguageService = new PlayerLanguageService();

    customService = new PlayerLanguageService();
    customService.addLSPPlugin(
      new ComplexityCheck({
        maxAcceptableComplexity: 20,
        maxWarningLevel: 10,
      }),
    );
    await customService.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const textDocument = toTextDocument(
      JSON.stringify({
        id: "test",
        views: [
          {
            id: "yes",
            type: "info",
            title: {
              asset: {
                id: "info-title",
                type: "text",
                value: "{{some.infoText}}",
              },
            },
            subTitle: {
              asset: {
                id: "info-subTitle",
                type: "text",
                value: "@[something]@",
              },
            },
          },
        ],
        navigation: {
          BEGIN: "FLOW_1",
          FLOW_1: {
            startState: "ACTION_1",
            ACTION_1: {
              state_type: "ACTION",
              exp: ["something"],
              transitions: {
                "*": "VIEW_1",
              },
            },
            VIEW_1: {
              state_type: "VIEW",
              ref: "yes",
              transitions: {
                "*": "ACTION_2",
              },
            },
            ACTION_2: {
              state_type: "ACTION",
              exp: ["{{somethingElse}} = 1", "something else"],
              transitions: {
                "*": "VIEW_1",
              },
            },
          },
        },
      }),
    );

    const validations = await customService.validateTextDocument(textDocument);
    expect(validations).toHaveLength(9);
    /**
     * Score break down
     * 1 x for each view node (1 total) = 1
     * 1 x from exps in ACTION states (3 total) = 3
     * 1 x for each asset node (2 total) = 2
     * 4 x for each expression (2 total) = 8
     * 4 x for each data evaluated (1 total) = 4
     */
    expect(validations?.map((v) => v.message)[0]).toMatchInlineSnapshot(`
      "Content complexity is 18, Warning: 10"
    `);
    expect(validations?.map((v) => v.severity)[0]).toBe(
      DiagnosticSeverity.Warning,
    );
  });

  test("Calculates custom score criteria correctly", async () => {
    let customService: PlayerLanguageService = new PlayerLanguageService();

    customService = new PlayerLanguageService();
    customService.addLSPPlugin(
      new ComplexityCheck({
        maxAcceptableComplexity: 20,
        maxWarningLevel: 10,
        baseWeightOverrides: {
          assetNode: 4,
        },
      }),
    );
    await customService.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const textDocument = toTextDocument(
      JSON.stringify({
        id: "test",
        views: [
          {
            id: "yes",
            type: "info",
            title: {
              asset: {
                id: "info-title",
                type: "text",
                value: "{{some.infoText}}",
              },
            },
            subTitle: {
              asset: {
                id: "info-subTitle",
                type: "text",
                value: "@[something]@",
              },
            },
          },
        ],
        navigation: {
          BEGIN: "FLOW_1",
          FLOW_1: {
            startState: "ACTION_1",
            ACTION_1: {
              state_type: "ACTION",
              exp: ["something"],
              transitions: {
                "*": "VIEW_1",
              },
            },
            VIEW_1: {
              state_type: "VIEW",
              ref: "yes",
              transitions: {
                "*": "ACTION_2",
              },
            },
            ACTION_2: {
              state_type: "ACTION",
              exp: ["{{somethingElse}} = 1", "something else"],
              transitions: {
                "*": "VIEW_1",
              },
            },
          },
        },
      }),
    );

    const validations = await customService.validateTextDocument(textDocument);
    expect(validations).toHaveLength(9);
    /**
     * Score break down
     * 1 x for each view node (1 total) = 1
     * 1 x from exps in ACTION states (3 total) = 3
     * 4 x for each asset node (2 total) = 8
     * 4 x for each expression (2 total) = 8
     * 4 x for each data evaluated (1 total) = 4
     */
    expect(validations?.map((v) => v.message)[0]).toMatchInlineSnapshot(`
      "Content complexity is 24, Maximum: 20"
    `);
    expect(validations?.map((v) => v.severity)[0]).toBe(
      DiagnosticSeverity.Error,
    );
  });
});
