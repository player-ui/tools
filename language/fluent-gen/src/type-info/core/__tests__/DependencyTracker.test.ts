/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi, beforeEach } from "vitest";
import { DependencyTracker } from "../DependencyTracker.js";
import type { Dependency } from "../../types.js";

let consoleWarnSpy: any;

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

test("creates new DependencyTracker instance", () => {
  const tracker = new DependencyTracker();
  expect(tracker).toBeInstanceOf(DependencyTracker);
  expect(tracker.getDependencies()).toEqual([]);
});

test("adds local dependency", () => {
  const tracker = new DependencyTracker();
  const dependency: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };

  tracker.addDependency(dependency);
  const dependencies = tracker.getDependencies();

  expect(dependencies).toEqual([dependency]);
  expect(dependencies).toHaveLength(1);
});

test("adds module dependency", () => {
  const tracker = new DependencyTracker();
  const dependency: Dependency = {
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
  };

  tracker.addDependency(dependency);
  const dependencies = tracker.getDependencies();

  expect(dependencies).toEqual([dependency]);
  expect(dependencies).toHaveLength(1);
});

test("deduplicates local dependencies by filePath and dependency name", () => {
  const tracker = new DependencyTracker();
  const dependency1: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };
  const dependency2: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
    isDefaultImport: true, // Different property but same target+dependency
  };

  tracker.addDependency(dependency1);
  tracker.addDependency(dependency2);
  const dependencies = tracker.getDependencies();

  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toBe(dependency1); // First one is kept
});

test("deduplicates module dependencies by name and dependency name", () => {
  const tracker = new DependencyTracker();
  const dependency1: Dependency = {
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
  };
  const dependency2: Dependency = {
    target: { kind: "module", name: "react" },
    dependency: "ReactNode",
    alias: "Node", // Different property but same target+dependency
  };

  tracker.addDependency(dependency1);
  tracker.addDependency(dependency2);
  const dependencies = tracker.getDependencies();

  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]).toBe(dependency1);
});

test("allows different dependencies to same target", () => {
  const tracker = new DependencyTracker();
  const dependency1: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };
  const dependency2: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "AnotherInterface", // Different dependency name
  };

  tracker.addDependency(dependency1);
  tracker.addDependency(dependency2);
  const dependencies = tracker.getDependencies();

  expect(dependencies).toHaveLength(2);
  expect(dependencies).toContain(dependency1);
  expect(dependencies).toContain(dependency2);
});

test("allows same dependency name to different targets", () => {
  const tracker = new DependencyTracker();
  const dependency1: Dependency = {
    target: { kind: "local", filePath: "/test1.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };
  const dependency2: Dependency = {
    target: { kind: "local", filePath: "/test2.ts", name: "TestInterface" },
    dependency: "TestInterface", // Same dependency name but different target
  };

  tracker.addDependency(dependency1);
  tracker.addDependency(dependency2);
  const dependencies = tracker.getDependencies();

  expect(dependencies).toHaveLength(2);
  expect(dependencies).toContain(dependency1);
  expect(dependencies).toContain(dependency2);
});

test("clears all dependencies", () => {
  const tracker = new DependencyTracker();
  const dependency: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };

  tracker.addDependency(dependency);
  expect(tracker.getDependencies()).toHaveLength(1);

  tracker.clear();
  expect(tracker.getDependencies()).toEqual([]);
});

test("enters circular check for new type", () => {
  const tracker = new DependencyTracker();
  const result = tracker.enterCircularCheck("TestType");

  expect(result).toBe(true);
  expect(tracker.isProcessing("TestType")).toBe(true);
  expect(tracker.getProcessingTypes()).toContain("TestType");
});

test("rejects circular check for already processing type", () => {
  const tracker = new DependencyTracker();

  tracker.enterCircularCheck("TestType");
  const result = tracker.enterCircularCheck("TestType");

  expect(result).toBe(false);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Circular dependency detected: TestType",
  );
  expect(tracker.isProcessing("TestType")).toBe(true);
});

test("exits circular check removes type from processing", () => {
  const tracker = new DependencyTracker();

  tracker.enterCircularCheck("TestType");
  expect(tracker.isProcessing("TestType")).toBe(true);

  tracker.exitCircularCheck("TestType");
  expect(tracker.isProcessing("TestType")).toBe(false);
  expect(tracker.getProcessingTypes()).not.toContain("TestType");
});

test("exits circular check for non-processing type does nothing", () => {
  const tracker = new DependencyTracker();

  expect(tracker.isProcessing("TestType")).toBe(false);
  tracker.exitCircularCheck("TestType");
  expect(tracker.isProcessing("TestType")).toBe(false);
});

test("handles multiple types in circular check", () => {
  const tracker = new DependencyTracker();

  const result1 = tracker.enterCircularCheck("Type1");
  const result2 = tracker.enterCircularCheck("Type2");
  const result3 = tracker.enterCircularCheck("Type3");

  expect(result1).toBe(true);
  expect(result2).toBe(true);
  expect(result3).toBe(true);

  const processingTypes = tracker.getProcessingTypes();
  expect(processingTypes).toContain("Type1");
  expect(processingTypes).toContain("Type2");
  expect(processingTypes).toContain("Type3");
  expect(processingTypes).toHaveLength(3);
});

test("exits partial circular checks maintains others", () => {
  const tracker = new DependencyTracker();

  tracker.enterCircularCheck("Type1");
  tracker.enterCircularCheck("Type2");
  tracker.enterCircularCheck("Type3");

  tracker.exitCircularCheck("Type2");

  const processingTypes = tracker.getProcessingTypes();
  expect(processingTypes).toContain("Type1");
  expect(processingTypes).not.toContain("Type2");
  expect(processingTypes).toContain("Type3");
  expect(processingTypes).toHaveLength(2);

  expect(tracker.isProcessing("Type1")).toBe(true);
  expect(tracker.isProcessing("Type2")).toBe(false);
  expect(tracker.isProcessing("Type3")).toBe(true);
});

test("complex circular dependency scenario", () => {
  const tracker = new DependencyTracker();

  // Enter Type1
  expect(tracker.enterCircularCheck("Type1")).toBe(true);

  // Enter Type2 while Type1 is processing
  expect(tracker.enterCircularCheck("Type2")).toBe(true);

  // Try to re-enter Type1 (circular)
  expect(tracker.enterCircularCheck("Type1")).toBe(false);
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Circular dependency detected: Type1",
  );

  // Exit Type2
  tracker.exitCircularCheck("Type2");
  expect(tracker.isProcessing("Type2")).toBe(false);
  expect(tracker.isProcessing("Type1")).toBe(true);

  // Now we can enter Type2 again
  expect(tracker.enterCircularCheck("Type2")).toBe(true);

  // Clean up
  tracker.exitCircularCheck("Type1");
  tracker.exitCircularCheck("Type2");
  expect(tracker.getProcessingTypes()).toEqual([]);
});

test("getProcessingTypes returns copy not reference", () => {
  const tracker = new DependencyTracker();

  tracker.enterCircularCheck("Type1");
  const processingTypes1 = tracker.getProcessingTypes();
  const processingTypes2 = tracker.getProcessingTypes();

  // Should be different array instances
  expect(processingTypes1).not.toBe(processingTypes2);
  expect(processingTypes1).toEqual(processingTypes2);

  // Modifying returned array shouldn't affect internal state
  processingTypes1.push("Type2");
  expect(tracker.isProcessing("Type2")).toBe(false);
  expect(tracker.getProcessingTypes()).not.toContain("Type2");
});

test("getDependencies returns copy not reference", () => {
  const tracker = new DependencyTracker();
  const dependency: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };

  tracker.addDependency(dependency);
  const dependencies1 = tracker.getDependencies();
  const dependencies2 = tracker.getDependencies();

  // Should be different array instances
  expect(dependencies1).not.toBe(dependencies2);
  expect(dependencies1).toEqual(dependencies2);

  // Modifying returned array shouldn't affect internal state
  dependencies1.push({
    target: { kind: "module", name: "fake" },
    dependency: "Fake",
  });
  expect(tracker.getDependencies()).toHaveLength(1);
});

test("handles empty string type names in circular check", () => {
  const tracker = new DependencyTracker();

  const result1 = tracker.enterCircularCheck("");
  const result2 = tracker.enterCircularCheck("");

  expect(result1).toBe(true);
  expect(result2).toBe(false);
  expect(consoleWarnSpy).toHaveBeenCalledWith("Circular dependency detected: ");
});

test("generates unique keys for local vs module targets", () => {
  const tracker = new DependencyTracker();

  // These should not conflict even though dependency name is the same
  const localDep: Dependency = {
    target: { kind: "local", filePath: "/test.ts", name: "TestInterface" },
    dependency: "TestInterface",
  };

  const moduleDep: Dependency = {
    target: { kind: "module", name: "TestInterface" }, // Same name as local dependency
    dependency: "TestInterface",
  };

  tracker.addDependency(localDep);
  tracker.addDependency(moduleDep);

  const dependencies = tracker.getDependencies();
  expect(dependencies).toHaveLength(2);
  expect(dependencies).toContain(localDep);
  expect(dependencies).toContain(moduleDep);
});
