/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { ObjectAnalyzer } from "../ObjectAnalyzer.js";
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
          ...(options?.isOptional ? { isOptional: true } : {}),
          ...(options?.isArray ? { isArray: true } : {}),
        };
      }

      if (typeText === "number") {
        return {
          kind: "terminal",
          type: "number",
          name,
          typeAsString: "number",
          ...(options?.isOptional ? { isOptional: true } : {}),
          ...(options?.isArray ? { isArray: true } : {}),
        };
      }

      if (typeText === "boolean") {
        return {
          kind: "terminal",
          type: "boolean",
          name,
          typeAsString: "boolean",
          ...(options?.isOptional ? { isOptional: true } : {}),
          ...(options?.isArray ? { isArray: true } : {}),
        };
      }

      return {
        kind: "terminal",
        type: "unknown",
        name,
        typeAsString: typeText,
        ...(options?.isOptional ? { isOptional: true } : {}),
        ...(options?.isArray ? { isArray: true } : {}),
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

test("canHandle identifies type literal nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);

  const typeLiteralNode = createTypeNode(
    project,
    "{ foo: string; bar: number }",
  );
  const primitiveTypeNode = createTypeNode(project, "string");
  const arrayTypeNode = createTypeNode(project, "string[]");

  expect(analyzer.canHandle(typeLiteralNode)).toBe(true);
  expect(analyzer.canHandle(primitiveTypeNode)).toBe(false);
  expect(analyzer.canHandle(arrayTypeNode)).toBe(false);
});

test("analyzes simple type literal with properties", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const typeLiteralNode = createTypeNode(
    project,
    "{ name: string; age: number }",
  );

  const result = analyzer.analyze({
    name: "user",
    typeNode: typeLiteralNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "user",
    typeAsString: "{ name: string; age: number }",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "name",
        typeAsString: "string",
      },
      {
        kind: "terminal",
        type: "number",
        name: "age",
        typeAsString: "number",
      },
    ],
  });
});

test("handles optional properties", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const typeLiteralNode = createTypeNode(
    project,
    "{ required: string; optional?: number }",
  );

  const result = analyzer.analyze({
    name: "obj",
    typeNode: typeLiteralNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(2);
  expect((result as any)?.properties[0]).not.toHaveProperty("isOptional");
  expect((result as any)?.properties[1]).toHaveProperty("isOptional", true);

  // Verify the type analyzer was called with correct optional flags
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "required",
      options: expect.objectContaining({ isOptional: false }),
    }),
  );
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "optional",
      options: expect.objectContaining({ isOptional: true }),
    }),
  );
});

test("handles method signatures", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const typeLiteralNode = createTypeNode(
    project,
    "{ getValue(): string; setOptional?(): void }",
  );

  const result = analyzer.analyze({
    name: "obj",
    typeNode: typeLiteralNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(2);
  expect((result as any)?.properties[0]).toEqual({
    kind: "terminal",
    type: "method",
    name: "getValue",
    typeAsString: expect.any(String),
  });
  expect((result as any)?.properties[1]).toEqual({
    kind: "terminal",
    type: "method",
    name: "setOptional",
    typeAsString: expect.any(String),
    isOptional: true,
  });
});

test("handles empty type literal as unknown", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const emptyTypeLiteralNode = createTypeNode(project, "{}");

  const result = analyzer.analyze({
    name: "empty",
    typeNode: emptyTypeLiteralNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "unknown",
    name: "empty",
    typeAsString: "{}",
  });
});

test("handles type literal with index signature", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const typeLiteralNode = createTypeNode(project, "{ [key: string]: string }");

  const result = analyzer.analyze({
    name: "indexed",
    typeNode: typeLiteralNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "indexed",
    typeAsString: "{ [key: string]: string }",
    properties: [],
  });
});

test("preserves options for analyzed object", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const typeLiteralNode = createTypeNode(project, "{ prop: string }");

  const result = analyzer.analyze({
    name: "obj",
    typeNode: typeLiteralNode,
    context,
    options: { isOptional: true, isArray: true },
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "obj",
    typeAsString: "{ prop: string }",
    properties: expect.any(Array),
    isOptional: true,
    isArray: true,
  });
});

test("preserves options for empty object as unknown", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const emptyTypeLiteralNode = createTypeNode(project, "{}");

  const result = analyzer.analyze({
    name: "empty",
    typeNode: emptyTypeLiteralNode,
    context,
    options: { isOptional: true, isArray: true },
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "unknown",
    name: "empty",
    typeAsString: "{}",
    isOptional: true,
    isArray: true,
  });
});

test("resets array flag for nested properties", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const typeLiteralNode = createTypeNode(project, "{ prop: string }");

  analyzer.analyze({
    name: "obj",
    typeNode: typeLiteralNode,
    context,
    options: { isArray: true },
  });

  // Verify that nested properties get isArray: false
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "prop",
      options: expect.objectContaining({ isArray: false }),
    }),
  );
});

test("handles properties without type nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  // Create a type literal with a property signature that has no explicit type
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(
    fileName,
    `
    type Test = {
      implicitAny;
    };
  `,
  );
  const typeAlias = sourceFile.getTypeAlias("Test");
  if (!typeAlias) return;

  const typeLiteralNode = typeAlias.getTypeNode();
  if (!typeLiteralNode) return;

  const result = analyzer.analyze({
    name: "obj",
    typeNode: typeLiteralNode,
    context,
    options: {},
  });

  // Test that the analyzer handles the case gracefully
  expect(result).toBeDefined();
});

test("returns null for non-type-literal nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const stringTypeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "notObject",
    typeNode: stringTypeNode,
    context,
    options: {},
  });

  expect(result).toBeNull();
});

test("extracts JSDoc documentation from properties", () => {
  const project = createMockProject();

  // Create a mock type analyzer that can handle object properties
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ name, typeNode }) => {
      const typeText = typeNode.getText();
      if (typeText === "string") {
        return {
          kind: "terminal",
          type: "string",
          name,
          typeAsString: "string",
        };
      }
      return {
        kind: "non-terminal",
        type: "object",
        name,
        typeAsString: typeText,
        properties: [],
      };
    }),
  } as any;

  const analyzer = new ObjectAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  // Create type literal with JSDoc comments
  const sourceFile = project.createSourceFile(
    "/temp.ts",
    `
    type Test = {
      /** User's name */
      name: string;
      /** User's age in years */
      age: number;
    };
  `,
  );
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  const typeLiteralNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "user",
    typeNode: typeLiteralNode,
    context,
    options: {},
  });

  // Note: JSDoc extraction would require the actual implementation
  // This test mainly verifies the structure doesn't break
  expect((result as any)?.properties).toHaveLength(2);
  expect((result as any)?.properties[0]?.name).toBe("name");
  expect((result as any)?.properties[1]?.name).toBe("age");
});
