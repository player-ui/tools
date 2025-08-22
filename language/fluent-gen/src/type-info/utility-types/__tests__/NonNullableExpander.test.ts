import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { NonNullableExpander } from "../NonNullableExpander.js";
import { TypeAnalyzer } from "../../analyzers/TypeAnalyzer.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createMockContext(project: Project): ExtractorContext {
  const sourceFile = project.createSourceFile("/test.ts", "");
  return new ExtractorContext(project, sourceFile);
}

function createTypeNode(project: Project, code: string): TypeNode {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, `type Test = ${code};`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  return typeAlias.getTypeNode()!;
}

function setupTestTypes(project: Project) {
  const sourceFile = project.createSourceFile(
    "/types.ts",
    `
    export interface User {
      id: number;
      name: string;
      email?: string;
    }
  `,
  );
  return sourceFile;
}

test("returns correct type name", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);

  expect(expander.getTypeName()).toBe("NonNullable");
});

test("validates type arguments count", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const typeNode1 = createTypeNode(project, "string");
  const typeNode2 = createTypeNode(project, "number");

  const result = expander.expand({
    name: "test",
    typeArgs: [typeNode1, typeNode2],
    context,
    options: {},
  });

  expect(result).toBe(null);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "NonNullable expects 1 type arguments, got 2",
  );

  consoleWarnSpy.mockRestore();
});

test("expands NonNullable with primitive type", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the analyze method to return a string property
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "nonNullString",
    typeAsString: "string",
  });

  const typeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "nonNullString",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "nonNullString",
    typeAsString: "string",
  });

  expect(mockAnalyze).toHaveBeenCalledWith({
    name: "nonNullString",
    typeNode,
    context,
    options: {},
  });

  mockAnalyze.mockRestore();
});

test("expands NonNullable with interface reference", () => {
  const project = createMockProject();
  setupTestTypes(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the analyze method to return an object property
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "non-terminal",
    type: "object",
    name: "nonNullUser",
    typeAsString: "User",
    properties: [
      {
        kind: "terminal",
        type: "number",
        name: "id",
        typeAsString: "number",
      },
    ],
  });

  const typeNode = createTypeNode(project, "User");

  const result = expander.expand({
    name: "nonNullUser",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.type).toBe("object");
  expect(result?.name).toBe("nonNullUser");

  mockAnalyze.mockRestore();
});

test("tracks dependency for type reference", () => {
  const project = createMockProject();
  setupTestTypes(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  const addDependencySpy = vi.spyOn(context, "addDependency");

  // Mock the analyze method
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "test",
    typeAsString: "User",
  });

  const typeNode = createTypeNode(project, "User");

  expander.expand({
    name: "nonNullUser",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(addDependencySpy).toHaveBeenCalledWith({
    target: expect.objectContaining({
      kind: "local",
      name: "User",
      filePath: "/types.ts",
    }),
    dependency: "User",
  });

  addDependencySpy.mockRestore();
  mockAnalyze.mockRestore();
});

test("handles array option", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the analyze method
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "nonNullString",
    typeAsString: "string",
    isArray: true,
  });

  const typeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "nonNullStrings",
    typeArgs: [typeNode],
    context,
    options: { isArray: true },
  });

  expect(mockAnalyze).toHaveBeenCalledWith({
    name: "nonNullStrings",
    typeNode,
    context,
    options: { isArray: true },
  });

  expect(result?.isArray).toBe(true);

  mockAnalyze.mockRestore();
});

test("handles optional option", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the analyze method
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "maybeNonNullString",
    typeAsString: "string",
    isOptional: true,
  });

  const typeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "maybeNonNullString",
    typeArgs: [typeNode],
    context,
    options: { isOptional: true },
  });

  expect(mockAnalyze).toHaveBeenCalledWith({
    name: "maybeNonNullString",
    typeNode,
    context,
    options: { isOptional: true },
  });

  expect(result?.isOptional).toBe(true);

  mockAnalyze.mockRestore();
});

test("handles non-type-reference source types", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  const addDependencySpy = vi.spyOn(context, "addDependency");

  // Mock the analyze method
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "nonNullString",
    typeAsString: "string",
  });

  const typeNode = createTypeNode(project, "string"); // primitive, not type reference

  expander.expand({
    name: "nonNullString",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  // Should not add dependency for non-reference types
  expect(addDependencySpy).not.toHaveBeenCalled();

  addDependencySpy.mockRestore();
  mockAnalyze.mockRestore();
});

test("handles union types correctly", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the analyze method to return a union result
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "nonNullUnion",
    typeAsString: "string | number",
  });

  const typeNode = createTypeNode(
    project,
    "string | number | null | undefined",
  );

  const result = expander.expand({
    name: "nonNullUnion",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  // NonNullable should analyze the source type directly
  // The actual null/undefined removal is handled by TypeScript's type system
  expect(result).toBeDefined();
  expect(result?.name).toBe("nonNullUnion");

  mockAnalyze.mockRestore();
});

test("returns null when type analysis fails", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the analyze method to return null
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue(null);

  const typeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "failed",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(result).toBe(null);

  mockAnalyze.mockRestore();
});

test("preserves all options passed to analyzer", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new NonNullableExpander(typeAnalyzer);
  const context = createMockContext(project);

  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "test",
    typeAsString: "string",
  });

  const typeNode = createTypeNode(project, "string");

  expander.expand({
    name: "test",
    typeArgs: [typeNode],
    context,
    options: {
      isArray: true,
      isOptional: true,
    },
  });

  expect(mockAnalyze).toHaveBeenCalledWith({
    name: "test",
    typeNode,
    context,
    options: {
      isArray: true,
      isOptional: true,
    },
  });

  mockAnalyze.mockRestore();
});
