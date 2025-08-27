import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { PartialExpander } from "../PartialExpander.js";
import { TypeAnalyzer } from "../../analyzers/TypeAnalyzer.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";
import type { ObjectProperty } from "../../types.js";

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

function setupTestInterface(project: Project) {
  const sourceFile = project.createSourceFile(
    "/interfaces.ts",
    `
    export interface User {
      id: number;
      name: string;
      email?: string;
      profile: {
        avatar: string;
        bio?: string;
      };
    }
  `,
  );
  return sourceFile;
}

test("returns correct type name", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);

  expect(expander.getTypeName()).toBe("Partial");
});

test("validates type arguments count", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);
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
    "Partial expects 1 type arguments, got 2",
  );

  consoleWarnSpy.mockRestore();
});

test("expands partial type for interface reference", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "User");

  const result = expander.expand({
    name: "partialUser",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.kind).toBe("non-terminal");
  expect(result?.type).toBe("object");
  expect(result?.name).toBe("partialUser");
  expect(result?.typeAsString).toBe("Partial<User>");

  const objectResult = result as ObjectProperty;
  expect(objectResult.properties).toHaveLength(4);

  // All properties should be optional
  objectResult.properties.forEach((prop) => {
    expect(prop.isOptional).toBe(true);
  });
});

test("makes nested object properties optional", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "User");

  const result = expander.expand({
    name: "partialUser",
    typeArgs: [typeNode],
    context,
    options: {},
  }) as ObjectProperty;

  const profileProperty = result.properties.find(
    (p) => p.name === "profile",
  ) as ObjectProperty;
  expect(profileProperty).toBeDefined();
  expect(profileProperty.isOptional).toBe(true);
  expect(profileProperty.type).toBe("object");

  // Nested properties should also be optional
  profileProperty.properties.forEach((prop) => {
    expect(prop.isOptional).toBe(true);
  });
});

test("handles array option", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "User");

  const result = expander.expand({
    name: "partialUsers",
    typeArgs: [typeNode],
    context,
    options: { isArray: true },
  }) as ObjectProperty;

  expect(result.isArray).toBe(true);
});

test("handles optional option", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "User");

  const result = expander.expand({
    name: "maybePartialUser",
    typeArgs: [typeNode],
    context,
    options: { isOptional: true },
  }) as ObjectProperty;

  expect(result.isOptional).toBe(true);
});

test("warns for unknown interface", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);
  const context = createMockContext(project);
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const typeNode = createTypeNode(project, "UnknownInterface");

  const result = expander.expand({
    name: "partial",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(result).toBe(null);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Could not find interface for Partial source type: UnknownInterface",
  );

  consoleWarnSpy.mockRestore();
});

test("handles circular references", () => {
  const project = createMockProject();
  project.createSourceFile(
    "/circular.ts",
    `
    export interface Node {
      value: string;
      children?: Node[];
    }
  `,
  );

  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PartialExpander(typeAnalyzer);
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "Node");

  const result = expander.expand({
    name: "partialNode",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.type).toBe("object");
});

test("expands partial with direct type analysis", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();

  // Mock the analyze method to return an object property
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "non-terminal",
    type: "object",
    name: "",
    typeAsString: "User",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "name",
        typeAsString: "string",
        isOptional: false,
      },
    ],
  });

  const expander = new PartialExpander(typeAnalyzer);
  const context = createMockContext(project);
  const typeNode = createTypeNode(project, "User");

  const result = expander.expand({
    name: "partialUser",
    typeArgs: [typeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result).toBeDefined();
  expect(result.properties[0]?.isOptional).toBe(true);

  mockAnalyze.mockRestore();
});
