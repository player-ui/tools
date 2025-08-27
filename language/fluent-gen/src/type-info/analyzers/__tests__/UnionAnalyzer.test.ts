/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { UnionAnalyzer } from "../UnionAnalyzer.js";
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

      // Handle object types
      if (typeText.includes("{") || typeText.includes("interface")) {
        return {
          kind: "non-terminal",
          type: "object",
          name,
          typeAsString: typeText,
          properties: [],
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

test("canHandle identifies union type nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);

  const unionTypeNode = createTypeNode(project, "string | number | boolean");
  const primitiveTypeNode = createTypeNode(project, "string");
  const arrayTypeNode = createTypeNode(project, "string[]");
  const objectTypeNode = createTypeNode(project, "{ foo: string }");

  expect(analyzer.canHandle(unionTypeNode)).toBe(true);
  expect(analyzer.canHandle(primitiveTypeNode)).toBe(false);
  expect(analyzer.canHandle(arrayTypeNode)).toBe(false);
  expect(analyzer.canHandle(objectTypeNode)).toBe(false);
});

test("analyzes string literal union as single string property", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const stringLiteralUnionNode = createTypeNode(
    project,
    '"primary" | "secondary" | "tertiary"',
  );

  const result = analyzer.analyze({
    name: "status",
    typeNode: stringLiteralUnionNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "status",
    typeAsString: '"primary" | "secondary" | "tertiary"',
  });
});

test("analyzes mixed type union as union property", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const mixedUnionNode = createTypeNode(project, "string | number | boolean");

  const result = analyzer.analyze({
    name: "value",
    typeNode: mixedUnionNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "union",
    name: "value",
    typeAsString: "string | number | boolean",
    elements: [
      {
        kind: "terminal",
        type: "string",
        name: "",
        typeAsString: "string",
      },
      {
        kind: "terminal",
        type: "number",
        name: "",
        typeAsString: "number",
      },
      {
        kind: "terminal",
        type: "boolean",
        name: "",
        typeAsString: "boolean",
      },
    ],
  });

  // Verify that union elements are analyzed with empty names
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "",
      options: expect.objectContaining({ isArray: false }),
    }),
  );
});

test("preserves options for string literal union", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const stringLiteralUnionNode = createTypeNode(project, '"a" | "b"');

  const result = analyzer.analyze({
    name: "choice",
    typeNode: stringLiteralUnionNode,
    context,
    options: { isOptional: true, isArray: true },
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "choice",
    typeAsString: '"a" | "b"',
    isOptional: true,
    isArray: true,
  });
});

test("preserves options for mixed union", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const mixedUnionNode = createTypeNode(project, "string | number");

  const result = analyzer.analyze({
    name: "value",
    typeNode: mixedUnionNode,
    context,
    options: { isOptional: true, isArray: true },
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "union",
    name: "value",
    typeAsString: "string | number",
    elements: expect.any(Array),
    isOptional: true,
    isArray: true,
  });
});

test("passes generic context to union elements", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const unionNode = createTypeNode(project, "string | number");
  const mockGenericContext = { hasSubstitution: vi.fn(() => false) };

  analyzer.analyze({
    name: "value",
    typeNode: unionNode,
    context,
    options: { genericContext: mockGenericContext as any },
  });

  // Verify generic context is passed through
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        genericContext: mockGenericContext,
      }),
    }),
  );
});

test("skips union elements that fail analysis", () => {
  const project = createMockProject();
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();
      // Only string succeeds, number fails
      if (typeText === "string") {
        return {
          kind: "terminal",
          type: "string",
          name: "",
          typeAsString: "string",
        };
      }
      return null;
    }),
  } as any;

  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const unionNode = createTypeNode(project, "string | UnknownType");

  const result = analyzer.analyze({
    name: "value",
    typeNode: unionNode,
    context,
    options: {},
  });

  expect((result as any)?.elements).toHaveLength(1);
  expect((result as any)?.elements[0]).toEqual({
    kind: "terminal",
    type: "string",
    name: "",
    typeAsString: "string",
  });
});

test("returns null when no elements can be analyzed", () => {
  const project = createMockProject();
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockReturnValue(null),
  } as any;

  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const unionNode = createTypeNode(project, "UnknownType1 | UnknownType2");

  const result = analyzer.analyze({
    name: "value",
    typeNode: unionNode,
    context,
    options: {},
  });

  expect(result).toBeNull();
});

test("returns null for non-union types", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const stringTypeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "notUnion",
    typeNode: stringTypeNode,
    context,
    options: {},
  });

  expect(result).toBeNull();
});

test("expands object union elements with empty properties", () => {
  const project = createMockProject();

  // Create a more sophisticated mock that returns empty object properties
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();
      if (typeText.includes("Interface")) {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [], // Empty properties to trigger expansion
        };
      }
      return {
        kind: "terminal",
        type: "string",
        name: "",
        typeAsString: typeText,
      };
    }),
  } as any;

  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const unionNode = createTypeNode(project, "string | SomeInterface");

  const result = analyzer.analyze({
    name: "value",
    typeNode: unionNode,
    context,
    options: {},
  });

  expect((result as any)?.elements).toHaveLength(2);
  expect((result as any)?.elements[0]).toEqual({
    kind: "terminal",
    type: "string",
    name: "",
    typeAsString: "string",
  });
  expect((result as any)?.elements[1]).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "",
    typeAsString: "SomeInterface",
    properties: [],
  });
});

test("handles union with interface that has circular dependencies", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new UnionAnalyzer(typeAnalyzer);

  // Create a context that simulates circular dependency detection
  const sourceFile = project.createSourceFile("/test.ts", "");
  const context = new ExtractorContext(project, sourceFile);

  // Mock circular dependency detection
  vi.spyOn(context, "enterCircularCheck").mockReturnValue(false);

  const unionNode = createTypeNode(project, "string | SomeInterface");

  const result = analyzer.analyze({
    name: "value",
    typeNode: unionNode,
    context,
    options: {},
  });

  // Should still return union with available elements
  expect(result).toBeDefined();
  expect((result as any)?.elements).toHaveLength(2);
});

test("handles complex union with multiple object types", () => {
  const project = createMockProject();

  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();

      if (typeText.includes("{")) {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "string",
              name: "prop",
              typeAsString: "string",
            },
          ],
        };
      }

      return {
        kind: "terminal",
        type: "string",
        name: "",
        typeAsString: typeText,
      };
    }),
  } as any;

  const analyzer = new UnionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const unionNode = createTypeNode(
    project,
    "string | { prop: string } | { other: number }",
  );

  const result = analyzer.analyze({
    name: "complexUnion",
    typeNode: unionNode,
    context,
    options: {},
  });

  expect((result as any)?.elements).toHaveLength(3);
  expect((result as any)?.elements[0]?.typeAsString).toBe("string");
  expect((result as any)?.elements[1]?.typeAsString).toBe("{ prop: string }");
  expect((result as any)?.elements[2]?.typeAsString).toBe("{ other: number }");
});
