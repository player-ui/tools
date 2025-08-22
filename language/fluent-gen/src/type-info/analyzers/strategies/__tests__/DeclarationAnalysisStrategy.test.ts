import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import {
  BaseDeclarationAnalysisStrategy,
  type DeclarationAnalysisContext,
} from "../DeclarationAnalysisStrategy.js";
import { ExtractorContext } from "../../../core/ExtractorContext.js";
import type { AnalysisOptions } from "../../TypeAnalyzer.js";

class TestStrategy extends BaseDeclarationAnalysisStrategy {
  canHandle() {
    return true;
  }
  analyze() {
    return null;
  }
  getName() {
    return "TestStrategy";
  }

  public testAddDependency(
    context: DeclarationAnalysisContext,
    dependencyName: string,
  ) {
    this.addDependency(context, dependencyName);
  }

  public testCreateChildAnalysisOptions(
    context: DeclarationAnalysisContext,
    overrides?: Partial<AnalysisOptions>,
  ) {
    return this.createChildAnalysisOptions(context, overrides);
  }
}

function createMockContext(
  sourceFilePath: string = "/test/file.ts",
  isExternal = false,
): DeclarationAnalysisContext {
  const project = new Project({ useInMemoryFileSystem: true });
  const sourceFile = project.createSourceFile(
    sourceFilePath,
    `
    export interface TestInterface {
      value: string;
    }
  `,
  );

  if (isExternal) {
    vi.spyOn(sourceFile, "isFromExternalLibrary").mockReturnValue(true);
    vi.spyOn(sourceFile, "isInNodeModules").mockReturnValue(true);
  }

  const declaration = sourceFile.getInterface("TestInterface")!;
  const extractorContext = new ExtractorContext(project, sourceFile);

  // Create a mock type node
  const mockTypeNode = project
    .createSourceFile("/tmp/mock.ts", "string")
    .getFirstChildByKind(294)!; // SyntaxKind.StringKeyword

  return {
    name: "test",
    typeNode: mockTypeNode as unknown as TypeNode,
    declaration,
    typeName: "TestInterface",
    typeAsString: "TestInterface",
    extractorContext,
    options: {},
  };
}

test("adds local dependency for local source file", () => {
  const strategy = new TestStrategy();
  const context = createMockContext("/project/src/types.ts");

  strategy.testAddDependency(context, "TestType");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toEqual({
    target: {
      kind: "local",
      filePath: "/project/src/types.ts",
      name: "TestType",
    },
    dependency: "TestType",
  });
});

test("adds module dependency for external library", () => {
  const strategy = new TestStrategy();
  const context = createMockContext(
    "/node_modules/@types/react/index.d.ts",
    true,
  );

  strategy.testAddDependency(context, "ReactNode");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toEqual({
    target: {
      kind: "module",
      name: "@types/react",
    },
    dependency: "ReactNode",
  });
});

test("extracts module name from node_modules path", () => {
  const strategy = new TestStrategy();
  const context = createMockContext(
    "/project/node_modules/typescript/lib/lib.d.ts",
    true,
  );

  strategy.testAddDependency(context, "Promise");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies[0]?.target).toEqual({
    kind: "module",
    name: "typescript",
  });
});

test("extracts scoped module name from node_modules path", () => {
  const strategy = new TestStrategy();
  const context = createMockContext(
    "/project/node_modules/@babel/types/lib/index.d.ts",
    true,
  );

  strategy.testAddDependency(context, "Node");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies[0]?.target).toEqual({
    kind: "module",
    name: "@babel/types",
  });
});

test("extracts module name from pnpm workspace path", () => {
  const strategy = new TestStrategy();
  const context = createMockContext(
    "/project/.pnpm/react@18.2.0/node_modules/react/index.d.ts",
    true,
  );

  strategy.testAddDependency(context, "Component");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies[0]?.target).toEqual({
    kind: "module",
    name: "react",
  });
});

test("extracts scoped module name from pnpm workspace path", () => {
  const strategy = new TestStrategy();
  const context = createMockContext(
    "/project/.pnpm/@babel+core@7.22.0/node_modules/@babel/core/lib/index.d.ts",
    true,
  );

  strategy.testAddDependency(context, "transform");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies[0]?.target).toEqual({
    kind: "module",
    name: "@babel+core", // The actual extracted name uses + instead of / for pnpm paths
  });
});

test("creates child analysis options with defaults", () => {
  const strategy = new TestStrategy();
  const context = createMockContext();
  context.options = { isOptional: true };

  const childOptions = strategy.testCreateChildAnalysisOptions(context);

  expect(childOptions).toEqual({ isOptional: true });
});

test("handles fallback module name extraction", () => {
  const strategy = new TestStrategy();
  const context = createMockContext("/unknown/path/file.ts", true);

  strategy.testAddDependency(context, "UnknownType");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies[0]?.target).toEqual({
    kind: "module",
    name: "/unknown/path/file.ts",
  });
});

test("finds module name through import declarations", () => {
  const project = new Project({ useInMemoryFileSystem: true });
  const externalFile = project.createSourceFile(
    "/node_modules/external-lib/index.d.ts",
    `
    export interface TestType {
      value: string;
    }
  `,
  );

  vi.spyOn(externalFile, "isFromExternalLibrary").mockReturnValue(true);
  vi.spyOn(externalFile, "isInNodeModules").mockReturnValue(true);

  const declaration = externalFile.getInterface("TestType")!;
  // Create a mock type node
  const mockTypeNode = project
    .createSourceFile("/tmp/mock2.ts", "string")
    .getFirstChildByKind(294)!;

  const context: DeclarationAnalysisContext = {
    name: "test",
    typeNode: mockTypeNode as unknown as TypeNode,
    declaration,
    typeName: "TestType",
    typeAsString: "TestType",
    extractorContext: new ExtractorContext(project, externalFile),
    options: {},
  };

  const strategy = new TestStrategy();
  strategy.testAddDependency(context, "TestType");

  const dependencies = context.extractorContext.getDependencies();
  expect(dependencies[0]?.target).toEqual({
    kind: "module",
    name: "external-lib",
  });
});
