import { test, expect, describe, beforeEach } from "vitest";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "../..";
import { toTextDocument } from "../../utils";
import { ComplexityCheck } from "../complexity-check";

describe("complexity plugin", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    service.addLSPPlugin(new ComplexityCheck({ maxAcceptableComplexity: 0 }));
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
              exp: ["{{something}} = 1", "something else"],
              transitions: {
                "*": "VIEW_1",
              },
            },
          },
        },
      })
    );

    const validations = await service.validateTextDocument(textDocument);
    expect(validations).toHaveLength(1);
    /**
     * Score break down
     * 1 x from exps in ACTION states (3 total)
     * 1 x for each view (1 total)
     * 1 x for each asset (2 total)
     * 2 x for each data read (1 total)
     * 2 x for each expression (1 total)
     * 2 x for each data set (1 total)
     */
    expect(validations?.map((v) => v.message)).toMatchInlineSnapshot(`
      [
        "Error: Content complexity is 12",
      ]
    `);
  });
});
