/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { ArrayAnalyzer } from "../ArrayAnalyzer.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";
import type { TypeAnalyzer } from "../TypeAnalyzer.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createMockTypeAnalyzer(): TypeAnalyzer {
  return {
    analyze: vi.fn().mockImplementation(({ name, typeNode, options }) => {
      const typeText = typeNode.getText();

      if (typeText === "string") {
        return {
          kind: "terminal",
          type: "string",
          name,
          typeAsString: "string",
          ...(options?.isArray ? { isArray: true } : {}),
          ...(options?.isOptional ? { isOptional: true } : {}),
        };
      }

      if (typeText === "number") {
        return {
          kind: "terminal",
          type: "number",
          name,
          typeAsString: "number",
          ...(options?.isArray ? { isArray: true } : {}),
          ...(options?.isOptional ? { isOptional: true } : {}),
        };
      }

      return {
        kind: "terminal",
        type: "unknown",
        name,
        typeAsString: typeText,
        ...(options?.isArray ? { isArray: true } : {}),
        ...(options?.isOptional ? { isOptional: true } : {}),
      };
    }),
  } as any;
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

test("canHandle identifies array type syntax", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);

  const arrayTypeNode = createTypeNode(project, "string[]");
  const genericArrayTypeNode = createTypeNode(project, "Array<number>");
  const readonlyArrayTypeNode = createTypeNode(
    project,
    "ReadonlyArray<string>",
  );
  const nonArrayTypeNode = createTypeNode(project, "string");

  expect(analyzer.canHandle(arrayTypeNode)).toBe(true);
  expect(analyzer.canHandle(genericArrayTypeNode)).toBe(true);
  expect(analyzer.canHandle(readonlyArrayTypeNode)).toBe(true);
  expect(analyzer.canHandle(nonArrayTypeNode)).toBe(false);
});

test("analyzes T[] syntax array types", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const arrayTypeNode = createTypeNode(project, "string[]");

  const result = analyzer.analyze({
    name: "items",
    typeNode: arrayTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "items",
    typeAsString: "string",
    isArray: true,
  });

  expect(typeAnalyzer.analyze).toHaveBeenCalledWith({
    name: "items",
    typeNode: expect.any(Object),
    context,
    options: { isArray: true },
  });
});

test("analyzes Array<T> syntax array types", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const arrayTypeNode = createTypeNode(project, "Array<number>");

  const result = analyzer.analyze({
    name: "numbers",
    typeNode: arrayTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "number",
    name: "numbers",
    typeAsString: "number",
    isArray: true,
  });

  expect(typeAnalyzer.analyze).toHaveBeenCalledWith({
    name: "numbers",
    typeNode: expect.any(Object),
    context,
    options: { isArray: true },
  });
});

test("analyzes ReadonlyArray<T> syntax array types", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const arrayTypeNode = createTypeNode(project, "ReadonlyArray<string>");

  const result = analyzer.analyze({
    name: "readonlyItems",
    typeNode: arrayTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "readonlyItems",
    typeAsString: "string",
    isArray: true,
  });
});

test("handles Array without type arguments", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const arrayTypeNode = createTypeNode(project, "Array");

  const result = analyzer.analyze({
    name: "unknownArray",
    typeNode: arrayTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "unknown",
    name: "unknownArray",
    typeAsString: "unknown[]",
    isArray: true,
  });
});

test("preserves optional flag from options", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const arrayTypeNode = createTypeNode(project, "string[]");

  const result = analyzer.analyze({
    name: "optionalItems",
    typeNode: arrayTypeNode,
    context,
    options: { isOptional: true },
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "optionalItems",
    typeAsString: "string",
    isArray: true,
    isOptional: true,
  });
});

test("passes through other options to element analyzer", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const arrayTypeNode = createTypeNode(project, "string[]");

  analyzer.analyze({
    name: "items",
    typeNode: arrayTypeNode,
    context,
    options: { isOptional: true, maxDepth: 5 },
  });

  expect(typeAnalyzer.analyze).toHaveBeenCalledWith({
    name: "items",
    typeNode: expect.any(Object),
    context,
    options: {
      isOptional: true,
      maxDepth: 5,
      isArray: true,
    },
  });
});

test("returns null for non-array types", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const stringTypeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "notArray",
    typeNode: stringTypeNode,
    context,
    options: {},
  });

  expect(result).toBeNull();
});

test("handles complex nested array element types", () => {
  const project = createMockProject();
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ name }) => ({
      kind: "non-terminal",
      type: "object",
      name,
      typeAsString: "ComplexType",
      properties: [],
      isArray: true,
    })),
  } as any;

  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const arrayTypeNode = createTypeNode(project, "ComplexType[]");

  const result = analyzer.analyze({
    name: "complexItems",
    typeNode: arrayTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "complexItems",
    typeAsString: "ComplexType",
    properties: [],
    isArray: true,
  });
});

test("handles getTypeReferenceName error gracefully", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ArrayAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  // Create a malformed type reference that will cause getTypeName to fail
  const sourceFile = project.createSourceFile(
    "/temp.ts",
    "type Test = Array<string>;",
  );
  const typeNode = sourceFile.getTypeAlias("Test")!.getTypeNode()!;

  // Mock the getTypeName method to throw an error
  const originalGetText = typeNode.getText;
  vi.spyOn(typeNode as any, "getTypeName").mockImplementation(() => {
    throw new Error("Failed to get type name");
  });

  const result = analyzer.analyze({
    name: "items",
    typeNode,
    context,
    options: {},
  });

  // Should return null when getTypeReferenceName fails
  expect(result).toBeNull();

  // Restore original method
  typeNode.getText = originalGetText;
});
