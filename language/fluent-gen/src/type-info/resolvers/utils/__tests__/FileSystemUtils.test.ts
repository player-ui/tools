import { test, expect, vi, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { FileSystemUtils } from "../FileSystemUtils.js";

// Mock fs module
vi.mock("fs", () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

const mockFs = vi.mocked(fs);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("resolves relative imports with .js extension to .ts", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "./utils.js",
    "/src/components/Button.ts",
  );

  expect(result).toBe(path.resolve("/src/components", "./utils.ts"));
});

test("resolves relative imports with .mjs extension to .ts", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "./helpers.mjs",
    "/src/lib/index.ts",
  );

  expect(result).toBe(path.resolve("/src/lib", "./helpers.ts"));
});

test("resolves relative imports with .jsx extension to .tsx", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "./Component.jsx",
    "/src/pages/Home.tsx",
  );

  expect(result).toBe(path.resolve("/src/pages", "./Component.tsx"));
});

test("adds .ts extension when no extension is present and .ts file exists", () => {
  mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
    return filePath.toString().endsWith(".ts");
  });

  const result = FileSystemUtils.resolveRelativeImport(
    "./utils",
    "/src/components/Button.ts",
  );

  expect(result).toBe(path.resolve("/src/components", "./utils.ts"));
  expect(mockFs.existsSync).toHaveBeenCalledWith(
    path.resolve("/src/components", "./utils.ts"),
  );
});

test("adds .tsx extension when no extension is present and .tsx file exists but .ts does not", () => {
  mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
    return filePath.toString().endsWith(".tsx");
  });

  const result = FileSystemUtils.resolveRelativeImport(
    "./Component",
    "/src/pages/Home.tsx",
  );

  expect(result).toBe(path.resolve("/src/pages", "./Component.tsx"));
  expect(mockFs.existsSync).toHaveBeenCalledWith(
    path.resolve("/src/pages", "./Component.ts"),
  );
  expect(mockFs.existsSync).toHaveBeenCalledWith(
    path.resolve("/src/pages", "./Component.tsx"),
  );
});

test("defaults to .ts extension when no extension is present and neither .ts nor .tsx exists", () => {
  mockFs.existsSync.mockReturnValue(false);

  const result = FileSystemUtils.resolveRelativeImport(
    "./missing",
    "/src/components/Button.ts",
  );

  expect(result).toBe(path.resolve("/src/components", "./missing.ts"));
});

test("preserves .ts extension when already present", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "./utils.ts",
    "/src/components/Button.ts",
  );

  expect(result).toBe(path.resolve("/src/components", "./utils.ts"));
});

test("preserves .tsx extension when already present", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "./Component.tsx",
    "/src/pages/Home.tsx",
  );

  expect(result).toBe(path.resolve("/src/pages", "./Component.tsx"));
});

test("handles nested relative paths", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "../shared/utils.js",
    "/src/components/forms/Input.ts",
  );

  expect(result).toBe(
    path.resolve("/src/components/forms", "../shared/utils.ts"),
  );
});

test("handles deep nested relative paths", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "../../lib/helpers.mjs",
    "/src/components/forms/fields/TextInput.ts",
  );

  expect(result).toBe(
    path.resolve("/src/components/forms/fields", "../../lib/helpers.ts"),
  );
});

test("finds node_modules in same directory", () => {
  mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
    return filePath.toString().includes("/project/node_modules");
  });

  const result = FileSystemUtils.findNodeModules(
    "/project/src/components/Button.ts",
  );

  expect(result).toBe("/project/node_modules");
});

test("finds node_modules in parent directory", () => {
  mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
    const pathStr = filePath.toString();
    return (
      pathStr === "/project/node_modules" ||
      pathStr === "\\project\\node_modules"
    );
  });

  const result = FileSystemUtils.findNodeModules(
    "/project/src/components/Button.ts",
  );

  expect(result).toBe("/project/node_modules");
});

test("finds node_modules in ancestor directory", () => {
  mockFs.existsSync.mockImplementation((filePath: fs.PathLike) => {
    const pathStr = filePath.toString();
    // Only return true for the /project/node_modules directory
    return pathStr === "/project/node_modules";
  });

  const result = FileSystemUtils.findNodeModules(
    "/project/src/deep/nested/components/Button.ts",
  );

  expect(result).toBe("/project/node_modules");
});

test("returns null when node_modules not found", () => {
  mockFs.existsSync.mockReturnValue(false);

  const result = FileSystemUtils.findNodeModules(
    "/project/src/components/Button.ts",
  );

  expect(result).toBeNull();
});

test("reads package.json with types field", () => {
  const mockPackageJson = {
    name: "test-package",
    version: "1.0.0",
    types: "dist/index.d.ts",
  };

  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

  const result = FileSystemUtils.readPackageJson("/node_modules/test-package");

  expect(result).toEqual(mockPackageJson);
  expect(mockFs.readFileSync).toHaveBeenCalledWith(
    "/node_modules/test-package/package.json",
    "utf-8",
  );
});

test("reads package.json with typings field", () => {
  const mockPackageJson = {
    name: "test-package",
    version: "1.0.0",
    typings: "lib/types.d.ts",
  };

  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue(JSON.stringify(mockPackageJson));

  const result = FileSystemUtils.readPackageJson("/node_modules/test-package");

  expect(result).toEqual(mockPackageJson);
});

test("returns null when package.json does not exist", () => {
  mockFs.existsSync.mockReturnValue(false);

  const result = FileSystemUtils.readPackageJson(
    "/node_modules/missing-package",
  );

  expect(result).toBeNull();
});

test("returns null when package.json is malformed JSON", () => {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockReturnValue("{ invalid json");

  const result = FileSystemUtils.readPackageJson(
    "/node_modules/broken-package",
  );

  expect(result).toBeNull();
});

test("handles readFileSync throwing error", () => {
  mockFs.existsSync.mockReturnValue(true);
  mockFs.readFileSync.mockImplementation(() => {
    throw new Error("Permission denied");
  });

  const result = FileSystemUtils.readPackageJson(
    "/node_modules/protected-package",
  );

  expect(result).toBeNull();
});

test("fileExists returns true when file exists", () => {
  mockFs.existsSync.mockReturnValue(true);

  const result = FileSystemUtils.fileExists("/path/to/file.ts");

  expect(result).toBe(true);
  expect(mockFs.existsSync).toHaveBeenCalledWith("/path/to/file.ts");
});

test("fileExists returns false when file does not exist", () => {
  mockFs.existsSync.mockReturnValue(false);

  const result = FileSystemUtils.fileExists("/path/to/missing.ts");

  expect(result).toBe(false);
});

test("fileExists returns false when existsSync throws error", () => {
  mockFs.existsSync.mockImplementation(() => {
    throw new Error("Access denied");
  });

  const result = FileSystemUtils.fileExists("/path/to/protected.ts");

  expect(result).toBe(false);
});

test("handles Windows-style paths in resolveRelativeImport", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    ".\\utils.js",
    "/project/src/components/Button.ts",
  );

  // The result should be normalized to the platform's path format
  expect(result).toBe(path.resolve("/project/src/components", ".\\utils.ts"));
});

test("handles mixed path separators", () => {
  const result = FileSystemUtils.resolveRelativeImport(
    "../shared\\utils.js",
    "/project/src/components/Button.ts",
  );

  expect(result).toBe(
    path.resolve("/project/src/components", "../shared\\utils.ts"),
  );
});

test("handles edge case with root directory", () => {
  mockFs.existsSync.mockReturnValue(false);

  const result = FileSystemUtils.findNodeModules("/file.ts");

  expect(result).toBeNull();
});

test("handles empty package paths", () => {
  const result = FileSystemUtils.readPackageJson("");

  expect(result).toBeNull();
});
