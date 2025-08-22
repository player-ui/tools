import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { TypeAliasAnalysisStrategy } from "../TypeAliasAnalysisStrategy.js";
import { TypeAnalyzer } from "../../TypeAnalyzer.js";
import { ExtractorContext } from "../../../core/ExtractorContext.js";
import { GenericContext } from "../../../core/GenericContext.js";
import type { DeclarationAnalysisContext } from "../DeclarationAnalysisStrategy.js";
import type { ObjectProperty, UnionProperty } from "../../../types.js";

function createMockTypeAliasContext(
  aliasCode: string,
  aliasName: string,
  typeArgs?: TypeNode[],
): DeclarationAnalysisContext {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile("/test/aliases.ts", aliasCode);
  const declaration = sourceFile.getTypeAlias(aliasName)!;

  return {
    name: "testAlias",
    typeNode: declaration as unknown as TypeNode,
    declaration,
    typeArgs: typeArgs!,
    typeName: aliasName,
    typeAsString: aliasName,
    extractorContext: new ExtractorContext(project, sourceFile),
    options: {},
  };
}

function createMockTypeAnalyzer(): TypeAnalyzer {
  return {
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

      if (typeText === "number") {
        return {
          kind: "terminal",
          type: "number",
          name,
          typeAsString: "number",
        };
      }

      if (typeText.includes("|")) {
        return {
          kind: "non-terminal",
          type: "union",
          name,
          typeAsString: typeText,
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
        };
      }

      if (typeText.includes("{")) {
        return {
          kind: "non-terminal",
          type: "object",
          name,
          typeAsString: typeText,
          properties: [
            {
              kind: "terminal",
              type: "string",
              name: "value",
              typeAsString: "string",
            },
          ],
        };
      }

      return {
        kind: "terminal",
        type: "string",
        name,
        typeAsString: typeText,
      };
    }),
  } as any;
}

test("analyzes simple primitive type alias", () => {
  const aliasCode = `
    /** String identifier type */
    export type UserId = string;
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "UserId");

  const result = strategy.analyze(context);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "testAlias",
    typeAsString: "UserId", // Should preserve the alias name, not the resolved type
    documentation: "String identifier type",
  });
});

test("analyzes union type alias", () => {
  const aliasCode = `
    /** Status can be active or inactive */
    export type Status = "active" | "inactive";
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "Status");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "testAlias",
    typeAsString: "Status",
    documentation: "Status can be active or inactive",
    properties: [
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

test("analyzes object type alias", () => {
  const aliasCode = `
    /** User configuration object */
    export type UserConfig = {
      name: string;
      age: number;
    };
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "UserConfig");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "testAlias",
    typeAsString: "UserConfig",
    documentation: "User configuration object",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "value",
        typeAsString: "string",
      },
    ],
  });
});

test("handles generic type alias without arguments", () => {
  const aliasCode = `
    export type Container<T = string> = {
      value: T;
    };
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "Container");

  const result = strategy.analyze(context);

  expect(result).toBeDefined();
  // Should call analyzer with default generic context
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        genericContext: expect.any(GenericContext),
      }),
    }),
  );
});

test("handles generic type alias with arguments", () => {
  const aliasCode = `
    export type Wrapper<T, U> = {
      first: T;
      second: U;
    };
  `;

  // Create mock type nodes
  const project = new Project({ useInMemoryFileSystem: true });
  const mockFile = project.createSourceFile("/tmp/mock.ts", "string; number;");
  const stringTypeNode = mockFile.getFirstChildByKind(294)!; // SyntaxKind.StringKeyword
  const numberTypeNode = mockFile.getLastChildByKind(149)!; // SyntaxKind.NumberKeyword

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "Wrapper", [
    stringTypeNode as any,
    numberTypeNode as any,
  ]);

  const result = strategy.analyze(context);

  expect(result).toBeDefined();
  // Should call analyzer with generic context containing substitutions
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        genericContext: expect.any(GenericContext),
      }),
    }),
  );
});

test("creates fallback property when type node is missing", () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    "/test/broken.ts",
    "export type MissingType = string;",
  );
  const aliasDecl = sourceFile.getTypeAlias("MissingType")!;

  // Mock getTypeNode to return null
  vi.spyOn(aliasDecl, "getTypeNode").mockReturnValue(null as any);

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = {
    name: "testAlias",
    typeNode: null as any,
    declaration: aliasDecl,
    typeName: "MissingType",
    typeAsString: "MissingType",
    extractorContext: new ExtractorContext(project, sourceFile),
    options: {},
  };

  const result = strategy.analyze(context);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "testAlias",
    typeAsString: "MissingType",
    documentation: "Fallback property for unresolved type: MissingType",
  });
});

test("creates fallback property when analysis fails", () => {
  const aliasCode = `
    export type TestAlias = string;
  `;

  const typeAnalyzer = {
    analyze: vi.fn().mockReturnValue(null),
  } as any;

  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "TestAlias");

  const result = strategy.analyze(context);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "testAlias",
    typeAsString: "TestAlias",
    documentation: "Fallback property for unresolved type: TestAlias",
  });
});

test("preserves documentation from type alias", () => {
  const aliasCode = `
    /** This is a user ID type */
    export type UserId = string;
  `;

  const typeAnalyzer = {
    analyze: vi.fn().mockReturnValue({
      kind: "terminal",
      type: "string",
      name: "testAlias",
      typeAsString: "string",
    }),
  } as any;

  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "UserId");

  const result = strategy.analyze(context);

  expect(result?.documentation).toBe("This is a user ID type");
});

test("applies analysis options correctly", () => {
  const aliasCode = `
    export type TestAlias = string;
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "TestAlias");
  context.options = { isOptional: true, isArray: true };

  const result = strategy.analyze(context);

  expect(result).toEqual(
    expect.objectContaining({
      isOptional: true,
      isArray: true,
    }),
  );
});

test("adds dependency to extractor context", () => {
  const aliasCode = `
    export type TestAlias = string;
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "TestAlias");

  strategy.analyze(context);

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toEqual({
    target: {
      kind: "local",
      filePath: "/test/aliases.ts",
      name: "TestAlias",
    },
    dependency: "TestAlias",
  });
});

test("returns strategy name", () => {
  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  expect(strategy.getName()).toBe("TypeAliasAnalysisStrategy");
});

test("returns false for canHandle with non-type-alias declaration", () => {
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

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  expect(strategy.canHandle(interfaceDecl)).toBe(false);
});

test("returns true for canHandle with type alias declaration", () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    "/test/alias.ts",
    `
    export type TestAlias = string;
  `,
  );
  const aliasDecl = sourceFile.getTypeAlias("TestAlias")!;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  expect(strategy.canHandle(aliasDecl)).toBe(true);
});

test("creates fallback property on analysis error", () => {
  const aliasCode = `
    export type TestAlias = string;
  `;

  const typeAnalyzer = {
    analyze: vi.fn().mockImplementation(() => {
      throw new Error("Analysis failed");
    }),
  } as any;

  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "TestAlias");

  const result = strategy.analyze(context);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "testAlias",
    typeAsString: "TestAlias",
    documentation: "Fallback property for unresolved type: TestAlias",
  });
});

test("processes union property by converting to object", () => {
  const aliasCode = `
    export type Status = "active" | "inactive";
  `;

  const mockUnionProperty: UnionProperty = {
    kind: "non-terminal",
    type: "union",
    name: "testAlias",
    typeAsString: '"active" | "inactive"',
    elements: [
      {
        kind: "terminal",
        type: "string",
        name: "",
        typeAsString: "string",
      },
    ],
  };

  const typeAnalyzer = {
    analyze: vi.fn().mockReturnValue(mockUnionProperty),
  } as any;

  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "Status");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "testAlias",
    typeAsString: "Status",
    properties: mockUnionProperty.elements,
  });
});

test("preserves object property structure", () => {
  const aliasCode = `
    export type UserConfig = {
      name: string;
      acceptsUnknownProperties: boolean;
    };
  `;

  const mockObjectProperty: ObjectProperty = {
    kind: "non-terminal",
    type: "object",
    name: "testAlias",
    typeAsString: "{ name: string; acceptsUnknownProperties: boolean; }",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "name",
        typeAsString: "string",
      },
    ],
    acceptsUnknownProperties: true,
  };

  const typeAnalyzer = {
    analyze: vi.fn().mockReturnValue(mockObjectProperty),
  } as any;

  const strategy = new TypeAliasAnalysisStrategy(typeAnalyzer);
  const context = createMockTypeAliasContext(aliasCode, "UserConfig");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "testAlias",
    typeAsString: "UserConfig", // Should use alias name, not resolved type
    properties: mockObjectProperty.properties,
    acceptsUnknownProperties: true,
  });
});
