import { test, expect } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { GenericContext } from "../GenericContext.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createTypeNode(project: Project, code: string): TypeNode {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, `type Test = ${code};`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  return typeAlias.getTypeNode()!;
}

test("creates empty GenericContext", () => {
  const context = new GenericContext();
  expect(context).toBeInstanceOf(GenericContext);
  expect(context.hasSubstitution("T")).toBe(false);
  expect(context.getSubstitution("T")).toBeUndefined();
  expect(context.getAllSubstitutions().size).toBe(0);
});

test("creates GenericContext with existing substitutions", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");

  const initialSubstitutions = new Map<string, TypeNode>();
  initialSubstitutions.set("T", typeNode);

  const context = new GenericContext(initialSubstitutions);

  expect(context.hasSubstitution("T")).toBe(true);
  expect(context.getSubstitution("T")).toBe(typeNode);
  expect(context.getAllSubstitutions().size).toBe(1);
  expect(context.getAllSubstitutions().get("T")).toBe("string");
});

test("adds substitution for generic parameter", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "number");
  const context = new GenericContext();

  context.addSubstitution("T", typeNode);

  expect(context.hasSubstitution("T")).toBe(true);
  expect(context.getSubstitution("T")).toBe(typeNode);
  expect(context.getAllSubstitutions().size).toBe(1);
  expect(context.getAllSubstitutions().get("T")).toBe("number");
});

test("gets substitution for existing parameter", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "boolean");
  const context = new GenericContext();

  context.addSubstitution("T", typeNode);
  const retrieved = context.getSubstitution("T");

  expect(retrieved).toBe(typeNode);
  expect(retrieved?.getText()).toBe("boolean");
});

test("returns undefined for non-existent parameter", () => {
  const context = new GenericContext();

  expect(context.getSubstitution("NonExistent")).toBeUndefined();
  expect(context.hasSubstitution("NonExistent")).toBe(false);
});

test("overwrites existing substitution", () => {
  const project = createMockProject();
  const typeNode1 = createTypeNode(project, "string");
  const typeNode2 = createTypeNode(project, "number");
  const context = new GenericContext();

  context.addSubstitution("T", typeNode1);
  expect(context.getSubstitution("T")).toBe(typeNode1);

  context.addSubstitution("T", typeNode2);
  expect(context.getSubstitution("T")).toBe(typeNode2);
  expect(context.getAllSubstitutions().get("T")).toBe("number");
});

test("handles multiple substitutions", () => {
  const project = createMockProject();
  const typeNodeT = createTypeNode(project, "string");
  const typeNodeU = createTypeNode(project, "number");
  const typeNodeV = createTypeNode(project, "boolean");
  const context = new GenericContext();

  context.addSubstitution("T", typeNodeT);
  context.addSubstitution("U", typeNodeU);
  context.addSubstitution("V", typeNodeV);

  expect(context.hasSubstitution("T")).toBe(true);
  expect(context.hasSubstitution("U")).toBe(true);
  expect(context.hasSubstitution("V")).toBe(true);
  expect(context.hasSubstitution("W")).toBe(false);

  expect(context.getSubstitution("T")).toBe(typeNodeT);
  expect(context.getSubstitution("U")).toBe(typeNodeU);
  expect(context.getSubstitution("V")).toBe(typeNodeV);

  const allSubs = context.getAllSubstitutions();
  expect(allSubs.size).toBe(3);
  expect(allSubs.get("T")).toBe("string");
  expect(allSubs.get("U")).toBe("number");
  expect(allSubs.get("V")).toBe("boolean");
});

test("withSubstitutions creates new context with additional substitutions", () => {
  const project = createMockProject();
  const typeNodeT = createTypeNode(project, "string");
  const typeNodeU = createTypeNode(project, "number");
  const typeNodeV = createTypeNode(project, "boolean");

  const originalContext = new GenericContext();
  originalContext.addSubstitution("T", typeNodeT);

  const additionalSubs = new Map<string, TypeNode>();
  additionalSubs.set("U", typeNodeU);
  additionalSubs.set("V", typeNodeV);

  const newContext = originalContext.withSubstitutions(additionalSubs);

  // Original context should be unchanged
  expect(originalContext.hasSubstitution("T")).toBe(true);
  expect(originalContext.hasSubstitution("U")).toBe(false);
  expect(originalContext.hasSubstitution("V")).toBe(false);
  expect(originalContext.getAllSubstitutions().size).toBe(1);

  // New context should have all substitutions
  expect(newContext.hasSubstitution("T")).toBe(true);
  expect(newContext.hasSubstitution("U")).toBe(true);
  expect(newContext.hasSubstitution("V")).toBe(true);
  expect(newContext.getAllSubstitutions().size).toBe(3);

  const newSubs = newContext.getAllSubstitutions();
  expect(newSubs.get("T")).toBe("string");
  expect(newSubs.get("U")).toBe("number");
  expect(newSubs.get("V")).toBe("boolean");
});

test("withSubstitutions overwrites existing substitutions", () => {
  const project = createMockProject();
  const typeNodeT1 = createTypeNode(project, "string");
  const typeNodeT2 = createTypeNode(project, "number");
  const typeNodeU = createTypeNode(project, "boolean");

  const originalContext = new GenericContext();
  originalContext.addSubstitution("T", typeNodeT1);

  const additionalSubs = new Map<string, TypeNode>();
  additionalSubs.set("T", typeNodeT2); // Overwrite existing T
  additionalSubs.set("U", typeNodeU); // Add new U

  const newContext = originalContext.withSubstitutions(additionalSubs);

  // Original context should be unchanged
  expect(originalContext.getSubstitution("T")).toBe(typeNodeT1);
  expect(originalContext.getAllSubstitutions().get("T")).toBe("string");

  // New context should have overwritten T and added U
  expect(newContext.getSubstitution("T")).toBe(typeNodeT2);
  expect(newContext.getSubstitution("U")).toBe(typeNodeU);
  expect(newContext.getAllSubstitutions().get("T")).toBe("number");
  expect(newContext.getAllSubstitutions().get("U")).toBe("boolean");
});

test("withSubstitutions with empty map creates copy", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");
  const originalContext = new GenericContext();
  originalContext.addSubstitution("T", typeNode);

  const newContext = originalContext.withSubstitutions(new Map());

  // Both contexts should be identical but separate instances
  expect(newContext).not.toBe(originalContext);
  expect(newContext.hasSubstitution("T")).toBe(true);
  expect(newContext.getSubstitution("T")).toBe(typeNode);
  expect(newContext.getAllSubstitutions().size).toBe(1);

  // Modifying new context shouldn't affect original
  newContext.addSubstitution("U", createTypeNode(project, "number"));
  expect(originalContext.hasSubstitution("U")).toBe(false);
  expect(newContext.hasSubstitution("U")).toBe(true);
});

test("getAllSubstitutions returns text representation", () => {
  const project = createMockProject();
  const context = new GenericContext();

  // Complex types
  context.addSubstitution("T", createTypeNode(project, "string[]"));
  context.addSubstitution(
    "U",
    createTypeNode(project, "Record<string, number>"),
  );
  context.addSubstitution(
    "V",
    createTypeNode(project, "{ name: string; age: number }"),
  );

  const allSubs = context.getAllSubstitutions();
  expect(allSubs.get("T")).toBe("string[]");
  expect(allSubs.get("U")).toBe("Record<string, number>");
  expect(allSubs.get("V")).toBe("{ name: string; age: number }");
});

test("getAllSubstitutions returns new map instance", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");
  const context = new GenericContext();
  context.addSubstitution("T", typeNode);

  const subs1 = context.getAllSubstitutions();
  const subs2 = context.getAllSubstitutions();

  // Should be different map instances
  expect(subs1).not.toBe(subs2);
  expect(subs1).toEqual(subs2);

  // Modifying returned map shouldn't affect internal state
  subs1.set("U", "number");
  expect(context.hasSubstitution("U")).toBe(false);
  expect(context.getAllSubstitutions().has("U")).toBe(false);
});

test("empty static factory creates empty context", () => {
  const context = GenericContext.empty();

  expect(context).toBeInstanceOf(GenericContext);
  expect(context.getAllSubstitutions().size).toBe(0);
  expect(context.hasSubstitution("T")).toBe(false);
  expect(context.getSubstitution("T")).toBeUndefined();
});

test("handles special characters in parameter names", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");
  const context = new GenericContext();

  // Test with special characters that might appear in generic names
  context.addSubstitution("T_Type", typeNode);
  context.addSubstitution("U$Generic", typeNode);
  context.addSubstitution("V123", typeNode);

  expect(context.hasSubstitution("T_Type")).toBe(true);
  expect(context.hasSubstitution("U$Generic")).toBe(true);
  expect(context.hasSubstitution("V123")).toBe(true);
  expect(context.getAllSubstitutions().size).toBe(3);
});

test("handles empty string parameter name", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");
  const context = new GenericContext();

  context.addSubstitution("", typeNode);

  expect(context.hasSubstitution("")).toBe(true);
  expect(context.getSubstitution("")).toBe(typeNode);
  expect(context.getAllSubstitutions().get("")).toBe("string");
});

test("complex nested context creation", () => {
  const project = createMockProject();
  const context1 = new GenericContext();
  context1.addSubstitution("T", createTypeNode(project, "string"));

  const additionalSubs1 = new Map<string, TypeNode>();
  additionalSubs1.set("U", createTypeNode(project, "number"));
  const context2 = context1.withSubstitutions(additionalSubs1);

  const additionalSubs2 = new Map<string, TypeNode>();
  additionalSubs2.set("V", createTypeNode(project, "boolean"));
  const context3 = context2.withSubstitutions(additionalSubs2);

  // Each context should be independent
  expect(context1.getAllSubstitutions().size).toBe(1);
  expect(context1.hasSubstitution("T")).toBe(true);
  expect(context1.hasSubstitution("U")).toBe(false);
  expect(context1.hasSubstitution("V")).toBe(false);

  expect(context2.getAllSubstitutions().size).toBe(2);
  expect(context2.hasSubstitution("T")).toBe(true);
  expect(context2.hasSubstitution("U")).toBe(true);
  expect(context2.hasSubstitution("V")).toBe(false);

  expect(context3.getAllSubstitutions().size).toBe(3);
  expect(context3.hasSubstitution("T")).toBe(true);
  expect(context3.hasSubstitution("U")).toBe(true);
  expect(context3.hasSubstitution("V")).toBe(true);
});

test("constructor creates deep copy of provided substitutions", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");

  const originalSubs = new Map<string, TypeNode>();
  originalSubs.set("T", typeNode);

  const context = new GenericContext(originalSubs);

  // Modify original map
  originalSubs.set("U", createTypeNode(project, "number"));
  originalSubs.delete("T");

  // Context should be unaffected
  expect(context.hasSubstitution("T")).toBe(true);
  expect(context.hasSubstitution("U")).toBe(false);
  expect(context.getAllSubstitutions().size).toBe(1);
});

test("handles undefined constructor parameter", () => {
  const context = new GenericContext(undefined);

  expect(context).toBeInstanceOf(GenericContext);
  expect(context.getAllSubstitutions().size).toBe(0);
  expect(context.hasSubstitution("T")).toBe(false);
});
