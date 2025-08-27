/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { TupleAnalyzer } from "../TupleAnalyzer.js";
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

test("canHandle identifies tuple type nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);

  const tupleTypeNode = createTypeNode(project, "[string, number, boolean]");
  const arrayTypeNode = createTypeNode(project, "string[]");
  const primitiveTypeNode = createTypeNode(project, "string");
  const objectTypeNode = createTypeNode(project, "{ foo: string }");

  expect(analyzer.canHandle(tupleTypeNode)).toBe(true);
  expect(analyzer.canHandle(arrayTypeNode)).toBe(false);
  expect(analyzer.canHandle(primitiveTypeNode)).toBe(false);
  expect(analyzer.canHandle(objectTypeNode)).toBe(false);
});

test("analyzes simple tuple type", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string, number, boolean]");

  const result = analyzer.analyze({
    name: "tuple",
    typeNode: tupleTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "tuple",
    typeAsString: "[string, number, boolean]",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "0",
        typeAsString: "string",
      },
      {
        kind: "terminal",
        type: "number",
        name: "1",
        typeAsString: "number",
      },
      {
        kind: "terminal",
        type: "boolean",
        name: "2",
        typeAsString: "boolean",
      },
    ],
  });

  // Verify each element was analyzed with correct index names
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "0",
      options: expect.objectContaining({ isArray: false }),
    }),
  );
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "1",
      options: expect.objectContaining({ isArray: false }),
    }),
  );
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "2",
      options: expect.objectContaining({ isArray: false }),
    }),
  );
});

test("analyzes empty tuple", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const emptyTupleTypeNode = createTypeNode(project, "[]");

  const result = analyzer.analyze({
    name: "emptyTuple",
    typeNode: emptyTupleTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "emptyTuple",
    typeAsString: "[]",
    properties: [],
  });
});

test("analyzes single element tuple", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const singleTupleTypeNode = createTypeNode(project, "[string]");

  const result = analyzer.analyze({
    name: "singleTuple",
    typeNode: singleTupleTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "singleTuple",
    typeAsString: "[string]",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "0",
        typeAsString: "string",
      },
    ],
  });
});

test("preserves options for analyzed tuple", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string, number]");

  const result = analyzer.analyze({
    name: "optionalTuple",
    typeNode: tupleTypeNode,
    context,
    options: { isOptional: true, isArray: true },
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "optionalTuple",
    typeAsString: "[string, number]",
    properties: expect.any(Array),
    isOptional: true,
    isArray: true,
  });
});

test("resets array flag for tuple elements", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string, number]");

  analyzer.analyze({
    name: "tuple",
    typeNode: tupleTypeNode,
    context,
    options: { isArray: true },
  });

  // Verify that tuple elements get isArray: false
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "0",
      options: expect.objectContaining({ isArray: false }),
    }),
  );
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      name: "1",
      options: expect.objectContaining({ isArray: false }),
    }),
  );
});

test("passes through other options to element analyzer", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string]");

  analyzer.analyze({
    name: "tuple",
    typeNode: tupleTypeNode,
    context,
    options: { isOptional: true, maxDepth: 5 },
  });

  expect(typeAnalyzer.analyze).toHaveBeenCalledWith({
    name: "0",
    typeNode: expect.any(Object),
    context,
    options: {
      isOptional: true,
      maxDepth: 5,
      isArray: false,
    },
  });
});

test("handles complex tuple element types", () => {
  const project = createMockProject();
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ name }) => {
      return {
        kind: "non-terminal",
        type: "object",
        name,
        typeAsString: "ComplexType",
        properties: [
          {
            kind: "terminal",
            type: "string",
            name: "prop",
            typeAsString: "string",
          },
        ],
      };
    }),
  } as any;

  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(
    project,
    "[{ prop: string }, { other: number }]",
  );

  const result = analyzer.analyze({
    name: "complexTuple",
    typeNode: tupleTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(2);
  expect((result as any)?.properties[0]).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "0",
    typeAsString: "ComplexType",
    properties: expect.any(Array),
  });
});

test("skips elements that fail analysis", () => {
  const project = createMockProject();
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ name }) => {
      // First element succeeds, second fails
      if (name === "0") {
        return {
          kind: "terminal",
          type: "string",
          name,
          typeAsString: "string",
        };
      }
      return null;
    }),
  } as any;

  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string, UnknownType]");

  const result = analyzer.analyze({
    name: "partialTuple",
    typeNode: tupleTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(1);
  expect((result as any)?.properties[0]?.name).toBe("0");
});

test("returns null for non-tuple types", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const stringTypeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "notTuple",
    typeNode: stringTypeNode,
    context,
    options: {},
  });

  expect(result).toBeNull();
});

test("handles analysis errors gracefully", () => {
  const project = createMockProject();
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn().mockImplementation(() => {
      throw new Error("Analysis failed");
    }),
  } as any;

  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string, number]");

  const result = analyzer.analyze({
    name: "errorTuple",
    typeNode: tupleTypeNode,
    context,
    options: {},
  });

  // Should handle the error and return null
  expect(result).toBeNull();
});

test("analyzes tuple with mixed primitive and complex types", () => {
  const project = createMockProject();
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

      // Return object type for complex element
      return {
        kind: "non-terminal",
        type: "object",
        name,
        typeAsString: typeText,
        properties: [],
      };
    }),
  } as any;

  const analyzer = new TupleAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string, { foo: number }]");

  const result = analyzer.analyze({
    name: "mixedTuple",
    typeNode: tupleTypeNode,
    context,
    options: {},
  });

  expect((result as any)?.properties).toHaveLength(2);
  expect((result as any)?.properties[0]).toEqual({
    kind: "terminal",
    type: "string",
    name: "0",
    typeAsString: "string",
  });
  expect((result as any)?.properties[1]).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "1",
    typeAsString: "{ foo: number }",
    properties: [],
  });
});
