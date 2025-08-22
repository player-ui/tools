import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { UtilityTypeExpander } from "../UtilityTypeExpander.js";
import type { PropertyInfo } from "../../types.js";

class TestUtilityTypeExpander extends UtilityTypeExpander {
  getTypeName(): string {
    return "Test";
  }

  expand(): PropertyInfo | null {
    return null;
  }
}

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createTypeNode(project: Project, code: string): TypeNode {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, `type Test = ${code};`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  return typeAlias.getTypeNode()!;
}

test("returns type name", () => {
  const expander = new TestUtilityTypeExpander();
  expect(expander.getTypeName()).toBe("Test");
});

test("validates correct number of type arguments", () => {
  const project = createMockProject();
  const expander = new TestUtilityTypeExpander();

  const typeNode1 = createTypeNode(project, "string");
  const typeNode2 = createTypeNode(project, "number");

  expect(expander["validateTypeArguments"]([typeNode1, typeNode2], 2)).toBe(
    true,
  );
});

test("validates incorrect number of type arguments", () => {
  const project = createMockProject();
  const expander = new TestUtilityTypeExpander();
  const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

  const typeNode = createTypeNode(project, "string");

  expect(expander["validateTypeArguments"]([typeNode], 2)).toBe(false);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Test expects 2 type arguments, got 1",
  );

  consoleWarnSpy.mockRestore();
});

test("extracts string literal from single literal type", () => {
  const project = createMockProject();
  const expander = new TestUtilityTypeExpander();

  const typeNode = createTypeNode(project, '"hello"');
  const result = expander["extractStringLiteralUnion"](typeNode);

  expect(result).toEqual(["hello"]);
});

test("extracts string literals from union type", () => {
  const project = createMockProject();
  const expander = new TestUtilityTypeExpander();

  const typeNode = createTypeNode(project, '"a" | "b" | "c"');
  const result = expander["extractStringLiteralUnion"](typeNode);

  expect(result).toEqual(["a", "b", "c"]);
});

test("returns empty array for non-literal types", () => {
  const project = createMockProject();
  const expander = new TestUtilityTypeExpander();

  const typeNode = createTypeNode(project, "string");
  const result = expander["extractStringLiteralUnion"](typeNode);

  expect(result).toEqual([]);
});

test("handles mixed union with non-literal types", () => {
  const project = createMockProject();
  const expander = new TestUtilityTypeExpander();

  const typeNode = createTypeNode(project, '"literal" | string');
  const result = expander["extractStringLiteralUnion"](typeNode);

  expect(result).toEqual(["literal"]);
});
