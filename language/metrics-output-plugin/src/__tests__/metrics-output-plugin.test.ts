import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "@player-tools/json-language-service";

import { MetricsOutput, extractFromDiagnostics, extractByData } from "..";
import { ComplexityCheck } from "@player-tools/complexity-check-plugin";

describe("WriteMetricsPlugin", () => {
  let service: PlayerLanguageService;
  const TEST_DIR = path.resolve("target");
  const TEST_FILE = "output.json";
  const TEST_FILE_PATH = path.join(TEST_DIR, TEST_FILE);

  const ASSET_COUNT_SYMBOL = Symbol("asset-count");

  const mockAssetCount = `{
      "action": 3,
      "text": 3,
      "collection": 2,
      "image": 2,
      "input": 2,
      "info": 1
  }`;

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

    // Add a custom diagnostic plugin to report asset count
    service.addLSPPlugin({
      name: "AssetCountDiagnostic",
      apply(languageService: PlayerLanguageService) {
        // Hook into the validate event
        languageService.hooks.validate.tap(
          "AssetCountDiagnostic",
          async (_context, validationContext) => {
            validationContext.addDiagnostic({
              message: `${mockAssetCount}`,
              range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 },
              },
              severity: 1, // Information
              data: ASSET_COUNT_SYMBOL, // Use the shared Symbol
            });
          },
        );
      },
    });

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: TEST_FILE.replace(".json", ""),
        rootProperties: {
          testRun: true,
        },
        stats: {
          complexity: extractFromDiagnostics(
            /Content complexity is (\d+)/,
            (value: string) => parseInt(value, 10),
          ),
          assets: (diagnostics) =>
            extractByData(ASSET_COUNT_SYMBOL, diagnostics), // Use the shared Symbol
          customStat: () => Math.random(),
        },
        features: {
          validationEnabled: (diagnostics) => {
            return !diagnostics.some((d) => d.severity === 2);
          },
          localizationEnabled: false,
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
    try {
      if (fs.existsSync(TEST_FILE_PATH)) {
        fs.unlinkSync(TEST_FILE_PATH);
      }
      fs.rmdirSync(TEST_DIR);
    } catch (e) {
      // This prevents test failures when cleanup can't complete but tests ran correctly
      console.debug("Cleanup failed, but tests may still be valid:", e);
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
          {
            id: "root",
            type: "image",
            metaData: {
              ref: "https://player-ui.github.io/latest/_astro/logo-dark-large.BVfeRCvY.png",
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
    expect(validations1?.map((v) => v.message)[0]).toContain(
      "Content complexity is 19",
    );

    // Verify the asset count diagnostic is present
    expect(validations1?.some((v) => v.data === ASSET_COUNT_SYMBOL)).toBe(true);

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
    expect(jsonContent).toHaveProperty("content");

    // Check that both files are included in the content property
    expect(jsonContent.content).toHaveProperty("path/to/file/1.json");
    expect(jsonContent.content).toHaveProperty("path/to/file/2.json");

    // Verify the stats structure for the first file
    expect(jsonContent.content["path/to/file/1.json"]).toHaveProperty("stats");
    expect(jsonContent.content["path/to/file/1.json"].stats).toHaveProperty(
      "complexity",
      19,
    );

    // Verify the asset count is extracted properly
    expect(jsonContent.content["path/to/file/1.json"].stats).toHaveProperty(
      "assets",
    );

    expect(
      jsonContent.content["path/to/file/1.json"].stats.assets,
    ).toHaveProperty("action", 3);
    expect(
      jsonContent.content["path/to/file/1.json"].stats.assets,
    ).toHaveProperty("text", 3);

    // Verify features exist in the first file
    expect(jsonContent.content["path/to/file/1.json"]).toHaveProperty(
      "features",
    );

    // Verify the function-based feature returns true
    expect(
      jsonContent.content["path/to/file/1.json"].features.validationEnabled,
    ).toBe(false);

    // Verify the stats structure for the second file
    expect(jsonContent.content["path/to/file/2.json"]).toHaveProperty("stats");
    expect(jsonContent.content["path/to/file/2.json"].stats).toHaveProperty(
      "complexity",
    );
  });

  test("outputDir and fileName options work as expected", async () => {
    // Setup custom output directory and filename
    const customDir = path.resolve("custom_output_dir");
    const customFileName = "custom_metrics";
    const customFilePath = path.join(customDir, `${customFileName}.json`);

    // Clean up any existing files from previous test runs
    if (fs.existsSync(customFilePath)) {
      fs.unlinkSync(customFilePath);
    }
    if (fs.existsSync(customDir)) {
      fs.rmdirSync(customDir);
    }

    const customService = new PlayerLanguageService();

    // Add complexity check plugin first
    customService.addLSPPlugin(
      new ComplexityCheck({
        maxAcceptableComplexity: 60,
      }),
    );

    // Add metrics output plugin with custom config
    customService.addLSPPlugin(
      new MetricsOutput({
        outputDir: customDir,
        fileName: customFileName,
        rootProperties: {
          customTest: true,
        },
      }),
    );

    await customService.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    // Create a simple test document
    const document = TextDocument.create(
      "path/to/test/file.json",
      "json",
      1,
      JSON.stringify({
        id: "testCustomConfig",
        views: [
          {
            id: "simpleView",
            type: "info",
          },
        ],
      }),
    );

    await customService.validateTextDocument(document);

    // Verify the custom output file was created in the expected location
    expect(fs.existsSync(customFilePath)).toBe(true);

    // Read and verify file content
    const fileContent = fs.readFileSync(customFilePath, "utf-8");
    const jsonContent = JSON.parse(fileContent);

    // Verify custom root property
    expect(jsonContent).toHaveProperty("customTest", true);

    // Verify document content is present
    expect(jsonContent.content).toHaveProperty("path/to/test/file.json");

    // Clean up test files
    fs.unlinkSync(customFilePath);
    fs.rmdirSync(customDir);
  });
});
