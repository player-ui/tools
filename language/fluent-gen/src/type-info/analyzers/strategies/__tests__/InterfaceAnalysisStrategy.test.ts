/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { InterfaceAnalysisStrategy } from "../InterfaceAnalysisStrategy.js";
import { TypeAnalyzer } from "../../TypeAnalyzer.js";
import { ExtractorContext } from "../../../core/ExtractorContext.js";
import { GenericContext } from "../../../core/GenericContext.js";
import type { DeclarationAnalysisContext } from "../DeclarationAnalysisStrategy.js";
import type { ObjectProperty } from "../../../types.js";

function createMockInterfaceContext(
  interfaceCode: string,
  interfaceName: string,
  typeArgs?: TypeNode[],
): DeclarationAnalysisContext {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    "/test/interfaces.ts",
    interfaceCode,
  );
  const declaration = sourceFile.getInterface(interfaceName)!;

  return {
    name: "testInterface",
    typeNode: declaration as unknown as TypeNode,
    declaration,
    typeArgs: typeArgs!,
    typeName: interfaceName,
    typeAsString: interfaceName,
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

      if (typeText === "boolean") {
        return {
          kind: "terminal",
          type: "boolean",
          name,
          typeAsString: "boolean",
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
}

test("analyzes basic interface with simple properties", () => {
  const interfaceCode = `
    /** User interface for authentication */
    export interface User {
      /** User's unique identifier */
      id: string;
      /** User's display name */
      name: string;
      /** User's age */
      age: number;
      /** Whether user is active */
      isActive: boolean;
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "User");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "testInterface",
    typeAsString: "User",
    documentation: "User interface for authentication",
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "id",
        typeAsString: "string",
        documentation: "User's unique identifier",
      },
      {
        kind: "terminal",
        type: "string",
        name: "name",
        typeAsString: "string",
        documentation: "User's display name",
      },
      {
        kind: "terminal",
        type: "number",
        name: "age",
        typeAsString: "number",
        documentation: "User's age",
      },
      {
        kind: "terminal",
        type: "boolean",
        name: "isActive",
        typeAsString: "boolean",
        documentation: "Whether user is active",
      },
    ],
  });
});

test("handles optional properties", () => {
  const interfaceCode = `
    export interface OptionalProps {
      required: string;
      optional?: number;
    }
  `;

  const typeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ name, typeNode, options }) => {
      const typeText = typeNode.getText();

      if (typeText === "string") {
        return {
          kind: "terminal",
          type: "string",
          name,
          typeAsString: "string",
          ...(options?.isOptional && { isOptional: true }),
        };
      }

      if (typeText === "number") {
        return {
          kind: "terminal",
          type: "number",
          name,
          typeAsString: "number",
          ...(options?.isOptional && { isOptional: true }),
        };
      }

      return {
        kind: "non-terminal",
        type: "object",
        name,
        typeAsString: typeText,
        properties: [],
        ...(options?.isOptional && { isOptional: true }),
      };
    }),
  } as any;

  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "OptionalProps");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result.properties).toHaveLength(2);
  expect(result.properties[0]).not.toHaveProperty("isOptional");
  expect(result.properties[1]).toHaveProperty("isOptional", true);
});

test("handles generic interface without type arguments", () => {
  const interfaceCode = `
    export interface Container<T = string> {
      value: T;
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "Container");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toBeDefined();
  expect(result.properties).toHaveLength(1);
  // Type analyzer should receive the generic context with default substitutions
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        genericContext: expect.any(GenericContext),
      }),
    }),
  );
});

test("handles generic interface with type arguments", () => {
  const interfaceCode = `
    export interface Wrapper<T, U> {
      first: T;
      second: U;
    }
  `;

  // Create mock type nodes
  const project = new Project({ useInMemoryFileSystem: true });
  const mockFile = project.createSourceFile("/tmp/mock.ts", "string; number;");
  const stringTypeNode = mockFile.getFirstChildByKind(294)!; // SyntaxKind.StringKeyword
  const numberTypeNode = mockFile.getLastChildByKind(149)!; // SyntaxKind.NumberKeyword

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "Wrapper", [
    stringTypeNode as any,
    numberTypeNode as any,
  ]);

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toBeDefined();
  expect(result.properties).toHaveLength(2);
  // Type analyzer should receive generic context with substitutions
  expect(typeAnalyzer.analyze).toHaveBeenCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        genericContext: expect.any(GenericContext),
      }),
    }),
  );
});

test("handles circular dependency detection", () => {
  const interfaceCode = `
    export interface Node {
      value: string;
      child: Node;
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "Node");

  // Mock the circular dependency check to return false (circular detected)
  vi.spyOn(context.extractorContext, "enterCircularCheck").mockReturnValue(
    false,
  );

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result.properties).toEqual([]);
});

test("creates fallback properties for unresolved types", () => {
  const interfaceCode = `
    export interface TestInterface {
      resolvedProp: string;
      unresolvedProp: UnknownType;
    }
  `;

  const typeAnalyzer = {
    analyze: vi.fn().mockImplementation(({ name, typeNode }) => {
      if (typeNode.getText() === "string") {
        return {
          kind: "terminal",
          type: "string",
          name,
          typeAsString: "string",
        };
      }
      return null; // Unresolved type
    }),
  } as any;

  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "TestInterface");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result.properties).toHaveLength(2);
  expect(result.properties[1]).toEqual({
    kind: "terminal",
    type: "string",
    name: "unresolvedProp",
    typeAsString: "UnknownType",
    documentation: "Fallback property for unresolved type: UnknownType",
  });
});

test("applies analysis options correctly", () => {
  const interfaceCode = `
    export interface TestInterface {
      value: string;
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "TestInterface");
  context.options = { isOptional: true, isArray: true };

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "testInterface",
    typeAsString: "TestInterface",
    properties: expect.any(Array),
    isOptional: true,
    isArray: true,
  });
});

test("adds dependency to extractor context", () => {
  const interfaceCode = `
    export interface TestInterface {
      value: string;
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "TestInterface");

  strategy.analyze(context);

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toEqual({
    target: {
      kind: "local",
      filePath: "/test/interfaces.ts",
      name: "TestInterface",
    },
    dependency: "TestInterface",
  });
});

test("returns strategy name", () => {
  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  expect(strategy.getName()).toBe("InterfaceAnalysisStrategy");
});

test("returns false for canHandle with non-interface declaration", () => {
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

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  expect(strategy.canHandle(enumDecl)).toBe(false);
});

test("returns true for canHandle with interface declaration", () => {
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
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  expect(strategy.canHandle(interfaceDecl)).toBe(true);
});

test("creates fallback property on analysis error", () => {
  const interfaceCode = `
    export interface TestInterface {
      value: string;
    }
  `;

  const typeAnalyzer = {
    analyze: vi.fn().mockImplementation(() => {
      throw new Error("Analysis failed");
    }),
  } as any;

  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "TestInterface");

  const result = strategy.analyze(context);

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "testInterface",
    typeAsString: "TestInterface",
    documentation: "Fallback property for unresolved type: TestInterface",
  });
});

test("handles interface with extends clause", () => {
  const interfaceCode = `
    export interface Base {
      id: string;
    }
    
    export interface Extended extends Base {
      name: string;
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "Extended");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toBeDefined();
  expect(result.properties).toHaveLength(1); // Only direct properties are analyzed
  expect(result.properties[0]?.name).toBe("name");
});

test("passes generic context to child analyses", () => {
  const interfaceCode = `
    export interface Generic<T> {
      value: T;
      nested: Array<T>;
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "Generic");

  // Create mock type node for substitution
  const project = new Project({ useInMemoryFileSystem: true });
  const mockFile = project.createSourceFile("/tmp/mock.ts", "string");
  const stringTypeNode = mockFile.getFirstChildByKind(294)!; // SyntaxKind.StringKeyword

  const substitutions = new Map();
  substitutions.set("T", stringTypeNode as any);

  context.options = {
    genericContext: GenericContext.empty().withSubstitutions(substitutions),
  };

  strategy.analyze(context);

  // Verify that child analyses receive the generic context
  const analyzerCalls = (typeAnalyzer.analyze as any).mock.calls;
  expect(
    analyzerCalls.every(
      (call: any) => call[0].options?.genericContext instanceof GenericContext,
    ),
  ).toBe(true);
});

test("handles interface with no properties", () => {
  const interfaceCode = `
    /** Empty marker interface */
    export interface EmptyInterface {
    }
  `;

  const typeAnalyzer = createMockTypeAnalyzer();
  const strategy = new InterfaceAnalysisStrategy(typeAnalyzer);
  const context = createMockInterfaceContext(interfaceCode, "EmptyInterface");

  const result = strategy.analyze(context) as ObjectProperty;

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "testInterface",
    typeAsString: "EmptyInterface",
    documentation: "Empty marker interface",
    properties: [],
  });
});
