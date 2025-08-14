import { test, expect, describe, beforeEach, afterEach, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { TextDocument } from "vscode-languageserver-textdocument";
import {
  ReferenceAssetsWebPluginManifest,
  Types,
} from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "@player-tools/json-language-service";
import { Diagnostic } from "vscode-languageserver-types";

import { MetricsOutput } from "..";
import { extractFromDiagnostics, extractByData } from "../utils";
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
          timestamp: new Date().toISOString(),
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
            return !diagnostics.some(
              (d: { severity: number }) => d.severity === 2,
            );
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

    const service = new PlayerLanguageService();

    // Add complexity check plugin first
    service.addLSPPlugin(
      new ComplexityCheck({
        maxAcceptableComplexity: 60,
      }),
    );

    // Add metrics output plugin with custom config
    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: customDir,
        fileName: customFileName,
        rootProperties: {
          customTest: true,
        },
      }),
    );

    await service.setAssetTypesFromModule([
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

    await service.validateTextDocument(document);

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

  test("function-based rootProperties work correctly", async () => {
    const service = new PlayerLanguageService();

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "function_based",
        rootProperties: (diagnostics, context) => ({
          generatedAt: new Date().toISOString(),
          documentUri: context.document.uri,
          diagnosticCount: diagnostics.length,
        }),
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const document = TextDocument.create(
      "function/based/test.json",
      "json",
      1,
      JSON.stringify({ id: "test" }),
    );

    await service.validateTextDocument(document);

    const outputPath = path.join(TEST_DIR, "function_based.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(content).toHaveProperty("generatedAt");
    expect(content).toHaveProperty("documentUri", "function/based/test.json");
    expect(content).toHaveProperty("diagnosticCount");

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test("function-based rootProperties that returns a non-object", async () => {
    const service = new PlayerLanguageService();

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "non_object",
        rootProperties: () => "This should be wrapped in an object",
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const document = TextDocument.create(
      "non/object/test.json",
      "json",
      1,
      JSON.stringify({ id: "test" }),
    );

    await service.validateTextDocument(document);

    const outputPath = path.join(TEST_DIR, "non_object.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(content).toHaveProperty(
      "dynamicRootValue",
      "This should be wrapped in an object",
    );

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test("function-based stats work correctly", async () => {
    const service = new PlayerLanguageService();

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "stats_function",
        stats: (diagnostics) => ({
          totalDiagnostics: diagnostics.length,
          errors: diagnostics.filter(
            (d: { severity: number }) => d.severity === 1,
          ).length,
          warnings: diagnostics.filter(
            (d: { severity: number }) => d.severity === 2,
          ).length,
          timestamp: new Date().toISOString(),
        }),
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const document = TextDocument.create(
      "stats/function/test.json",
      "json",
      1,
      JSON.stringify({ id: "test" }),
    );

    await service.validateTextDocument(document);

    const outputPath = path.join(TEST_DIR, "stats_function.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(content.content["stats/function/test.json"].stats).toHaveProperty(
      "totalDiagnostics",
    );
    expect(content.content["stats/function/test.json"].stats).toHaveProperty(
      "errors",
    );
    expect(content.content["stats/function/test.json"].stats).toHaveProperty(
      "warnings",
    );
    expect(content.content["stats/function/test.json"].stats).toHaveProperty(
      "timestamp",
    );

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test("function-based features work correctly", async () => {
    const service = new PlayerLanguageService();

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "features_function",
        features: () => ({
          hasNavigation: true,
          hasCustomAssets: false,
          supportsMobile: true,
        }),
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const document = TextDocument.create(
      "features/function/test.json",
      "json",
      1,
      JSON.stringify({ id: "test" }),
    );

    await service.validateTextDocument(document);

    const outputPath = path.join(TEST_DIR, "features_function.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(
      content.content["features/function/test.json"].features,
    ).toHaveProperty("hasNavigation", true);
    expect(
      content.content["features/function/test.json"].features,
    ).toHaveProperty("hasCustomAssets", false);
    expect(
      content.content["features/function/test.json"].features,
    ).toHaveProperty("supportsMobile", true);

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test("extractFromDiagnostics handles parsing errors", () => {
    const diagnostics: Diagnostic[] = [
      {
        message: "Content complexity is invalid",
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        severity: 1,
      },
    ];

    const extractor = extractFromDiagnostics(
      /Content complexity is (\w+)/,
      (value) => parseInt(value, 10), // This will fail for "invalid"
    );

    // Mock console.warn to verify it's called
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = extractor(diagnostics);

    expect(result).toBeUndefined();
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain(
      "Failed to parse diagnostic value",
    );

    warnSpy.mockRestore();
  });

  test("extractByData with custom parser", () => {
    const CUSTOM_DATA = Symbol("custom-data");

    const diagnostics: Diagnostic[] = [
      {
        message: "42",
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        severity: 1,
        data: CUSTOM_DATA,
      },
      {
        message: "84",
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 0 },
        },
        severity: 1,
        data: CUSTOM_DATA,
      },
    ];

    // Custom parser that doubles the numeric value in the message
    const customParser = (diagnostic: Diagnostic) => {
      const value = parseInt(diagnostic.message, 10);
      return { value: value * 2 };
    };

    const result = extractByData(CUSTOM_DATA, diagnostics, customParser);

    expect(result).toEqual({ value: 168 }); // Last value overwrites previous ones
  });

  test("extractByData with non-object parser result", () => {
    const CUSTOM_DATA = Symbol("string-data");

    const diagnostics: Diagnostic[] = [
      {
        message: "first",
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        severity: 1,
        data: CUSTOM_DATA,
      },
      {
        message: "second",
        range: {
          start: { line: 1, character: 0 },
          end: { line: 1, character: 0 },
        },
        severity: 1,
        data: CUSTOM_DATA,
      },
    ];

    // Parser that returns a string
    const stringParser = (diagnostic: Diagnostic) => diagnostic.message;

    const result = extractByData(CUSTOM_DATA, diagnostics, stringParser);

    expect(result).toHaveProperty("entry_0", "first");
    expect(result).toHaveProperty("entry_1", "second");
  });

  test("extractByData handles parser errors", () => {
    const ERROR_DATA = Symbol("error-data");

    const diagnostics: Diagnostic[] = [
      {
        message: "This will cause an error",
        range: {
          start: { line: 0, character: 0 },
          end: { line: 0, character: 0 },
        },
        severity: 1,
        data: ERROR_DATA,
      },
    ];

    // Parser that throws an error
    const errorParser = () => {
      throw new Error("Test error");
    };

    // Mock console.warn to verify it's called
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = extractByData(ERROR_DATA, diagnostics, errorParser);

    expect(result).toEqual({}); // Should return empty object on error
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toContain(
      "Failed to process diagnostic from data",
    );

    warnSpy.mockRestore();
  });

  test("evaluateValue handles errors in metric functions", async () => {
    const service = new PlayerLanguageService();

    // Add a plugin with a function that throws an error
    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "error_metrics",
        stats: {
          errorMetric: () => {
            throw new Error("Test error in metric function");
          },
        },
      }),
    );

    // Mock console.error to verify it's called
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const document = TextDocument.create(
      "error/test.json",
      "json",
      1,
      JSON.stringify({ id: "test" }),
    );

    await service.validateTextDocument(document);

    const outputPath = path.join(TEST_DIR, "error_metrics.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));
    expect(content.content["error/test.json"].stats.errorMetric).toHaveProperty(
      "error",
      "Value evaluation failed: Error: Test error in metric function",
    );

    expect(errorSpy).toHaveBeenCalled();

    // Clean up
    fs.unlinkSync(outputPath);
    errorSpy.mockRestore();
  });

  test("handles fileName with .json extension", async () => {
    const service = new PlayerLanguageService();

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "with_extension.json", // Explicitly include .json
      }),
    );

    const document = TextDocument.create(
      "extension/test.json",
      "json",
      1,
      JSON.stringify({ id: "test" }),
    );

    await service.validateTextDocument(document);

    // Should strip the extension and use the base name
    const outputPath = path.join(TEST_DIR, "with_extension.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test("normalizes file paths with file:// protocol", async () => {
    const service = new PlayerLanguageService();

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "path_normalization",
      }),
    );

    // Create a document with file:// protocol in URI
    const document = TextDocument.create(
      "file:///path/to/normalized/test.json",
      "json",
      1,
      JSON.stringify({ id: "test" }),
    );

    await service.validateTextDocument(document);

    const outputPath = path.join(TEST_DIR, "path_normalization.json");
    expect(fs.existsSync(outputPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(outputPath, "utf-8"));

    // Should have normalized the path by removing file:// protocol
    expect(content.content).toHaveProperty("/path/to/normalized/test.json");

    // Clean up
    fs.unlinkSync(outputPath);
  });

  test("rootProperties function error is handled and recorded", async () => {
    const service = new PlayerLanguageService();

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: TEST_DIR,
        fileName: "rootprops_error",
        rootProperties: () => {
          throw new Error("boom");
        },
        stats: { ok: 1 },
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const doc = TextDocument.create("file:///err.json", "json", 1, "{}");
    await service.validateTextDocument(doc);

    const out = path.join(TEST_DIR, "rootprops_error.json");
    expect(fs.existsSync(out)).toBe(true);

    const json = JSON.parse(fs.readFileSync(out, "utf-8"));
    // The catch assigns an error object at the root
    expect(json).toHaveProperty("error");
    expect(json.content).toHaveProperty("/err.json");

    fs.unlinkSync(out);
  });

  test("defaults outputDir to process.cwd()", async () => {
    const service = new PlayerLanguageService();
    const tempDir = path.resolve("target_default");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tempDir);

    service.addLSPPlugin(
      new MetricsOutput({
        // no outputDir on purpose
        fileName: "default_dir",
        stats: { a: 1 },
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const doc = TextDocument.create("file:///default.json", "json", 1, "{}");
    await service.validateTextDocument(doc);

    const out = path.join(tempDir, "default_dir.json");
    expect(fs.existsSync(out)).toBe(true);

    // cleanup
    fs.unlinkSync(out);
    fs.rmdirSync(tempDir);
    cwdSpy.mockRestore();
  });

  test("defaults fileName to 'metrics' when omitted", async () => {
    const service = new PlayerLanguageService();
    const tempDir = path.resolve("target_default_name");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: tempDir, // no fileName on purpose
        stats: { a: 1 },
      }),
    );

    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const doc = TextDocument.create(
      "file:///default-name.json",
      "json",
      1,
      "{}",
    );
    await service.validateTextDocument(doc);

    expect(fs.existsSync(path.join(tempDir, "metrics.json"))).toBe(true);

    fs.unlinkSync(path.join(tempDir, "metrics.json"));
    fs.rmdirSync(tempDir);
  });

  test("treats valid non-object existing metrics as empty", async () => {
    const dir = path.resolve("target_non_object");
    const name = "preexisting_non_object";
    const outPath = path.join(dir, `${name}.json`);
    fs.mkdirSync(dir, { recursive: true });

    // Seed a valid JSON that is NOT an object → hits the else branch (': {}')
    fs.writeFileSync(outPath, "123", "utf-8"); // could also be "true", "\"str\"", or "null"

    const service = new PlayerLanguageService();
    service.addLSPPlugin(
      new MetricsOutput({
        outputDir: dir,
        fileName: name,
        stats: { metric: 42 },
      }),
    );
    await service.setAssetTypesFromModule([
      Types,
      ReferenceAssetsWebPluginManifest,
    ]);

    const doc = TextDocument.create("file:///x.json", "json", 1, "{}");
    await service.validateTextDocument(doc);

    const json = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    expect(json.content["/x.json"].stats.metric).toBe(42);
    // No root pulled from preexisting since it wasn't an object
    fs.unlinkSync(outPath);
    fs.rmdirSync(dir);
  });

  describe("Re-running validation", () => {
    const MULTI_TEST_DIR = path.resolve("target_multi");
    const MULTI_TEST_FILE = "multi_metrics.json";
    const MULTI_TEST_PATH = path.join(MULTI_TEST_DIR, MULTI_TEST_FILE);

    beforeEach(() => {
      // Create test directory for multi-validation tests
      if (!fs.existsSync(MULTI_TEST_DIR)) {
        fs.mkdirSync(MULTI_TEST_DIR, { recursive: true });
      }
    });

    afterEach(() => {
      // Clean up test files
      try {
        if (fs.existsSync(MULTI_TEST_PATH)) {
          fs.unlinkSync(MULTI_TEST_PATH);
        }
        if (fs.existsSync(MULTI_TEST_DIR)) {
          fs.rmdirSync(MULTI_TEST_DIR);
        }
      } catch (e) {
        console.debug("Test cleanup failed, but tests may still be valid:", e);
      }
    });

    test("Auto-append: creates new file if none exists", async () => {
      // Ensure no existing file
      if (fs.existsSync(MULTI_TEST_PATH)) {
        fs.unlinkSync(MULTI_TEST_PATH);
      }

      // Create service
      const service = new PlayerLanguageService();
      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: MULTI_TEST_DIR,
          fileName: MULTI_TEST_FILE.replace(".json", ""),
          stats: {
            complexity: () => 20,
          },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      // Validate a document
      const doc = TextDocument.create("file:///new.json", "json", 1, "{}");
      await service.validateTextDocument(doc);

      // Check that new file was created
      const result = JSON.parse(fs.readFileSync(MULTI_TEST_PATH, "utf-8"));
      expect(result.content).toHaveProperty("/new.json");
      expect(result.content["/new.json"].stats.complexity).toBe(20);
    });

    test("Auto-append: if metrics.json exists, new file entries are appended and existing ones are preserved", async () => {
      // Seed an existing metrics file (what already exists on disk)
      const existingMetrics = {
        content: {
          "/stage1.json": {
            stats: { complexity: 10 },
            features: { stable: true },
          },
        },
        timestamp: "stage1-timestamp",
      };
      fs.writeFileSync(MULTI_TEST_PATH, JSON.stringify(existingMetrics));

      // Create service that will add a new file entry
      const service = new PlayerLanguageService();
      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: MULTI_TEST_DIR,
          fileName: MULTI_TEST_FILE.replace(".json", ""),
          stats: {
            complexity: () => 20,
          },
          features: {
            stable: () => false,
          },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      // Validate a different document to trigger append
      const doc = TextDocument.create("file:///stage2.json", "json", 1, "{}");
      await service.validateTextDocument(doc);

      // The resulting content should have the union of file entries with their respective data
      const result = JSON.parse(fs.readFileSync(MULTI_TEST_PATH, "utf-8"));
      expect(result.content).toEqual({
        "/stage1.json": {
          stats: { complexity: 10 },
          features: { stable: true },
        },
        "/stage2.json": {
          stats: { complexity: 20 },
          features: { stable: false },
        },
      });
    });

    test("Auto-append: root properties are preserved and new ones appended when file exists", async () => {
      // Existing file with root metadata
      const existingMetrics = {
        content: {
          "/stage1.json": { stats: { metric: 1 } },
        },
        root: {
          metadata: {
            project: { name: "metrics-service" },
          },
        },
      };
      fs.writeFileSync(MULTI_TEST_PATH, JSON.stringify(existingMetrics));

      const service = new PlayerLanguageService();
      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: MULTI_TEST_DIR,
          fileName: MULTI_TEST_FILE.replace(".json", ""),
          rootProperties: {
            root: {
              metadata: { project: { version: "1.0.0" } },
              build: { ci: true },
            },
          },
          stats: { metric: () => 42 },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      // Validate a document to trigger write
      const doc = TextDocument.create("file:///stage2.json", "json", 1, "{}");
      await service.validateTextDocument(doc);

      const result = JSON.parse(fs.readFileSync(MULTI_TEST_PATH, "utf-8"));

      // Root properties merge (preserve existing, append new)
      expect(result.root.metadata.project).toEqual(
        expect.objectContaining({ name: "metrics-service", version: "1.0.0" }),
      );
      expect(result.root.build).toEqual(expect.objectContaining({ ci: true }));

      // Content includes both files with their own stats
      expect(result.content).toHaveProperty("/stage1.json");
      expect(result.content["/stage1.json"].stats.metric).toBe(1);
      expect(result.content).toHaveProperty("/stage2.json");
      expect(result.content["/stage2.json"].stats.metric).toBe(42);
    });

    test("Auto-append:loads existing metrics and merges", async () => {
      const service = new PlayerLanguageService();
      const dir = path.resolve("target_existing_ok");
      const name = "preexisting_ok";
      const outPath = path.join(dir, `${name}.json`);

      fs.mkdirSync(dir, { recursive: true });
      // Seed a valid JSON object so parsed && typeof parsed === "object" is true
      fs.writeFileSync(
        outPath,
        JSON.stringify(
          {
            root: true,
            content: {
              "/seed.json": { stats: { seeded: 1 } },
            },
          },
          null,
          2,
        ),
        "utf-8",
      );

      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: dir,
          fileName: name, // matches the seeded file
          stats: { added: 2 },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      const doc = TextDocument.create("file:///seed.json", "json", 1, "{}");
      await service.validateTextDocument(doc);

      const json = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      expect(json.root).toBe(true); // came from existing file
      expect(json.content["/seed.json"].stats).toMatchObject({
        seeded: 1,
        added: 2,
      });

      fs.unlinkSync(outPath);
      fs.rmdirSync(dir);
    });

    test("Deep merge: nested objects are merged (preserve existing, extend new) across runs", async () => {
      // Seed an existing metrics file with nested content and realistic root metadata
      const existingMetrics = {
        content: {
          "/nested.json": {
            stats: {
              metrics: { warnings: 1, byType: { deprecations: 1 } },
              nested: { x: 10 },
            },
          },
        },
        root: {
          metadata: {
            project: {
              name: "metrics-service",
              info: { repo: "tools" },
            },
          },
        },
      };
      fs.writeFileSync(MULTI_TEST_PATH, JSON.stringify(existingMetrics));

      // Create service which writes overlapping nested values
      const service = new PlayerLanguageService();
      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: MULTI_TEST_DIR,
          fileName: MULTI_TEST_FILE.replace(".json", ""),
          rootProperties: {
            root: {
              metadata: {
                project: { info: { branch: "main" } },
                build: { ci: true },
              },
            },
          },
          stats: {
            metrics: () => ({ warnings: 2, byType: { errors: 1 } }), // overwrite primitive and extend nested
            nested: () => ({ y: 20 }), // extend nested
          },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      // Validate a document to trigger write for the same file path
      const doc = TextDocument.create("file:///nested.json", "json", 1, "{}");
      await service.validateTextDocument(doc);

      // Verify deep merge result
      const result = JSON.parse(fs.readFileSync(MULTI_TEST_PATH, "utf-8"));
      expect(result.content["/nested.json"].stats).toEqual(
        expect.objectContaining({
          metrics: expect.objectContaining({
            warnings: 2,
            byType: expect.objectContaining({ deprecations: 1, errors: 1 }),
          }),
          nested: expect.objectContaining({ x: 10, y: 20 }),
        }),
      );
      expect(result.root.metadata.project.name).toBe("metrics-service");
      expect(result.root.metadata.project.info).toEqual(
        expect.objectContaining({ repo: "tools", branch: "main" }),
      );
      expect(result.root.metadata.build).toEqual(
        expect.objectContaining({ ci: true }),
      );
    });

    test("New root property on second run keeps content as last key", async () => {
      // First run writes initial root and first file entry
      const service1 = new PlayerLanguageService();
      service1.addLSPPlugin(
        new MetricsOutput({
          outputDir: MULTI_TEST_DIR,
          fileName: MULTI_TEST_FILE.replace(".json", ""),
          rootProperties: { initialRoot: true },
          stats: { metric: () => 1 },
        }),
      );

      await service1.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      const doc1 = TextDocument.create("file:///stage1.json", "json", 1, "{}");
      await service1.validateTextDocument(doc1);

      // Second run adds a new root property and a different file entry
      const service2 = new PlayerLanguageService();
      service2.addLSPPlugin(
        new MetricsOutput({
          outputDir: MULTI_TEST_DIR,
          fileName: MULTI_TEST_FILE.replace(".json", ""),
          rootProperties: { newRoot: true },
          stats: { metric: () => 2 },
        }),
      );

      await service2.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      const doc2 = TextDocument.create("file:///stage2.json", "json", 1, "{}");
      await service2.validateTextDocument(doc2);

      // Verify only that the last top-level key is "content"
      const parsed = JSON.parse(fs.readFileSync(MULTI_TEST_PATH, "utf-8"));
      const keys = Object.keys(parsed);
      expect(keys[keys.length - 1]).toBe("content");
    });

    test("merges with existing metrics file (root and content)", async () => {
      const service = new PlayerLanguageService();

      const fileName = "preexisting_merge";
      const outputPath = path.join(TEST_DIR, `${fileName}.json`);

      // Seed an existing metrics file with root and nested content
      fs.writeFileSync(
        outputPath,
        JSON.stringify(
          {
            rootKey: "keep-me",
            content: {
              "existing.json": {
                stats: { existingStat: 1 },
              },
            },
          },
          null,
          2,
        ),
        "utf-8",
      );

      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: TEST_DIR,
          fileName,
          rootProperties: { anotherRoot: true },
          stats: { newStat: 2 },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      const doc = TextDocument.create(
        "existing.json",
        "json",
        1,
        JSON.stringify({ id: "ok" }),
      );
      await service.validateTextDocument(doc);

      expect(fs.existsSync(outputPath)).toBe(true);
      const parsed = JSON.parse(fs.readFileSync(outputPath, "utf-8"));

      // Root deep-merged
      expect(parsed.rootKey).toBe("keep-me");
      expect(parsed.anotherRoot).toBe(true);

      // Content deep-merged for same file
      expect(parsed.content["existing.json"].stats).toMatchObject({
        existingStat: 1,
        newStat: 2,
      });

      fs.unlinkSync(outputPath);
    });

    test("Gracefully handles malformed existing metrics file and logs warning", async () => {
      // Seed an invalid JSON metrics file to trigger the parse error path
      fs.writeFileSync(MULTI_TEST_PATH, "{ invalid-json ");

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const service = new PlayerLanguageService();
      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: MULTI_TEST_DIR,
          fileName: MULTI_TEST_FILE.replace(".json", ""),
          stats: { metric: () => 99 },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);

      const doc = TextDocument.create(
        "file:///malformed.json",
        "json",
        1,
        "{}",
      );
      await service.validateTextDocument(doc);

      // Should log a parse warning and still produce a valid metrics file
      expect(warnSpy).toHaveBeenCalled();
      const args = warnSpy.mock.calls[0][0] as string;
      expect(args).toContain("Could not parse existing metrics file");

      const parsed = JSON.parse(fs.readFileSync(MULTI_TEST_PATH, "utf-8"));
      // normalizePath removes file:// and backslashes; our test doc uses file:///malformed.json
      expect(parsed.content).toHaveProperty("/malformed.json");
      expect(parsed.content["/malformed.json"].stats.metric).toBe(99);

      warnSpy.mockRestore();
    });

    test("loads and merges an existing metrics file", async () => {
      const service = new PlayerLanguageService();
      const fileName = "pre_merge";
      const outPath = path.join(TEST_DIR, `${fileName}.json`);

      // Seed a valid existing metrics file
      fs.writeFileSync(
        outPath,
        JSON.stringify(
          {
            rootKey: "keep",
            content: {
              "/pre.json": { stats: { preStat: 1 } },
            },
          },
          null,
          2,
        ),
        "utf-8",
      );

      service.addLSPPlugin(
        new MetricsOutput({
          outputDir: TEST_DIR,
          fileName,
          stats: { newStat: 2 },
        }),
      );

      await service.setAssetTypesFromModule([
        Types,
        ReferenceAssetsWebPluginManifest,
      ]);
      const doc = TextDocument.create("file:///pre.json", "json", 1, "{}");
      await service.validateTextDocument(doc);

      const json = JSON.parse(fs.readFileSync(outPath, "utf-8"));
      expect(json.rootKey).toBe("keep"); // came from existing file
      expect(json.content["/pre.json"].stats).toMatchObject({
        preStat: 1,
        newStat: 2,
      });

      fs.unlinkSync(outPath);
    });
  });
});
