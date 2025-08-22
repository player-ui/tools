/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { IntersectionAnalyzer } from "../IntersectionAnalyzer.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";
import type { TypeAnalyzer } from "../TypeAnalyzer.js";
import type { PropertyInfo } from "../../types.js";

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

      if (typeText === "{ a: string }") {
        return {
          kind: "non-terminal",
          type: "object",
          name,
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "string",
              name: "a",
              typeAsString: "string",
            },
          ],
          ...(options?.isOptional ? { isOptional: true } : {}),
          ...(options?.isArray ? { isArray: true } : {}),
        };
      }

      if (typeText === "{ b: number }") {
        return {
          kind: "non-terminal",
          type: "object",
          name,
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "number",
              name: "b",
              typeAsString: "number",
            },
          ],
          ...(options?.isOptional ? { isOptional: true } : {}),
          ...(options?.isArray ? { isArray: true } : {}),
        };
      }

      // Handle objects with unknown properties
      if (typeText.includes("acceptsUnknown")) {
        return {
          kind: "non-terminal",
          type: "object",
          name,
          typeAsString: typeText,
          properties: [],
          acceptsUnknownProperties: true,
          ...(options?.isOptional ? { isOptional: true } : {}),
          ...(options?.isArray ? { isArray: true } : {}),
        };
      }

      return {
        kind: "non-terminal",
        type: "object",
        name,
        typeAsString: typeText,
        properties: [],
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

test("canHandle identifies intersection type nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new IntersectionAnalyzer(typeAnalyzer);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & { b: number }",
  );
  const unionTypeNode = createTypeNode(project, "string | number");
  const primitiveTypeNode = createTypeNode(project, "string");
  const objectTypeNode = createTypeNode(project, "{ foo: string }");

  expect(analyzer.canHandle(intersectionTypeNode)).toBe(true);
  expect(analyzer.canHandle(unionTypeNode)).toBe(false);
  expect(analyzer.canHandle(primitiveTypeNode)).toBe(false);
  expect(analyzer.canHandle(objectTypeNode)).toBe(false);
});

test("analyzes simple intersection type", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & { b: number }",
  );

  const result = analyzer.analyze({
    name: "combined",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "combined",
    typeAsString: "{ a: string } & { b: number }",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "a",
        typeAsString: "string",
      },
      {
        kind: "terminal",
        type: "number",
        name: "b",
        typeAsString: "number",
      },
    ],
  });

  // Verify intersection elements are analyzed with empty names
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "",
      options: expect.objectContaining({ isOptional: false }),
    }),
  );
});

test("merges properties from multiple intersection elements", () => {
  const project = createMockProject();

  // Create a more complex mock for multiple object types
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();

      if (typeText === "{ a: string; c: boolean }") {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "string",
              name: "a",
              typeAsString: "string",
            },
            {
              kind: "terminal",
              type: "boolean",
              name: "c",
              typeAsString: "boolean",
            },
          ],
        };
      }

      if (typeText === "{ b: number; d: string }") {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "number",
              name: "b",
              typeAsString: "number",
            },
            {
              kind: "terminal",
              type: "string",
              name: "d",
              typeAsString: "string",
            },
          ],
        };
      }

      return null;
    }),
  } as any;

  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string; c: boolean } & { b: number; d: string }",
  );

  const result = analyzer.analyze({
    name: "merged",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(4);
  expect((result as any)?.properties?.map((p: any) => p.name)).toEqual([
    "a",
    "c",
    "b",
    "d",
  ]);
});

test("deduplicates properties by name, keeping last occurrence", () => {
  const project = createMockProject();

  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();

      if (typeText === "{ a: string }") {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "string",
              name: "a",
              typeAsString: "string",
            },
          ],
        };
      }

      if (typeText === "{ a: number }") {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "number",
              name: "a",
              typeAsString: "number",
            },
          ],
        };
      }

      return null;
    }),
  } as any;

  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & { a: number }",
  );

  const result = analyzer.analyze({
    name: "overridden",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(1);
  expect((result as any)?.properties[0]).toEqual({
    kind: "terminal",
    type: "number",
    name: "a",
    typeAsString: "number",
  });
});

test("handles intersection with acceptsUnknownProperties", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & AcceptsUnknownType",
  );

  const result = analyzer.analyze({
    name: "withUnknown",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "withUnknown",
    typeAsString: "{ a: string } & AcceptsUnknownType",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "a",
        typeAsString: "string",
      },
    ],
  });
});

test("includes non-object types as synthetic properties", () => {
  const project = createMockProject();

  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();

      if (typeText === "{ a: string }") {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "string",
              name: "a",
              typeAsString: "string",
            },
          ],
        };
      }

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

  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & string",
  );

  const result = analyzer.analyze({
    name: "mixed",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(2);
  expect((result as any)?.properties[0]).toEqual({
    kind: "terminal",
    type: "string",
    name: "a",
    typeAsString: "string",
  });
  expect((result as any)?.properties[1]).toEqual({
    kind: "terminal",
    type: "string",
    name: "",
    typeAsString: "string",
  });
});

test("preserves options for analyzed intersection", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & { b: number }",
  );

  const result = analyzer.analyze({
    name: "optional",
    typeNode: intersectionTypeNode,
    context,
    options: { isOptional: true, isArray: true },
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "optional",
    typeAsString: "{ a: string } & { b: number }",
    properties: expect.any(Array),
    isOptional: true,
    isArray: true,
  });
});

test("passes generic context to intersection elements", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & { b: number }",
  );
  const mockGenericContext = { hasSubstitution: vi.fn(() => false) };

  analyzer.analyze({
    name: "generic",
    typeNode: intersectionTypeNode,
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

test("skips intersection elements that fail analysis", () => {
  const project = createMockProject();

  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();
      // Only first element succeeds
      if (typeText === "{ a: string }") {
        return {
          kind: "non-terminal",
          type: "object",
          name: "",
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "string",
              name: "a",
              typeAsString: "string",
            },
          ],
        };
      }
      return null;
    }),
  } as any;

  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & UnknownType",
  );

  const result = analyzer.analyze({
    name: "partial",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(1);
  expect((result as any)?.properties[0]?.name).toBe("a");
});

test("returns null for non-intersection types", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const stringTypeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "notIntersection",
    typeNode: stringTypeNode,
    context,
    options: {},
  });

  expect(result).toBeNull();
});

test("handles empty intersection result", () => {
  const project = createMockProject();

  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockReturnValue(null),
  } as any;

  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "UnknownType1 & UnknownType2",
  );

  const result = analyzer.analyze({
    name: "empty",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "empty",
    typeAsString: "UnknownType1 & UnknownType2",
    properties: [],
  });
});

test("handles complex multi-level intersection", () => {
  const project = createMockProject();

  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ typeNode }) => {
      const typeText = typeNode.getText();

      const propertyMaps: Record<string, PropertyInfo[]> = {
        "{ a: string }": [
          {
            kind: "terminal",
            type: "string",
            name: "a",
            typeAsString: "string",
          },
        ],
        "{ b: number }": [
          {
            kind: "terminal",
            type: "number",
            name: "b",
            typeAsString: "number",
          },
        ],
        "{ c: boolean }": [
          {
            kind: "terminal",
            type: "boolean",
            name: "c",
            typeAsString: "boolean",
          },
        ],
      };

      const properties = propertyMaps[typeText] || [];

      return {
        kind: "non-terminal",
        type: "object",
        name: "",
        typeAsString: typeText,
        properties,
      };
    }),
  } as any;

  const analyzer = new IntersectionAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const intersectionTypeNode = createTypeNode(
    project,
    "{ a: string } & { b: number } & { c: boolean }",
  );

  const result = analyzer.analyze({
    name: "complex",
    typeNode: intersectionTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(3);
  expect((result as any)?.properties?.map((p: any) => p.name)).toEqual([
    "a",
    "b",
    "c",
  ]);
  expect((result as any)?.properties?.map((p: any) => p.type)).toEqual([
    "string",
    "number",
    "boolean",
  ]);
});
