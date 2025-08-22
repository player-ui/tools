/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi, beforeEach } from "vitest";
import { Project, SourceFile } from "ts-morph";
import { ExtractorContext } from "../ExtractorContext.js";
import type { Dependency } from "../../types.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createMockSourceFile(
  project: Project,
  filePath = "/test.ts",
): SourceFile {
  return project.createSourceFile(
    filePath,
    "interface TestInterface { prop: string; }",
  );
}

let consoleWarnSpy: any;

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

test("creates ExtractorContext with project and source file", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  expect(context).toBeInstanceOf(ExtractorContext);
  expect(context.getProject()).toBe(project);
  expect(context.getSourceFile()).toBe(sourceFile);
});

test("getProject returns the project instance", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  expect(context.getProject()).toBe(project);
});

test("getSourceFile returns the source file instance", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  expect(context.getSourceFile()).toBe(sourceFile);
});

test("starts with empty dependencies", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  expect(context.getDependencies()).toEqual([]);
});

test("starts with no current interface", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  expect(context.getCurrentInterface()).toBeNull();
});

test("adds local dependency", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const dependency: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };

  context.addDependency(dependency);
  const dependencies = context.getDependencies();

  expect(dependencies).toEqual([dependency]);
  expect(dependencies).toHaveLength(1);
});

test("adds module dependency", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const dependency: Dependency = {
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
  };

  context.addDependency(dependency);
  const dependencies = context.getDependencies();

  expect(dependencies).toEqual([dependency]);
  expect(dependencies).toHaveLength(1);
});

test("deduplicates local dependencies", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const dependency1: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };
  const dependency2: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
    isDefaultImport: true,
  };

  context.addDependency(dependency1);
  context.addDependency(dependency2);
  const dependencies = context.getDependencies();

  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toBe(dependency1);
});

test("deduplicates module dependencies", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const dependency1: Dependency = {
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
  };
  const dependency2: Dependency = {
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
    alias: "Node",
  };

  context.addDependency(dependency1);
  context.addDependency(dependency2);
  const dependencies = context.getDependencies();

  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toBe(dependency1);
});

test("allows different dependencies to same target", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const dependency1: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };
  const dependency2: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "AnotherInterface",
  };

  context.addDependency(dependency1);
  context.addDependency(dependency2);
  const dependencies = context.getDependencies();

  expect(dependencies).toHaveLength(2);
  expect(dependencies).toContain(dependency1);
  expect(dependencies).toContain(dependency2);
});

test("enters circular check for new type", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const result = context.enterCircularCheck("TestType");

  expect(result).toBe(true);
  expect(context.isProcessing("TestType")).toBe(true);
});

test("rejects circular check for already processing type", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  context.enterCircularCheck("TestType");
  const result = context.enterCircularCheck("TestType");

  expect(result).toBe(false);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Circular dependency detected: TestType",
  );
  expect(context.isProcessing("TestType")).toBe(true);
});

test("exits circular check removes type from processing", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  context.enterCircularCheck("TestType");
  expect(context.isProcessing("TestType")).toBe(true);

  context.exitCircularCheck("TestType");
  expect(context.isProcessing("TestType")).toBe(false);
});

test("sets and gets current interface", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const interfaceDecl = sourceFile.getInterfaces()[0]!;

  expect(context.getCurrentInterface()).toBeNull();

  context.setCurrentInterface(interfaceDecl);
  expect(context.getCurrentInterface()).toBe(interfaceDecl);

  context.setCurrentInterface(null);
  expect(context.getCurrentInterface()).toBeNull();
});

test("withSourceFile creates new context with different source file", () => {
  const project = createMockProject();
  const sourceFile1 = createMockSourceFile(project, "/test1.ts");
  const sourceFile2 = createMockSourceFile(project, "/test2.ts");
  const context1 = new ExtractorContext(project, sourceFile1);

  // Add some state to the original context
  context1.addDependency({
    target: { kind: "local", filePath: "/test1.ts", name: "TestInterface" },
    dependency: "TestInterface",
  });
  context1.enterCircularCheck("TestType");

  const context2 = context1.withSourceFile(sourceFile2);

  // New context should have same project but different source file
  expect(context2.getProject()).toBe(project);
  expect(context2.getSourceFile()).toBe(sourceFile2);
  expect(context2.getSourceFile()).not.toBe(sourceFile1);

  // New context should have fresh state (empty dependencies and circular tracker)
  expect(context2.getDependencies()).toEqual([]);
  expect(context2.isProcessing("TestType")).toBe(false);
  expect(context2.getCurrentInterface()).toBeNull();

  // Original context should be unchanged
  expect(context1.getDependencies()).toHaveLength(1);
  expect(context1.isProcessing("TestType")).toBe(true);
});

test("getDebugInfo returns current state information", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project, "/test.ts");
  const context = new ExtractorContext(project, sourceFile);

  // Add some dependencies and processing types
  context.addDependency({
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  });
  context.addDependency({
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
  });
  context.enterCircularCheck("Type1");
  context.enterCircularCheck("Type2");

  const debugInfo = context.getDebugInfo();

  expect(debugInfo).toEqual({
    dependencyCount: 2,
    processingTypes: ["Type1", "Type2"],
    sourceFilePath: "/test.ts",
  });
});

test("getDebugInfo returns empty arrays when no state", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project, "/test.ts");
  const context = new ExtractorContext(project, sourceFile);

  const debugInfo = context.getDebugInfo();

  expect(debugInfo).toEqual({
    dependencyCount: 0,
    processingTypes: [],
    sourceFilePath: "/test.ts",
  });
});

test("handles multiple concurrent circular checks", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const result1 = context.enterCircularCheck("Type1");
  const result2 = context.enterCircularCheck("Type2");
  const result3 = context.enterCircularCheck("Type3");

  expect(result1).toBe(true);
  expect(result2).toBe(true);
  expect(result3).toBe(true);

  expect(context.isProcessing("Type1")).toBe(true);
  expect(context.isProcessing("Type2")).toBe(true);
  expect(context.isProcessing("Type3")).toBe(true);

  const debugInfo = context.getDebugInfo();
  expect(debugInfo.processingTypes).toContain("Type1");
  expect(debugInfo.processingTypes).toContain("Type2");
  expect(debugInfo.processingTypes).toContain("Type3");
  expect(debugInfo.processingTypes).toHaveLength(3);
});

test("partial exit from circular checks maintains others", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  context.enterCircularCheck("Type1");
  context.enterCircularCheck("Type2");
  context.enterCircularCheck("Type3");

  context.exitCircularCheck("Type2");

  expect(context.isProcessing("Type1")).toBe(true);
  expect(context.isProcessing("Type2")).toBe(false);
  expect(context.isProcessing("Type3")).toBe(true);

  const debugInfo = context.getDebugInfo();
  expect(debugInfo.processingTypes).toContain("Type1");
  expect(debugInfo.processingTypes).not.toContain("Type2");
  expect(debugInfo.processingTypes).toContain("Type3");
  expect(debugInfo.processingTypes).toHaveLength(2);
});

test("complex integration with dependencies and circular tracking", () => {
  const project = createMockProject();
  const sourceFile1 = createMockSourceFile(project, "/file1.ts");
  const sourceFile2 = createMockSourceFile(project, "/file2.ts");
  const context = new ExtractorContext(project, sourceFile1);

  // Add various dependencies
  context.addDependency({
    target: { kind: "local", filePath: "/file1.ts", name: "Interface1" },
    dependency: "Interface1",
  });
  context.addDependency({
    target: { kind: "local", filePath: "/file2.ts", name: "Interface2" },
    dependency: "Interface2",
  });
  context.addDependency({
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
  });

  // Start circular tracking
  context.enterCircularCheck("Interface1");

  // Set current interface
  const interfaceDecl = sourceFile1.getInterfaces()[0]!;
  context.setCurrentInterface(interfaceDecl);

  // Create new context with different source file
  const newContext = context.withSourceFile(sourceFile2);

  // Verify original context state
  expect(context.getDependencies()).toHaveLength(3);
  expect(context.isProcessing("Interface1")).toBe(true);
  expect(context.getCurrentInterface()).toBe(interfaceDecl);
  expect(context.getSourceFile()).toBe(sourceFile1);

  // Verify new context has fresh state but same project
  expect(newContext.getProject()).toBe(project);
  expect(newContext.getSourceFile()).toBe(sourceFile2);
  expect(newContext.getDependencies()).toEqual([]);
  expect(newContext.isProcessing("Interface1")).toBe(false);
  expect(newContext.getCurrentInterface()).toBeNull();

  const debugInfo = context.getDebugInfo();
  expect(debugInfo.dependencyCount).toBe(3);
  expect(debugInfo.processingTypes).toContain("Interface1");
  expect(debugInfo.sourceFilePath).toBe("/file1.ts");

  const newDebugInfo = newContext.getDebugInfo();
  expect(newDebugInfo.dependencyCount).toBe(0);
  expect(newDebugInfo.processingTypes).toEqual([]);
  expect(newDebugInfo.sourceFilePath).toBe("/file2.ts");
});

test("handles setting current interface to same interface multiple times", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const interfaceDecl = sourceFile.getInterfaces()[0]!;

  context.setCurrentInterface(interfaceDecl);
  expect(context.getCurrentInterface()).toBe(interfaceDecl);

  context.setCurrentInterface(interfaceDecl);
  expect(context.getCurrentInterface()).toBe(interfaceDecl);
});

test("handles empty string in circular dependency tracking", () => {
  const project = createMockProject();
  const sourceFile = createMockSourceFile(project);
  const context = new ExtractorContext(project, sourceFile);

  const result1 = context.enterCircularCheck("");
  const result2 = context.enterCircularCheck("");

  expect(result1).toBe(true);
  expect(result2).toBe(false);
  expect(consoleWarnSpy).toHaveBeenCalledWith("Circular dependency detected: ");
  expect(context.isProcessing("")).toBe(true);
});
