import { test, expect, beforeEach } from "vitest";
import { Project } from "ts-morph";
import { SymbolCache } from "../SymbolCache.js";
import type { ResolvedSymbol } from "../../../types.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

let cache: SymbolCache;
let project: Project;

beforeEach(() => {
  cache = new SymbolCache();
  project = createMockProject();
});

test("stores and retrieves symbol resolution results", () => {
  const sourceFile = project.createSourceFile("/test.ts", "interface Test {}");
  const mockResolvedSymbol: ResolvedSymbol = {
    declaration: sourceFile.getInterface("Test")!,
    target: { kind: "local", filePath: "/test.ts", name: "Test" },
    isLocal: true,
  };

  cache.set("Test", sourceFile, mockResolvedSymbol);
  const result = cache.get("Test", sourceFile);

  expect(result).toEqual(mockResolvedSymbol);
});

test("returns undefined for non-existent entries", () => {
  const sourceFile = project.createSourceFile("/test.ts", "");
  const result = cache.get("NonExistent", sourceFile);

  expect(result).toBeUndefined();
});

test("stores null resolution results", () => {
  const sourceFile = project.createSourceFile("/test.ts", "");

  cache.set("NotFound", sourceFile, null);
  const result = cache.get("NotFound", sourceFile);

  expect(result).toBeNull();
});

test("distinguishes symbols by file path", () => {
  const file1 = project.createSourceFile("/test1.ts", "interface Test {}");
  const file2 = project.createSourceFile("/test2.ts", "interface Test {}");

  const symbol1: ResolvedSymbol = {
    declaration: file1.getInterface("Test")!,
    target: { kind: "local", filePath: "/test1.ts", name: "Test" },
    isLocal: true,
  };

  const symbol2: ResolvedSymbol = {
    declaration: file2.getInterface("Test")!,
    target: { kind: "local", filePath: "/test2.ts", name: "Test" },
    isLocal: true,
  };

  cache.set("Test", file1, symbol1);
  cache.set("Test", file2, symbol2);

  expect(cache.get("Test", file1)).toEqual(symbol1);
  expect(cache.get("Test", file2)).toEqual(symbol2);
});

test("distinguishes symbols by name within same file", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface A {} interface B {}",
  );

  const symbolA: ResolvedSymbol = {
    declaration: sourceFile.getInterface("A")!,
    target: { kind: "local", filePath: "/test.ts", name: "A" },
    isLocal: true,
  };

  const symbolB: ResolvedSymbol = {
    declaration: sourceFile.getInterface("B")!,
    target: { kind: "local", filePath: "/test.ts", name: "B" },
    isLocal: true,
  };

  cache.set("A", sourceFile, symbolA);
  cache.set("B", sourceFile, symbolB);

  expect(cache.get("A", sourceFile)).toEqual(symbolA);
  expect(cache.get("B", sourceFile)).toEqual(symbolB);
});

test("overwrites existing cached entries", () => {
  const sourceFile = project.createSourceFile("/test.ts", "interface Test {}");

  const firstSymbol: ResolvedSymbol = {
    declaration: sourceFile.getInterface("Test")!,
    target: { kind: "local", filePath: "/test.ts", name: "Test" },
    isLocal: true,
  };

  const secondSymbol: ResolvedSymbol = {
    declaration: sourceFile.getInterface("Test")!,
    target: { kind: "module", name: "external-lib" },
    isLocal: false,
  };

  cache.set("Test", sourceFile, firstSymbol);
  cache.set("Test", sourceFile, secondSymbol);

  expect(cache.get("Test", sourceFile)).toEqual(secondSymbol);
});

test("clears all cached entries", () => {
  const file1 = project.createSourceFile("/test1.ts", "interface Test1 {}");
  const file2 = project.createSourceFile("/test2.ts", "interface Test2 {}");

  const symbol1: ResolvedSymbol = {
    declaration: file1.getInterface("Test1")!,
    target: { kind: "local", filePath: "/test1.ts", name: "Test1" },
    isLocal: true,
  };

  const symbol2: ResolvedSymbol = {
    declaration: file2.getInterface("Test2")!,
    target: { kind: "local", filePath: "/test2.ts", name: "Test2" },
    isLocal: true,
  };

  cache.set("Test1", file1, symbol1);
  cache.set("Test2", file2, symbol2);

  // Verify entries exist
  expect(cache.get("Test1", file1)).toEqual(symbol1);
  expect(cache.get("Test2", file2)).toEqual(symbol2);

  // Clear cache
  cache.clear();

  // Verify entries are gone
  expect(cache.get("Test1", file1)).toBeUndefined();
  expect(cache.get("Test2", file2)).toBeUndefined();
});

test("handles file paths with special characters", () => {
  const sourceFile = project.createSourceFile(
    "/test-file_with@special#chars.ts",
    "interface Test {}",
  );

  const mockSymbol: ResolvedSymbol = {
    declaration: sourceFile.getInterface("Test")!,
    target: {
      kind: "local",
      filePath: "/test-file_with@special#chars.ts",
      name: "Test",
    },
    isLocal: true,
  };

  cache.set("Test", sourceFile, mockSymbol);
  const result = cache.get("Test", sourceFile);

  expect(result).toEqual(mockSymbol);
});

test("handles symbols with special characters in names", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface Test$Symbol_123 {}",
  );

  const mockSymbol: ResolvedSymbol = {
    declaration: sourceFile.getInterface("Test$Symbol_123")!,
    target: { kind: "local", filePath: "/test.ts", name: "Test$Symbol_123" },
    isLocal: true,
  };

  cache.set("Test$Symbol_123", sourceFile, mockSymbol);
  const result = cache.get("Test$Symbol_123", sourceFile);

  expect(result).toEqual(mockSymbol);
});
