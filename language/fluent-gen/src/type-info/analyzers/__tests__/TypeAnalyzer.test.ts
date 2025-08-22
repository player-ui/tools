/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { TypeAnalyzer } from "../TypeAnalyzer.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";
import { GenericContext } from "../../core/GenericContext.js";

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

test("analyzes primitive types using PrimitiveAnalyzer", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const stringTypeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "str",
    typeNode: stringTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "str",
    typeAsString: "string",
  });
});

test("analyzes array types using ArrayAnalyzer", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
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
});

test("analyzes tuple types using TupleAnalyzer", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const tupleTypeNode = createTypeNode(project, "[string, number]");

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
    typeAsString: "[string, number]",
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
    ],
  });
});

test("analyzes union types using UnionAnalyzer", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const unionTypeNode = createTypeNode(project, "string | number");

  const result = analyzer.analyze({
    name: "value",
    typeNode: unionTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "union",
    name: "value",
    typeAsString: "string | number",
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
    ],
  });
});

test("analyzes intersection types using IntersectionAnalyzer", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
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
});

test("analyzes object types using ObjectAnalyzer", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const objectTypeNode = createTypeNode(
    project,
    "{ name: string; age: number }",
  );

  const result = analyzer.analyze({
    name: "person",
    typeNode: objectTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "person",
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

test("applies depth limiting to prevent infinite recursion", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "deep",
    typeNode,
    context,
    options: { currentDepth: 10, maxDepth: 10 },
  });

  // Should create fallback property at max depth
  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "deep",
    typeAsString: "string",
  });
});

test("increments depth for recursive analysis", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  // Mock a strategy to verify depth increment
  const mockStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => ({
      kind: "terminal",
      type: "string",
      name: "test",
      typeAsString: "string",
    })),
  };

  // Replace the first strategy
  (analyzer as any).strategies[0] = mockStrategy;

  const typeNode = createTypeNode(project, "string");

  analyzer.analyze({
    name: "test",
    typeNode,
    context,
    options: { currentDepth: 2 },
  });

  expect(mockStrategy.analyze).toHaveBeenCalledWith({
    name: "test",
    typeNode,
    context,
    options: { currentDepth: 3 },
  });
});

test("preserves generic context through recursive calls", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const mockStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => ({
      kind: "terminal",
      type: "string",
      name: "test",
      typeAsString: "string",
    })),
  };

  (analyzer as any).strategies[0] = mockStrategy;

  const typeNode = createTypeNode(project, "string");
  const genericContext = GenericContext.empty();

  analyzer.analyze({
    name: "test",
    typeNode,
    context,
    options: { genericContext },
  });

  expect(mockStrategy.analyze).toHaveBeenCalledWith({
    name: "test",
    typeNode,
    context,
    options: {
      currentDepth: 1,
      genericContext,
    },
  });
});

test("creates fallback property when no strategy handles the type", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  // Mock all strategies to return false for canHandle
  (analyzer as any).strategies.forEach((strategy: any) => {
    strategy.canHandle = vi.fn(() => false);
  });

  const typeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "fallback",
    typeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "fallback",
    typeAsString: "string",
  });
});

test("creates fallback property when strategy returns null", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  // Mock first strategy to handle but return null
  const mockStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => null),
  };

  (analyzer as any).strategies[0] = mockStrategy;

  const typeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "fallback",
    typeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "fallback",
    typeAsString: "string",
  });
});

test("uses first strategy that can handle the type", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const firstStrategy = {
    canHandle: vi.fn(() => false),
    analyze: vi.fn(),
  };

  const secondStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => ({
      kind: "terminal",
      type: "handled",
      name: "test",
      typeAsString: "string",
    })),
  };

  const thirdStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(),
  };

  (analyzer as any).strategies = [firstStrategy, secondStrategy, thirdStrategy];

  const typeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "test",
    typeNode,
    context,
    options: {},
  });

  expect(result?.type).toBe("handled");
  expect(firstStrategy.canHandle).toHaveBeenCalled();
  expect(secondStrategy.canHandle).toHaveBeenCalled();
  expect(secondStrategy.analyze).toHaveBeenCalled();
  expect(thirdStrategy.canHandle).not.toHaveBeenCalled();
});

test("getUtilityTypeRegistry returns registry instance", () => {
  const analyzer = new TypeAnalyzer();
  const registry = analyzer.getUtilityTypeRegistry();

  expect(registry).toBeDefined();
  expect(typeof registry.isUtilityType).toBe("function");
  expect(typeof registry.expand).toBe("function");
});

test("getStrategies returns strategy names", () => {
  const analyzer = new TypeAnalyzer();
  const strategies = analyzer.getStrategies();

  expect(strategies).toContain("ArrayAnalyzer");
  expect(strategies).toContain("TupleAnalyzer");
  expect(strategies).toContain("UnionAnalyzer");
  expect(strategies).toContain("IntersectionAnalyzer");
  expect(strategies).toContain("PrimitiveAnalyzer");
  expect(strategies).toContain("ObjectAnalyzer");
  expect(strategies).toContain("ReferenceAnalyzer");
});

test("strategies are registered in correct precedence order", () => {
  const analyzer = new TypeAnalyzer();
  const strategies = analyzer.getStrategies();

  // Verify the order matches the expected precedence
  expect(strategies).toEqual([
    "ArrayAnalyzer",
    "TupleAnalyzer",
    "UnionAnalyzer",
    "IntersectionAnalyzer",
    "PrimitiveAnalyzer",
    "ObjectAnalyzer",
    "ReferenceAnalyzer",
  ]);
});

test("handles strategy throwing an error gracefully", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const errorStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => {
      throw new Error("Strategy error");
    }),
  };

  const fallbackStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => ({
      kind: "terminal",
      type: "string",
      name: "fallback",
      typeAsString: "string",
    })),
  };

  (analyzer as any).strategies = [errorStrategy, fallbackStrategy];

  const typeNode = createTypeNode(project, "string");

  // Expect the error to be thrown since it's not caught within the strategy
  expect(() =>
    analyzer.analyze({
      name: "test",
      typeNode,
      context,
      options: {},
    }),
  ).toThrow("Strategy error");
});

test("preserves all options through analysis", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "string");
  const genericContext = GenericContext.empty();

  const result = analyzer.analyze({
    name: "test",
    typeNode,
    context,
    options: {
      isOptional: true,
      isArray: true,
      maxDepth: 5,
      genericContext,
    },
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "test",
    typeAsString: "string",
    isOptional: true,
    isArray: true,
  });
});

test("uses default maxDepth when not specified", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const mockStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => ({
      kind: "terminal",
      type: "string",
      name: "test",
      typeAsString: "string",
    })),
  };

  (analyzer as any).strategies[0] = mockStrategy;

  const typeNode = createTypeNode(project, "string");

  analyzer.analyze({
    name: "test",
    typeNode,
    context,
    options: { currentDepth: 9 },
  });

  // Should use default maxDepth of 10
  expect(mockStrategy.analyze).toHaveBeenCalledWith({
    name: "test",
    typeNode,
    context,
    options: { currentDepth: 10 },
  });
});

test("uses default currentDepth when not specified", () => {
  const project = createMockProject();
  const analyzer = new TypeAnalyzer();
  const context = createMockContext(project);

  const mockStrategy = {
    canHandle: vi.fn(() => true),
    analyze: vi.fn(() => ({
      kind: "terminal",
      type: "string",
      name: "test",
      typeAsString: "string",
    })),
  };

  (analyzer as any).strategies[0] = mockStrategy;

  const typeNode = createTypeNode(project, "string");

  analyzer.analyze({
    name: "test",
    typeNode,
    context,
    options: {},
  });

  // Should use default currentDepth of 0, incremented to 1
  expect(mockStrategy.analyze).toHaveBeenCalledWith({
    name: "test",
    typeNode,
    context,
    options: { currentDepth: 1 },
  });
});
