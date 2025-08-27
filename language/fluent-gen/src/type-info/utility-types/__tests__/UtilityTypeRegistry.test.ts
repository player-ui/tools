import { test, expect, vi } from "vitest";
import { Project } from "ts-morph";
import { UtilityTypeRegistry } from "../UtilityTypeRegistry.js";
import { UtilityTypeExpander } from "../UtilityTypeExpander.js";
import { TypeAnalyzer } from "../../analyzers/TypeAnalyzer.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";
import type { PropertyInfo } from "../../types.js";

class MockUtilityTypeExpander extends UtilityTypeExpander {
  constructor(private typeName: string) {
    super();
  }

  getTypeName(): string {
    return this.typeName;
  }

  expand(): PropertyInfo | null {
    return {
      kind: "terminal",
      type: "string",
      name: "test",
      typeAsString: "string",
    };
  }
}

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createMockContext(project: Project): ExtractorContext {
  const sourceFile = project.createSourceFile("/test.ts", "");
  return new ExtractorContext(project, sourceFile);
}

test("registers default expanders on construction", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);

  const registeredTypes = registry.getRegisteredTypes();

  expect(registeredTypes).toContain("Pick");
  expect(registeredTypes).toContain("Omit");
  expect(registeredTypes).toContain("Partial");
  expect(registeredTypes).toContain("Required");
  expect(registeredTypes).toContain("Record");
  expect(registeredTypes).toContain("NonNullable");
});

test("registers custom expander", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);
  const customExpander = new MockUtilityTypeExpander("Custom");

  registry.register(customExpander);

  expect(registry.isUtilityType("Custom")).toBe(true);
  expect(registry.getRegisteredTypes()).toContain("Custom");
});

test("expands registered utility type", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);
  const context = createMockContext(project);
  const customExpander = new MockUtilityTypeExpander("Custom");

  registry.register(customExpander);

  const result = registry.expand({
    typeName: "Custom",
    name: "test",
    typeArgs: [],
    context,
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "test",
    typeAsString: "string",
  });
});

test("returns null for unregistered utility type", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);
  const context = createMockContext(project);

  const result = registry.expand({
    typeName: "NonExistent",
    name: "test",
    typeArgs: [],
    context,
  });

  expect(result).toBe(null);
});

test("checks if type is registered", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);

  expect(registry.isUtilityType("Pick")).toBe(true);
  expect(registry.isUtilityType("NonExistent")).toBe(false);
});

test("unregisters utility type", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);
  const customExpander = new MockUtilityTypeExpander("Custom");

  registry.register(customExpander);
  expect(registry.isUtilityType("Custom")).toBe(true);

  const unregistered = registry.unregister("Custom");
  expect(unregistered).toBe(true);
  expect(registry.isUtilityType("Custom")).toBe(false);
});

test("returns false when unregistering non-existent type", () => {
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);

  const unregistered = registry.unregister("NonExistent");
  expect(unregistered).toBe(false);
});

test("expands utility type with options", () => {
  const project = createMockProject();
  const typeAnalyzer = new TypeAnalyzer();
  const registry = new UtilityTypeRegistry(typeAnalyzer);
  const context = createMockContext(project);
  const customExpander = new MockUtilityTypeExpander("Custom");

  const expandSpy = vi.spyOn(customExpander, "expand");
  registry.register(customExpander);

  registry.expand({
    typeName: "Custom",
    name: "test",
    typeArgs: [],
    context,
    options: { isOptional: true },
  });

  expect(expandSpy).toHaveBeenCalledWith({
    name: "test",
    typeArgs: [],
    context,
    options: { isOptional: true },
  });

  expandSpy.mockRestore();
});
