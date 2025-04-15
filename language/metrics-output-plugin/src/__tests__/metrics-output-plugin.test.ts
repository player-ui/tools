import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "@player-tools/json-language-service";

import { MetricsOutput } from "../metrics-output";
import { ComplexityCheck } from "@player-tools/complexity-check-plugin";

describe("WriteMetricsPlugin", () => {
  let service: PlayerLanguageService;
  const TEST_DIR = path.resolve("target");
  const TEST_FILE = "output.json";
  const TEST_FILE_PATH = path.join(TEST_DIR, TEST_FILE);

  beforeEach(async () => {
    // Create test directory
    if (!fs.existsSync(TEST_DIR)) {
      fs.mkdirSync(TEST_DIR, { recursive: true });
    }

    // Set fixed date for consistent test results
    vi.spyOn(Date.prototype, "toISOString").mockImplementation(
      () => "2023-01-01T00:00:00.000Z",
    );

    service = new PlayerLanguageService();

    // Add complexity check plugin first
    service.addLSPPlugin(
      new ComplexityCheck({
        maxAcceptableComplexity: 60,
      }),
    );

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: TEST_FILE.replace(".json", ""),
        rootProperties: {
          assetId: "asldkj343k1lskdf",
          testRun: true,
        },
        metrics: {
          complexity: (diagnostics) => {
            const prefix = "Content complexity is ";

            // Find the complexity diagnostic message
            const complexityDiagnostic = diagnostics.find((diag) =>
              diag.message.includes(prefix),
            );

            let score = 0;
            if (complexityDiagnostic) {
              score = parseInt(
                complexityDiagnostic.message.split(prefix)[1],
                10,
              );
            }

            return score;
          },
        },
        features: {
          dslEnabled: () => true,
          validationEnabled: () => true,
          localizationEnabled: () => false,
        },
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);
  });

  afterEach(() => {
    vi.resetAllMocks();

    // Clean up test files
    try {
      if (fs.existsSync(TEST_FILE_PATH)) {
        fs.unlinkSync(TEST_FILE_PATH);
      }
      fs.rmdirSync(TEST_DIR);
    } catch (e) {
      // Ignore cleanup errors in tests
    }
  });

  test("Outputs complexity diagnostics for multiple files", async () => {
    // First document - complex with navigation and expressions
    const firstDocument = TextDocument.create(
      "path/to/file/1.json",
      "json",
      1,
      JSON.stringify({
        id: "test1",
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

    // Second document - simpler with less complexity
    const secondDocument = TextDocument.create(
      "path/to/file/2.json",
      "json",
      1,
      JSON.stringify({
        id: "test2",
        views: [
          {
            id: "simpleView",
            type: "info",
            title: {
              asset: {
                id: "simple-title",
                type: "text",
                value: "Static Text",
              },
            },
          },
        ],
        navigation: {
          BEGIN: "FLOW_2",
          FLOW_2: {
            startState: "VIEW_1",
            VIEW_1: {
              state_type: "VIEW",
              ref: "simpleView",
              transitions: {
                "*": "END_Done",
              },
            },
          },
        },
      }),
    );

    // Validate both documents
    const validations1 = await service.validateTextDocument(firstDocument);
    const validations2 = await service.validateTextDocument(secondDocument);

    // Verify diagnostics for first document (complex)
    expect(validations1).toHaveLength(9);
    expect(validations1?.map((v) => v.message)[0]).toContain(
      "Content complexity is 18",
    );

    // Verify diagnostics for second document (simpler)
    expect(validations2?.length).toBeGreaterThan(0);

    // Now verify the output file was created
    expect(fs.existsSync(TEST_FILE_PATH)).toBe(true);

    // Read the file content
    const fileContent = fs.readFileSync(TEST_FILE_PATH, "utf-8");
    const jsonContent = JSON.parse(fileContent);

    // Verify basic structure - top level properties
    expect(jsonContent).toHaveProperty("timestamp", "2023-01-01T00:00:00.000Z");
    expect(jsonContent).toHaveProperty("testRun", true);
    expect(jsonContent).toHaveProperty("assetId", "asldkj343k1lskdf");
    expect(jsonContent).toHaveProperty("content");

    // Check that both files are included in the content property
    expect(jsonContent.content).toHaveProperty("path/to/file/1.json");
    expect(jsonContent.content).toHaveProperty("path/to/file/2.json");

    // Verify the metrics structure for the first file
    expect(jsonContent.content["path/to/file/1.json"]).toHaveProperty(
      "metrics",
    );
    expect(jsonContent.content["path/to/file/1.json"].metrics).toHaveProperty(
      "complexity",
      18,
    );

    // Verify features exist in the first file
    expect(jsonContent.content["path/to/file/1.json"]).toHaveProperty(
      "features",
    );
    expect(jsonContent.content["path/to/file/1.json"].features).toHaveProperty(
      "dslEnabled",
      true,
    );

    // Verify the metrics structure for the second file
    expect(jsonContent.content["path/to/file/2.json"]).toHaveProperty(
      "metrics",
    );
    expect(jsonContent.content["path/to/file/2.json"].metrics).toHaveProperty(
      "complexity",
    );

    // The first document should have higher complexity than the second
    const complexity1 =
      jsonContent.content["path/to/file/1.json"].metrics.complexity;
    const complexity2 =
      jsonContent.content["path/to/file/2.json"].metrics.complexity;
    expect(complexity1).toBeGreaterThan(complexity2);

    // Log the full JSON content
    console.log(
      "Metrics output for multiple files: \n",
      JSON.stringify(jsonContent, null, 2),
    );
  });
});
