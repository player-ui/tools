import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { RecordExpander } from "../RecordExpander.js";
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

function setupTestTypes(project: Project) {
  const sourceFile = project.createSourceFile(
    "/types.ts",
    `
    export enum Color {
      Red = "red",
      Green = "green",
      Blue = "blue"
    }
    
    export enum Status {
      Active,
      Inactive,
      Pending
    }
  `,
  );
  return sourceFile;
}

test("returns correct type name", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);

  expect(expander.getTypeName()).toBe("Record");
});

test("validates type arguments count", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const typeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "test",
    typeArgs: [typeNode],
    context,
    options: {},
  });

  expect(result).toBe(null);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Record expects 2 type arguments, got 1",
  );

  consoleWarnSpy.mockRestore();
});

test("creates Record<string, unknown> with acceptsUnknownProperties", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, "string");
  const valueTypeNode = createTypeNode(project, "unknown");

  const result = expander.expand({
    name: "genericRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.type).toBe("object");
  expect(result.typeAsString).toBe("Record<string, unknown>");
  expect(result.properties).toHaveLength(0);
  expect(result.acceptsUnknownProperties).toBe(true);
});

test("creates Record<string, any> with acceptsUnknownProperties", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, "string");
  const valueTypeNode = createTypeNode(project, "any");

  const result = expander.expand({
    name: "anyRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.type).toBe("object");
  expect(result.typeAsString).toBe("Record<string, any>");
  expect(result.properties).toHaveLength(0);
  expect(result.acceptsUnknownProperties).toBe(true);
});

test("creates Record with string literal union keys", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, '"name" | "email" | "age"');
  const valueTypeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "userRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.type).toBe("object");
  expect(result.typeAsString).toBe('Record<"name" | "email" | "age", string>');
  expect(result.properties).toHaveLength(3);

  const propertyNames = result.properties.map((p) => p.name);
  expect(propertyNames).toContain("name");
  expect(propertyNames).toContain("email");
  expect(propertyNames).toContain("age");

  // All properties should have the same type
  result.properties.forEach((prop) => {
    expect(prop.type).toBe("string");
  });
});

test("creates Record with enum keys", () => {
  const project = createMockProject();
  setupTestTypes(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, "Color");
  const valueTypeNode = createTypeNode(project, "number");

  const result = expander.expand({
    name: "colorRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.type).toBe("object");
  expect(result.typeAsString).toBe("Record<Color, number>");
  expect(result.properties).toHaveLength(3);

  const propertyNames = result.properties.map((p) => p.name);
  expect(propertyNames).toContain("red");
  expect(propertyNames).toContain("green");
  expect(propertyNames).toContain("blue");
});

test("creates Record with numeric enum keys", () => {
  const project = createMockProject();
  setupTestTypes(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, "Status");
  const valueTypeNode = createTypeNode(project, "boolean");

  const result = expander.expand({
    name: "statusRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.type).toBe("object");
  expect(result.properties).toHaveLength(3);

  const propertyNames = result.properties.map((p) => p.name);
  expect(propertyNames).toContain("0"); // Active
  expect(propertyNames).toContain("1"); // Inactive
  expect(propertyNames).toContain("2"); // Pending
});

test("handles array option", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, "string");
  const valueTypeNode = createTypeNode(project, "unknown");

  const result = expander.expand({
    name: "records",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: { isArray: true },
  }) as ObjectProperty;

  expect(result.isArray).toBe(true);
});

test("handles optional option", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, "string");
  const valueTypeNode = createTypeNode(project, "unknown");

  const result = expander.expand({
    name: "maybeRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: { isOptional: true },
  }) as ObjectProperty;

  expect(result.isOptional).toBe(true);
});

test("creates generic representation when no extractable keys", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the typeAnalyzer.analyze to return a property for the generic case
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue({
    kind: "terminal",
    type: "string",
    name: "value",
    typeAsString: "string",
  });

  const keyTypeNode = createTypeNode(project, "number"); // Not extractable as string literals
  const valueTypeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "numberRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.properties).toHaveLength(1);
  expect(result.properties[0]?.name).toBe("value");

  mockAnalyze.mockRestore();
});

test("handles complex value types", () => {
  const project = createMockProject();
  project.createSourceFile(
    "/complex.ts",
    `
    export interface UserData {
      name: string;
      age: number;
    }
  `,
  );

  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, '"user1" | "user2"');
  const valueTypeNode = createTypeNode(project, "UserData");

  const result = expander.expand({
    name: "userDataRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.properties).toHaveLength(2);
  expect(result.typeAsString).toBe('Record<"user1" | "user2", UserData>');
});

test("handles unknown enum gracefully", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  const keyTypeNode = createTypeNode(project, "UnknownEnum");
  const valueTypeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "unknownRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  // Should fall back to generic representation or empty properties
  expect(result.type).toBe("object");
});

test("handles empty value analysis", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new RecordExpander(typeAnalyzer);
  const context = createMockContext(project);

  // Mock the typeAnalyzer.analyze to return null
  const mockAnalyze = vi.spyOn(typeAnalyzer, "analyze").mockReturnValue(null);

  const keyTypeNode = createTypeNode(project, '"key"');
  const valueTypeNode = createTypeNode(project, "string");

  const result = expander.expand({
    name: "emptyRecord",
    typeArgs: [keyTypeNode, valueTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.properties).toHaveLength(0);

  mockAnalyze.mockRestore();
});
