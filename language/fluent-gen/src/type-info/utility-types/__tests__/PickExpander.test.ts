import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { PickExpander } from "../PickExpander.js";
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
      email: string;
      age: number;
      profile: {
        avatar: string;
        bio: string;
      };
    }
  `,
  );
  return sourceFile;
}

test("returns correct type name", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);

  expect(expander.getTypeName()).toBe("Pick");
});

test("validates type arguments count", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
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
    "Pick expects 2 type arguments, got 1",
  );

  consoleWarnSpy.mockRestore();
});

test("picks single property from interface", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"name"');

  const result = expander.expand({
    name: "userNameOnly",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.kind).toBe("non-terminal");
  expect(result?.type).toBe("object");
  expect(result?.name).toBe("userNameOnly");
  expect(result?.typeAsString).toBe('Pick<User, "name">');

  const objectResult = result as ObjectProperty;
  expect(objectResult.properties).toHaveLength(1);
  expect(objectResult.properties[0]?.name).toBe("name");
});

test("picks multiple properties from interface", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"name" | "email"');

  const result = expander.expand({
    name: "userBasic",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.properties).toHaveLength(2);

  const propertyNames = result.properties.map((p) => p.name);
  expect(propertyNames).toContain("name");
  expect(propertyNames).toContain("email");
});

test("handles array option", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"name"');

  const result = expander.expand({
    name: "userNames",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: { isArray: true },
  }) as ObjectProperty;

  expect(result.isArray).toBe(true);
});

test("handles optional option", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"name"');

  const result = expander.expand({
    name: "maybeUserName",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: { isOptional: true },
  }) as ObjectProperty;

  expect(result.isOptional).toBe(true);
});

test("warns when no extractable keys found", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, "string"); // not a literal

  const result = expander.expand({
    name: "test",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBe(null);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Pick type has no extractable keys from: string",
  );

  consoleWarnSpy.mockRestore();
});

test("warns for unknown source interface", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const sourceTypeNode = createTypeNode(project, "UnknownInterface");
  const keyTypeNode = createTypeNode(project, '"name"');

  const result = expander.expand({
    name: "test",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBe(null);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Could not find interface for Pick source type: UnknownInterface",
  );

  consoleWarnSpy.mockRestore();
});

test("picks properties that exist in interface", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(
    project,
    '"name" | "nonExistent" | "email"',
  );

  const result = expander.expand({
    name: "picked",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  // Should only pick properties that exist
  expect(result.properties).toHaveLength(2);
  const propertyNames = result.properties.map((p) => p.name);
  expect(propertyNames).toContain("name");
  expect(propertyNames).toContain("email");
  expect(propertyNames).not.toContain("nonExistent");
});

test("handles nested utility types in source", () => {
  const project = createMockProject();
  project.createSourceFile(
    "/nested.ts",
    `
    export interface BaseUser {
      id: number;
      name: string;
      email: string;
    }
  `,
  );

  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "Partial<BaseUser>");
  const keyTypeNode = createTypeNode(project, '"name"');

  const result = expander.expand({
    name: "picked",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.typeAsString).toBe('Pick<Partial<BaseUser>, "name">');
});

test("handles circular references", () => {
  const project = createMockProject();
  project.createSourceFile(
    "/circular.ts",
    `
    export interface Node {
      id: string;
      value: string;
      children?: Node[];
      parent?: Node;
    }
  `,
  );

  const typeAnalyzer = new TypeAnalyzer();
  const expander = new PickExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "Node");
  const keyTypeNode = createTypeNode(project, '"id" | "value"');

  const result = expander.expand({
    name: "nodeBasic",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.type).toBe("object");
});
