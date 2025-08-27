import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { OmitExpander } from "../OmitExpander.js";
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
      /** User identifier */
      id: number;
      /** User full name */
      name: string;
      /** User email address */
      email: string;
      age: number;
      profile: {
        avatar: string;
        bio: string;
      };
    }
    
    export interface UserWithIndex {
      id: number;
      name: string;
      [key: string]: any;
    }
  `,
  );
  return sourceFile;
}

test("returns correct type name", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);

  expect(expander.getTypeName()).toBe("Omit");
});

test("validates type arguments count", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
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
    "Omit expects 2 type arguments, got 1",
  );

  consoleWarnSpy.mockRestore();
});

test("omits single property from interface", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"email"');

  const result = expander.expand({
    name: "userWithoutEmail",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.kind).toBe("non-terminal");
  expect(result?.type).toBe("object");
  expect(result?.name).toBe("userWithoutEmail");
  expect(result?.typeAsString).toBe('Omit<User, "email">');

  const objectResult = result as ObjectProperty;
  expect(objectResult.properties).toHaveLength(4); // 5 original - 1 omitted

  const propertyNames = objectResult.properties.map((p) => p.name);
  expect(propertyNames).toContain("id");
  expect(propertyNames).toContain("name");
  expect(propertyNames).toContain("age");
  expect(propertyNames).toContain("profile");
  expect(propertyNames).not.toContain("email");
});

test("omits multiple properties from interface", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"email" | "age"');

  const result = expander.expand({
    name: "userBasic",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.properties).toHaveLength(3); // 5 original - 2 omitted

  const propertyNames = result.properties.map((p) => p.name);
  expect(propertyNames).toContain("id");
  expect(propertyNames).toContain("name");
  expect(propertyNames).toContain("profile");
  expect(propertyNames).not.toContain("email");
  expect(propertyNames).not.toContain("age");
});

test("preserves JSDoc documentation", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"email"');

  const result = expander.expand({
    name: "userWithoutEmail",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  const idProperty = result.properties.find((p) => p.name === "id");
  expect(idProperty?.documentation).toContain("User identifier");

  const nameProperty = result.properties.find((p) => p.name === "name");
  expect(nameProperty?.documentation).toContain("User full name");
});

test("handles interface with index signature", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "UserWithIndex");
  const keyTypeNode = createTypeNode(project, '"id"');

  const result = expander.expand({
    name: "userWithoutId",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.acceptsUnknownProperties).toBe(true);
});

test("handles interface without index signature", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"id"');

  const result = expander.expand({
    name: "userWithoutId",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  expect(result.acceptsUnknownProperties).toBeUndefined();
});

test("handles array option", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"email"');

  const result = expander.expand({
    name: "users",
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
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"email"');

  const result = expander.expand({
    name: "maybeUser",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: { isOptional: true },
  }) as ObjectProperty;

  expect(result.isOptional).toBe(true);
});

test("warns for unknown source interface", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
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
    "Could not find interface for Omit source type: UnknownInterface",
  );

  consoleWarnSpy.mockRestore();
});

test("omits non-existent properties gracefully", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, '"nonExistent" | "email"');

  const result = expander.expand({
    name: "omitted",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  // Should omit the existing property and ignore the non-existent one
  expect(result.properties).toHaveLength(4);
  const propertyNames = result.properties.map((p) => p.name);
  expect(propertyNames).not.toContain("email");
});

test("handles empty omit keys", () => {
  const project = createMockProject();
  setupTestInterface(project);
  const typeAnalyzer = new TypeAnalyzer();
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "User");
  const keyTypeNode = createTypeNode(project, "never"); // Should extract no keys

  const result = expander.expand({
    name: "allProps",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  }) as ObjectProperty;

  // Should keep all properties if no keys to omit
  expect(result.properties).toHaveLength(5);
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
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "Partial<BaseUser>");
  const keyTypeNode = createTypeNode(project, '"email"');

  const result = expander.expand({
    name: "omitted",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.typeAsString).toBe('Omit<Partial<BaseUser>, "email">');
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
  const expander = new OmitExpander(typeAnalyzer);
  const context = createMockContext(project);

  const sourceTypeNode = createTypeNode(project, "Node");
  const keyTypeNode = createTypeNode(project, '"parent"');

  const result = expander.expand({
    name: "nodeWithoutParent",
    typeArgs: [sourceTypeNode, keyTypeNode],
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.type).toBe("object");
});
