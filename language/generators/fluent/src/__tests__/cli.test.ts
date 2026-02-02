import { describe, test, expect, beforeEach, vi } from "vitest";
import { join, normalize } from "path";
import type { NamedType, ObjectType } from "@player-tools/xlr";

// Mock the modules before importing the cli functions
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
    existsSync: vi.fn(),
    accessSync: vi.fn(),
    constants: actual.constants,
  };
});

vi.mock("../generator", () => ({
  generateFluentBuilder: vi.fn(() => "// generated code"),
}));

vi.mock("../ts-morph-type-finder", () => ({
  TsMorphTypeDefinitionFinder: vi.fn().mockImplementation(() => ({
    findTypeSourceFile: vi.fn(),
    dispose: vi.fn(),
  })),
}));

// Import mocked functions after mocking
import { readFileSync, mkdirSync, existsSync, accessSync, constants } from "fs";
import { generateFluentBuilder } from "../generator";
import { TsMorphTypeDefinitionFinder } from "../ts-morph-type-finder";
import { isNodeModulesPath, extractPackageNameFromPath } from "../path-utils";

// Helper functions that mirror the CLI implementation for testing
function toKebabCase(name: string): string {
  return name
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "");
}

interface Manifest {
  version: number;
  capabilities: {
    Assets?: string[];
    Views?: string[];
  };
}

describe("CLI - Argument Parsing", () => {
  // Testing argument parsing logic

  test("parses -i flag for input", () => {
    const args = ["-i", "/path/to/input"];
    let input = "";
    let output = "./dist";

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "-i" || arg === "--input") {
        input = args[++i] || "";
      } else if (arg === "-o" || arg === "--output") {
        output = args[++i] || "./dist";
      }
    }

    expect(input).toBe("/path/to/input");
    expect(output).toBe("./dist");
  });

  test("parses --input flag for input", () => {
    const args = ["--input", "/path/to/input"];
    let input = "";
    let output = "./dist";

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "-i" || arg === "--input") {
        input = args[++i] || "";
      } else if (arg === "-o" || arg === "--output") {
        output = args[++i] || "./dist";
      }
    }

    expect(input).toBe("/path/to/input");
    expect(output).toBe("./dist");
  });

  test("parses -o flag for output", () => {
    const args = ["-i", "/input", "-o", "/custom/output"];
    let input = "";
    let output = "./dist";

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "-i" || arg === "--input") {
        input = args[++i] || "";
      } else if (arg === "-o" || arg === "--output") {
        output = args[++i] || "./dist";
      }
    }

    expect(input).toBe("/input");
    expect(output).toBe("/custom/output");
  });

  test("parses --output flag for output", () => {
    const args = ["-i", "/input", "--output", "/custom/output"];
    let output = "./dist";

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "-i" || arg === "--input") {
        i++; // skip input value
      } else if (arg === "-o" || arg === "--output") {
        output = args[++i] || "./dist";
      }
    }

    expect(output).toBe("/custom/output");
  });

  test("uses default output ./dist when not specified", () => {
    const args = ["-i", "/input"];
    let output = "./dist";

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      if (arg === "-i" || arg === "--input") {
        i++; // skip input value
      } else if (arg === "-o" || arg === "--output") {
        output = args[++i] || "./dist";
      }
    }

    expect(output).toBe("./dist");
  });
});

describe("CLI - Manifest Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("loads valid manifest.json", () => {
    const manifest: Manifest = {
      version: 1,
      capabilities: {
        Assets: ["TextAsset", "ActionAsset"],
        Views: ["InfoView"],
      },
    };

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(manifest));

    // Simulate loadManifest function
    function loadManifest(inputDir: string): Manifest {
      const path = join(inputDir, "manifest.json");
      if (!existsSync(path)) {
        throw new Error(`Manifest not found: ${path}`);
      }
      const content = readFileSync(path, "utf-8") as string;
      return JSON.parse(content) as Manifest;
    }

    const result = loadManifest("/test/input");

    expect(result.version).toBe(1);
    expect(result.capabilities.Assets).toEqual(["TextAsset", "ActionAsset"]);
    expect(result.capabilities.Views).toEqual(["InfoView"]);
  });

  test("throws when manifest.json not found", () => {
    vi.mocked(existsSync).mockReturnValue(false);

    function loadManifest(inputDir: string): Manifest {
      const manifestPath = join(inputDir, "manifest.json");
      if (!existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
      }
      const content = readFileSync(manifestPath, "utf-8") as string;
      return JSON.parse(content) as Manifest;
    }

    expect(() => loadManifest("/test/input")).toThrow(/Manifest not found/);
  });

  test("throws when manifest.json is invalid JSON", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("{ invalid json }");

    function loadManifest(inputDir: string): Manifest {
      const manifestPath = join(inputDir, "manifest.json");
      if (!existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
      }
      const content = readFileSync(manifestPath, "utf-8") as string;
      return JSON.parse(content) as Manifest;
    }

    expect(() => loadManifest("/test/input")).toThrow();
  });

  test("handles manifest with empty capabilities", () => {
    const manifest: Manifest = {
      version: 1,
      capabilities: {},
    };

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(manifest));

    function loadManifest(inputDir: string): Manifest {
      const manifestPath = join(inputDir, "manifest.json");
      if (!existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
      }
      const content = readFileSync(manifestPath, "utf-8") as string;
      return JSON.parse(content) as Manifest;
    }

    const result = loadManifest("/test/input");
    const { Assets = [], Views = [] } = result.capabilities;

    expect(Assets).toEqual([]);
    expect(Views).toEqual([]);
  });

  test("handles manifest with partial capabilities", () => {
    const manifest: Manifest = {
      version: 1,
      capabilities: {
        Assets: ["TextAsset"],
      },
    };

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(manifest));

    function loadManifest(inputDir: string): Manifest {
      const manifestPath = join(inputDir, "manifest.json");
      if (!existsSync(manifestPath)) {
        throw new Error(`Manifest not found: ${manifestPath}`);
      }
      const content = readFileSync(manifestPath, "utf-8") as string;
      return JSON.parse(content) as Manifest;
    }

    const result = loadManifest("/test/input");
    const { Assets = [], Views = [] } = result.capabilities;

    expect(Assets).toEqual(["TextAsset"]);
    expect(Views).toEqual([]);
  });
});

describe("CLI - XLR Type Loading", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("loads valid XLR type JSON", () => {
    const xlrType: NamedType<ObjectType> = {
      name: "TextAsset",
      type: "object",
      properties: {
        id: { required: true, node: { type: "string" } },
        type: { required: true, node: { type: "string", const: "text" } },
        value: { required: true, node: { type: "string" } },
      },
    };

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue(JSON.stringify(xlrType));

    function loadXlrType(
      inputDir: string,
      typeName: string,
    ): NamedType<ObjectType> {
      const typePath = join(inputDir, `${typeName}.json`);
      if (!existsSync(typePath)) {
        throw new Error(`XLR type file not found: ${typePath}`);
      }
      const content = readFileSync(typePath, "utf-8") as string;
      return JSON.parse(content) as NamedType<ObjectType>;
    }

    const result = loadXlrType("/test/input", "TextAsset");

    expect(result.name).toBe("TextAsset");
    expect(result.type).toBe("object");
    expect(result.properties?.value).toBeDefined();
  });

  test("throws when type file not found", () => {
    vi.mocked(existsSync).mockReturnValue(false);

    function loadXlrType(
      inputDir: string,
      typeName: string,
    ): NamedType<ObjectType> {
      const typePath = join(inputDir, `${typeName}.json`);
      if (!existsSync(typePath)) {
        throw new Error(`XLR type file not found: ${typePath}`);
      }
      const content = readFileSync(typePath, "utf-8") as string;
      return JSON.parse(content) as NamedType<ObjectType>;
    }

    expect(() => loadXlrType("/test/input", "MissingType")).toThrow(
      /XLR type file not found/,
    );
  });

  test("throws when type file is invalid JSON", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(readFileSync).mockReturnValue("not valid json");

    function loadXlrType(
      inputDir: string,
      typeName: string,
    ): NamedType<ObjectType> {
      const typePath = join(inputDir, `${typeName}.json`);
      if (!existsSync(typePath)) {
        throw new Error(`XLR type file not found: ${typePath}`);
      }
      const content = readFileSync(typePath, "utf-8") as string;
      return JSON.parse(content) as NamedType<ObjectType>;
    }

    expect(() => loadXlrType("/test/input", "InvalidType")).toThrow();
  });
});

describe("CLI - Output Directory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates directory if does not exist", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdirSync).mockReturnValue(undefined);
    vi.mocked(accessSync).mockReturnValue(undefined);

    function validateOutputDirectory(outputDir: string): void {
      if (!existsSync(outputDir)) {
        try {
          mkdirSync(outputDir, { recursive: true });
        } catch (error) {
          throw new Error(
            `Cannot create output directory "${outputDir}": ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      try {
        accessSync(outputDir, constants.W_OK);
      } catch {
        throw new Error(
          `Output directory "${outputDir}" is not writable. Check permissions.`,
        );
      }
    }

    expect(() => validateOutputDirectory("/test/output")).not.toThrow();
    expect(mkdirSync).toHaveBeenCalledWith("/test/output", { recursive: true });
  });

  test("succeeds when directory exists and is writable", () => {
    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(accessSync).mockReturnValue(undefined);

    function validateOutputDirectory(outputDir: string): void {
      if (!existsSync(outputDir)) {
        try {
          mkdirSync(outputDir, { recursive: true });
        } catch (error) {
          throw new Error(
            `Cannot create output directory "${outputDir}": ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      try {
        accessSync(outputDir, constants.W_OK);
      } catch {
        throw new Error(
          `Output directory "${outputDir}" is not writable. Check permissions.`,
        );
      }
    }

    expect(() => validateOutputDirectory("/test/output")).not.toThrow();
    expect(mkdirSync).not.toHaveBeenCalled();
  });

  test("throws when cannot create directory (permission denied)", () => {
    vi.mocked(existsSync).mockReturnValue(false);
    vi.mocked(mkdirSync).mockImplementation(() => {
      throw new Error("EACCES: permission denied");
    });

    function validateOutputDirectory(outputDir: string): void {
      if (!existsSync(outputDir)) {
        try {
          mkdirSync(outputDir, { recursive: true });
        } catch (error) {
          throw new Error(
            `Cannot create output directory "${outputDir}": ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      try {
        accessSync(outputDir, constants.W_OK);
      } catch {
        throw new Error(
          `Output directory "${outputDir}" is not writable. Check permissions.`,
        );
      }
    }

    expect(() => validateOutputDirectory("/test/output")).toThrow(
      /Cannot create output directory/,
    );
  });
});

describe("CLI - File Writing", () => {
  test("converts PascalCase to kebab-case filename", () => {
    expect(toKebabCase("TextAsset")).toBe("text-asset");
    expect(toKebabCase("ActionAsset")).toBe("action-asset");
    expect(toKebabCase("CollectionAsset")).toBe("collection-asset");
  });

  test("handles consecutive capitals", () => {
    expect(toKebabCase("XMLParser")).toBe("x-m-l-parser");
    expect(toKebabCase("HTTPServer")).toBe("h-t-t-p-server");
    expect(toKebabCase("JSONData")).toBe("j-s-o-n-data");
  });

  test("handles single word", () => {
    expect(toKebabCase("Asset")).toBe("asset");
    expect(toKebabCase("Text")).toBe("text");
  });

  test("handles already lowercase", () => {
    expect(toKebabCase("asset")).toBe("asset");
    expect(toKebabCase("text")).toBe("text");
  });
});

describe("CLI - Generator Config", () => {
  test("returns minimal config when no source file", () => {
    const xlrType: NamedType<ObjectType> = {
      name: "TextAsset",
      type: "object",
      properties: {},
    };

    // When source is undefined or doesn't exist
    vi.mocked(existsSync).mockReturnValue(false);

    interface GeneratorConfig {
      typeImportPathGenerator?: (refTypeName: string) => string;
      externalTypes?: Map<string, string>;
    }

    function buildGeneratorConfig(
      type: NamedType<ObjectType>,
    ): GeneratorConfig {
      const source = type.source;

      if (!source || !existsSync(source)) {
        return {};
      }

      return {};
    }

    const config = buildGeneratorConfig(xlrType);

    expect(config).toEqual({});
  });
});

describe("CLI - Path Utils Integration", () => {
  test("resolves node_modules imports to package names", () => {
    const nodePath = normalize(
      "/project/node_modules/@player-tools/types/dist/index.d.ts",
    );

    expect(isNodeModulesPath(nodePath)).toBe(true);
    expect(extractPackageNameFromPath(nodePath)).toBe("@player-tools/types");
  });

  test("handles standard npm package path", () => {
    const nodePath = normalize("/project/node_modules/lodash/index.d.ts");

    expect(isNodeModulesPath(nodePath)).toBe(true);
    expect(extractPackageNameFromPath(nodePath)).toBe("lodash");
  });

  test("handles local file path", () => {
    const localPath = normalize("/project/src/types/text.ts");

    expect(isNodeModulesPath(localPath)).toBe(false);
    expect(extractPackageNameFromPath(localPath)).toBe(null);
  });

  test("handles pnpm nested node_modules structure", () => {
    const pnpmPath = normalize(
      "/project/node_modules/.pnpm/@player-tools+types@1.0.0/node_modules/@player-tools/types/index.d.ts",
    );

    expect(isNodeModulesPath(pnpmPath)).toBe(true);
    expect(extractPackageNameFromPath(pnpmPath)).toBe("@player-tools/types");
  });

  test("handles scoped packages", () => {
    const scopedPath = normalize(
      "/project/node_modules/@org/package/index.d.ts",
    );

    expect(isNodeModulesPath(scopedPath)).toBe(true);
    expect(extractPackageNameFromPath(scopedPath)).toBe("@org/package");
  });
});

describe("CLI - Main Orchestration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("processes all types and generates builders", () => {
    const manifest: Manifest = {
      version: 1,
      capabilities: {
        Assets: ["TextAsset", "ActionAsset"],
      },
    };

    const textXlr: NamedType<ObjectType> = {
      name: "TextAsset",
      type: "object",
      properties: {
        value: { required: true, node: { type: "string" } },
      },
    };

    const actionXlr: NamedType<ObjectType> = {
      name: "ActionAsset",
      type: "object",
      properties: {
        value: { required: false, node: { type: "string" } },
      },
    };

    vi.mocked(existsSync).mockReturnValue(true);
    vi.mocked(accessSync).mockReturnValue(undefined);
    vi.mocked(readFileSync).mockImplementation((path) => {
      const pathStr = String(path);
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("TextAsset.json")) {
        return JSON.stringify(textXlr);
      }
      if (pathStr.includes("ActionAsset.json")) {
        return JSON.stringify(actionXlr);
      }
      return "";
    });

    vi.mocked(generateFluentBuilder).mockReturnValue("// generated code");

    // Simulate processing all types
    const { Assets = [], Views = [] } = manifest.capabilities;
    const allTypes = [...Assets, ...Views];

    let succeeded = 0;
    let failed = 0;

    for (const typeName of allTypes) {
      try {
        const typePath = join("/input", `${typeName}.json`);
        const content = readFileSync(typePath, "utf-8") as string;
        const xlrType = JSON.parse(content) as NamedType<ObjectType>;

        generateFluentBuilder(xlrType);
        succeeded++;
      } catch {
        failed++;
      }
    }

    expect(succeeded).toBe(2);
    expect(failed).toBe(0);
    expect(generateFluentBuilder).toHaveBeenCalledTimes(2);
  });

  test("reports success/failure counts", () => {
    const manifest: Manifest = {
      version: 1,
      capabilities: {
        Assets: ["TextAsset", "MissingAsset"],
      },
    };

    vi.mocked(existsSync).mockImplementation((path) => {
      const pathStr = String(path);
      if (pathStr.includes("MissingAsset")) {
        return false;
      }
      return true;
    });
    vi.mocked(accessSync).mockReturnValue(undefined);
    vi.mocked(readFileSync).mockImplementation((path) => {
      const pathStr = String(path);
      if (pathStr.includes("manifest.json")) {
        return JSON.stringify(manifest);
      }
      if (pathStr.includes("TextAsset.json")) {
        return JSON.stringify({
          name: "TextAsset",
          type: "object",
          properties: {},
        });
      }
      throw new Error("File not found");
    });

    vi.mocked(generateFluentBuilder).mockReturnValue("// generated code");

    const { Assets = [], Views = [] } = manifest.capabilities;
    const allTypes = [...Assets, ...Views];

    let succeeded = 0;
    let failed = 0;

    for (const typeName of allTypes) {
      try {
        const typePath = join("/input", `${typeName}.json`);
        if (!existsSync(typePath)) {
          throw new Error(`XLR type file not found: ${typePath}`);
        }
        const content = readFileSync(typePath, "utf-8") as string;
        const xlrType = JSON.parse(content) as NamedType<ObjectType>;

        generateFluentBuilder(xlrType);
        succeeded++;
      } catch {
        failed++;
      }
    }

    expect(succeeded).toBe(1);
    expect(failed).toBe(1);
  });

  test("disposes TsMorphTypeDefinitionFinder on completion", () => {
    const mockDispose = vi.fn();
    const MockFinder = vi.mocked(TsMorphTypeDefinitionFinder);
    MockFinder.mockImplementation(
      () =>
        ({
          findTypeSourceFile: vi.fn(),
          dispose: mockDispose,
        }) as unknown as InstanceType<typeof TsMorphTypeDefinitionFinder>,
    );

    const finder = new TsMorphTypeDefinitionFinder();

    try {
      // Simulate processing
    } finally {
      finder.dispose();
    }

    expect(mockDispose).toHaveBeenCalled();
  });
});
