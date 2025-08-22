import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { Project } from "ts-morph";
import { ExternalModuleResolver } from "../ExternalModuleResolver.js";
import { FileSystemUtils } from "../../utils/FileSystemUtils.js";
import type { ModuleResolutionOptions } from "../../../types.js";

// Mock FileSystemUtils
vi.mock("../../utils/FileSystemUtils.js", () => ({
  FileSystemUtils: {
    findNodeModules: vi.fn(),
    readPackageJson: vi.fn(),
    fileExists: vi.fn(),
    resolveRelativeImport: vi.fn(),
  },
}));

const mockFileSystemUtils = vi.mocked(FileSystemUtils);

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

let resolver: ExternalModuleResolver;
let project: Project;

beforeEach(() => {
  project = createMockProject();
  resolver = new ExternalModuleResolver(project);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("resolves external module with types field in package.json", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  // Mock node_modules discovery
  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");

  // Mock package.json with types field
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    name: "test-lib",
    types: "dist/index.d.ts",
  });

  // Mock file existence
  mockFileSystemUtils.fileExists.mockReturnValue(true);

  // Create a mock declaration file
  project.createSourceFile(
    "/project/node_modules/test-lib/dist/index.d.ts",
    "export interface TestInterface { id: string; }",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "TestInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("module");
  expect(result!.target.name).toBe("test-lib");
  expect(result!.isLocal).toBe(false);
});

test("resolves external module with typings field in package.json", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    name: "test-lib",
    typings: "lib/types.d.ts",
  });
  mockFileSystemUtils.fileExists.mockReturnValue(true);

  project.createSourceFile(
    "/project/node_modules/test-lib/lib/types.d.ts",
    "export enum Status { Active = 'active', Inactive = 'inactive' }",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "Status",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("module");
  expect(result!.target.name).toBe("test-lib");
});

test("resolves external module using fallback locations", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue(null); // No package.json

  // Mock file existence checks for fallback locations
  mockFileSystemUtils.fileExists.mockImplementation((path: string) => {
    return path.includes("index.d.ts") && path.includes("/dist/");
  });

  project.createSourceFile(
    "/project/node_modules/test-lib/dist/index.d.ts",
    "export type UserId = string;",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "UserId",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("module");
});

test("returns null when node_modules not found", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue(null);

  const options: ModuleResolutionOptions = {
    symbolName: "TestInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeNull();
});

test("returns null when declaration file not found", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue(null);
  mockFileSystemUtils.fileExists.mockReturnValue(false); // No declaration files exist

  const options: ModuleResolutionOptions = {
    symbolName: "TestInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeNull();
});

test("returns null when symbol not found in declaration file", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    types: "index.d.ts",
  });
  mockFileSystemUtils.fileExists.mockReturnValue(true);

  // Create declaration file without the target symbol
  project.createSourceFile(
    "/project/node_modules/test-lib/index.d.ts",
    "export interface OtherInterface { name: string; }",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "NonExistentInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeNull();
});

test("resolves re-exported symbols", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    types: "index.d.ts",
  });
  mockFileSystemUtils.fileExists.mockReturnValue(true);
  mockFileSystemUtils.resolveRelativeImport.mockReturnValue(
    "/project/node_modules/test-lib/internal.d.ts",
  );

  // Main declaration file with re-export
  project.createSourceFile(
    "/project/node_modules/test-lib/index.d.ts",
    "export { ReexportedInterface } from './internal';",
  );

  // Internal file with actual declaration
  project.createSourceFile(
    "/project/node_modules/test-lib/internal.d.ts",
    "export interface ReexportedInterface { value: number; }",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "ReexportedInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("module");
  expect(result!.target.name).toBe("test-lib");
});

test("handles complex re-exports correctly", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    types: "index.d.ts",
  });
  mockFileSystemUtils.fileExists.mockReturnValue(true);

  // Main declaration file with external re-export that cannot be resolved
  project.createSourceFile(
    "/project/node_modules/test-lib/index.d.ts",
    "export { ComplexInterface } from 'external-lib';",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "ComplexInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  // Should return null when the external re-export can't be resolved
  expect(result).toBeNull();
});

test("handles errors during symbol resolution gracefully", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    types: "index.d.ts",
  });
  mockFileSystemUtils.fileExists.mockReturnValue(true);

  // This will cause an error when trying to add the source file
  const options: ModuleResolutionOptions = {
    symbolName: "TestInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  // Mock project.addSourceFileAtPath to throw an error
  vi.spyOn(project, "addSourceFileAtPath").mockImplementation(() => {
    throw new Error("File system error");
  });

  const result = resolver.resolve(options);

  expect(result).toBeNull();
});

test("handles re-export resolution errors gracefully", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    types: "index.d.ts",
  });
  mockFileSystemUtils.fileExists.mockReturnValue(true);

  // Create declaration file with invalid re-export
  project.createSourceFile(
    "/project/node_modules/test-lib/index.d.ts",
    "export { BadReexport } from './nonexistent';",
  );

  // Mock resolveRelativeImport to return a path that doesn't exist
  mockFileSystemUtils.resolveRelativeImport.mockReturnValue(
    "/nonexistent/path.d.ts",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "BadReexport",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  // Should not crash and return null since the re-export can't be resolved
  expect(result).toBeNull();
});

test("searches all common declaration file locations", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue(null); // No package.json

  // Mock fileExists to return true only for lib/index.d.ts
  mockFileSystemUtils.fileExists.mockImplementation((path: string) => {
    return path.includes("/lib/index.d.ts");
  });

  project.createSourceFile(
    "/project/node_modules/test-lib/lib/index.d.ts",
    "export interface LibInterface { version: string; }",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "LibInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeDefined();
  expect(mockFileSystemUtils.fileExists).toHaveBeenCalledWith(
    expect.stringContaining("/test-lib/index.d.ts"),
  );
  expect(mockFileSystemUtils.fileExists).toHaveBeenCalledWith(
    expect.stringContaining("/test-lib/lib/index.d.ts"),
  );
});

test("handles package.json with invalid types path", () => {
  const sourceFile = project.createSourceFile("/src/test.ts", "");

  mockFileSystemUtils.findNodeModules.mockReturnValue("/project/node_modules");
  mockFileSystemUtils.readPackageJson.mockReturnValue({
    types: "nonexistent/types.d.ts",
  });

  // The types path doesn't exist, so it falls back to common locations
  mockFileSystemUtils.fileExists.mockImplementation((path: string) => {
    return path.includes("/index.d.ts") && !path.includes("nonexistent");
  });

  project.createSourceFile(
    "/project/node_modules/test-lib/index.d.ts",
    "export interface FallbackInterface { id: number; }",
  );

  const options: ModuleResolutionOptions = {
    symbolName: "FallbackInterface",
    moduleSpecifier: "test-lib",
    sourceFile,
  };

  const result = resolver.resolve(options);

  expect(result).toBeDefined();
});
