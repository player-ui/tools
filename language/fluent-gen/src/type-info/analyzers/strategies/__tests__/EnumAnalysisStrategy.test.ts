/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, EnumDeclaration } from "ts-morph";
import { EnumAnalysisStrategy } from "../EnumAnalysisStrategy.js";
import { ExtractorContext } from "../../../core/ExtractorContext.js";
import type { DeclarationAnalysisContext } from "../DeclarationAnalysisStrategy.js";
import type { EnumProperty } from "../../../types.js";

function createMockEnumContext(
  enumCode: string,
  enumName: string,
): DeclarationAnalysisContext {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("/test/enums.ts", enumCode);
  const declaration = sourceFile.getEnum(enumName)!;

  return {
    name: "testEnum",
    typeNode: declaration as any,
    declaration,
    typeName: enumName,
    typeAsString: enumName,
    extractorContext: new ExtractorContext(project, sourceFile),
    options: {},
  };
}

test("handles string enum", () => {
  const enumCode = `
    /** Color enum for styling */
    export enum Color {
      /** Primary color */
      Red = "red",
      Green = "green",
      Blue = "blue"
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "Color");

  const result = strategy.analyze(context) as EnumProperty;

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "testEnum",
    typeAsString: "Color",
    values: ["red", "green", "blue"],
    documentation: "Color enum for styling",
  });
});

test("handles numeric enum", () => {
  const enumCode = `
    export enum Status {
      Inactive = 0,
      Active = 1,
      Pending = 2
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "Status");

  const result = strategy.analyze(context) as EnumProperty;

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "testEnum",
    typeAsString: "Status",
    values: [0, 1, 2],
  });
});

test("handles auto-incremented numeric enum", () => {
  const enumCode = `
    export enum Direction {
      Up,
      Down,
      Left,
      Right
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "Direction");

  const result = strategy.analyze(context) as EnumProperty;

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "testEnum",
    typeAsString: "Direction",
    values: [0, 1, 2, 3],
  });
});

test("handles mixed enum", () => {
  const enumCode = `
    export enum Mixed {
      StringValue = "string",
      NumericValue = 42,
      AutoIncremented
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "Mixed");

  const result = strategy.analyze(context) as EnumProperty;

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "testEnum",
    typeAsString: "Mixed",
    values: ["string", 42, 43],
  });
});

test("handles enum without explicit values", () => {
  const enumCode = `
    export enum SimpleEnum {
      First,
      Second,
      Third
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "SimpleEnum");

  const result = strategy.analyze(context) as EnumProperty;

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "testEnum",
    typeAsString: "SimpleEnum",
    values: [0, 1, 2],
  });
});

test("creates fallback property for empty enum", () => {
  const enumCode = `
    export enum EmptyEnum {
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "EmptyEnum");

  const result = strategy.analyze(context);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "testEnum",
    typeAsString: "EmptyEnum",
    documentation: "Fallback property for unresolved type: EmptyEnum",
  });
});

test("applies options correctly", () => {
  const enumCode = `
    export enum Color {
      Red = "red",
      Green = "green"
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "Color");
  context.options = { isOptional: true, isArray: true };

  const result = strategy.analyze(context) as EnumProperty;

  expect(result).toEqual({
    kind: "terminal",
    type: "enum",
    name: "testEnum",
    typeAsString: "Color",
    values: ["red", "green"],
    isOptional: true,
    isArray: true,
  });
});

test("adds dependency to extractor context", () => {
  const enumCode = `
    export enum Color {
      Red = "red"
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "Color");

  strategy.analyze(context);

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toEqual({
    target: {
      kind: "local",
      filePath: "/test/enums.ts",
      name: "Color",
    },
    dependency: "Color",
  });
});

test("returns strategy name", () => {
  const strategy = new EnumAnalysisStrategy();
  expect(strategy.getName()).toBe("EnumAnalysisStrategy");
});

test("returns false for canHandle with non-enum declaration", () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    "/test/interface.ts",
    `
    export interface TestInterface {
      value: string;
    }
  `,
  );
  const interfaceDecl = sourceFile.getInterface("TestInterface")!;

  const strategy = new EnumAnalysisStrategy();
  expect(strategy.canHandle(interfaceDecl)).toBe(false);
});

test("returns true for canHandle with enum declaration", () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    "/test/enum.ts",
    `
    export enum TestEnum {
      Value = "value"
    }
  `,
  );
  const enumDecl = sourceFile.getEnum("TestEnum")!;

  const strategy = new EnumAnalysisStrategy();
  expect(strategy.canHandle(enumDecl)).toBe(true);
});

test("creates fallback property on error", () => {
  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(
    `export enum TestEnum { Value }`,
    "TestEnum",
  );

  // Mock the extractEnumValues method to throw an error
  const originalAnalyze = strategy.analyze;
  vi.spyOn(strategy, "analyze").mockImplementation((ctx) => {
    // Call original but force an error in enum value extraction
    const declaration = ctx.declaration as EnumDeclaration;
    vi.spyOn(declaration, "getMembers").mockImplementation(() => {
      throw new Error("Test error");
    });
    return originalAnalyze.call(strategy, ctx);
  });

  const result = strategy.analyze(context);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "testEnum",
    typeAsString: "TestEnum",
    documentation: "Fallback property for unresolved type: TestEnum",
  });
});

test("handles computed enum values", () => {
  const enumCode = `
    export enum ComputedEnum {
      A = 1 << 0,
      B = 1 << 1,
      C = 1 << 2
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "ComputedEnum");

  const result = strategy.analyze(context) as EnumProperty;

  expect(result.values).toEqual([1, 2, 4]);
});

test("handles string enum with template literals", () => {
  const enumCode = `
    const prefix = "PREFIX_";
    export enum TemplateEnum {
      First = \`\${prefix}FIRST\`,
      Second = \`\${prefix}SECOND\`
    }
  `;

  const strategy = new EnumAnalysisStrategy();
  const context = createMockEnumContext(enumCode, "TemplateEnum");

  const result = strategy.analyze(context) as EnumProperty;

  // Template literals in enums are evaluated at compile time
  expect(result.values).toEqual(["PREFIX_FIRST", "PREFIX_SECOND"]);
});
