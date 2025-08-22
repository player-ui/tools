import { test, expect } from "vitest";
import {
  Project,
  TypeNode,
  TypeReferenceNode,
  ImportDeclaration,
} from "ts-morph";
import { TypeGuards } from "../TypeGuards.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createTypeNode(project: Project, code: string): TypeNode {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, `type Test = ${code};`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  return typeAlias.getTypeNode()!;
}

function createImport(
  project: Project,
  importStatement: string,
): ImportDeclaration {
  const sourceFile = project.createSourceFile("/test.ts", importStatement);
  return sourceFile.getImportDeclarations()[0]!;
}

test("isTypeReference identifies type reference nodes", () => {
  const project = createMockProject();
  const typeRefNode = createTypeNode(project, "UserProfile");
  const primitiveNode = createTypeNode(project, "string");

  expect(TypeGuards.isTypeReference(typeRefNode)).toBe(true);
  expect(TypeGuards.isTypeReference(primitiveNode)).toBe(false);
});

test("getTypeName extracts simple type name", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "UserProfile") as TypeReferenceNode;

  const result = TypeGuards.getTypeName(typeNode);

  expect(result).toBe("UserProfile");
});

test("getTypeName extracts generic type name", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(
    project,
    "Array<string>",
  ) as TypeReferenceNode;

  const result = TypeGuards.getTypeName(typeNode);

  expect(result).toBe("Array");
});

test("getTypeName returns empty string on error", () => {
  const project = createMockProject();
  const primitiveNode = createTypeNode(project, "string");

  const result = TypeGuards.getTypeName(primitiveNode as any);

  expect(result).toBe("");
});

test("isArrayTypeReference identifies Array type", () => {
  const project = createMockProject();
  const arrayTypeNode = createTypeNode(
    project,
    "Array<string>",
  ) as TypeReferenceNode;

  const result = TypeGuards.isArrayTypeReference(arrayTypeNode);

  expect(result).toBe(true);
});

test("isArrayTypeReference identifies ReadonlyArray type", () => {
  const project = createMockProject();
  const readonlyArrayNode = createTypeNode(
    project,
    "ReadonlyArray<string>",
  ) as TypeReferenceNode;

  const result = TypeGuards.isArrayTypeReference(readonlyArrayNode);

  expect(result).toBe(true);
});

test("isArrayTypeReference rejects non-array types", () => {
  const project = createMockProject();
  const mapTypeNode = createTypeNode(
    project,
    "Map<string, number>",
  ) as TypeReferenceNode;

  const result = TypeGuards.isArrayTypeReference(mapTypeNode);

  expect(result).toBe(false);
});

test("looksLikeGenericParameter identifies single letter parameters", () => {
  expect(TypeGuards.looksLikeGenericParameter("T")).toBe(true);
  expect(TypeGuards.looksLikeGenericParameter("U")).toBe(true);
  expect(TypeGuards.looksLikeGenericParameter("V")).toBe(true);
  expect(TypeGuards.looksLikeGenericParameter("K")).toBe(true);
});

test("looksLikeGenericParameter identifies PascalCase parameters", () => {
  expect(TypeGuards.looksLikeGenericParameter("TValue")).toBe(true);
  expect(TypeGuards.looksLikeGenericParameter("TKey")).toBe(true);
  expect(TypeGuards.looksLikeGenericParameter("ElementType")).toBe(true);
  expect(TypeGuards.looksLikeGenericParameter("ReturnType")).toBe(true);
});

test("looksLikeGenericParameter rejects lowercase parameters", () => {
  expect(TypeGuards.looksLikeGenericParameter("t")).toBe(false);
  expect(TypeGuards.looksLikeGenericParameter("value")).toBe(false);
  expect(TypeGuards.looksLikeGenericParameter("string")).toBe(false);
});

test("looksLikeGenericParameter rejects too long parameters", () => {
  expect(
    TypeGuards.looksLikeGenericParameter("VeryLongGenericParameterName"),
  ).toBe(false);
});

test("looksLikeGenericParameter rejects parameters with special characters", () => {
  expect(TypeGuards.looksLikeGenericParameter("T_Value")).toBe(false);
  expect(TypeGuards.looksLikeGenericParameter("T-Value")).toBe(false);
  expect(TypeGuards.looksLikeGenericParameter("T@Value")).toBe(false);
});

test("looksLikeGenericParameter accepts parameters with numbers", () => {
  expect(TypeGuards.looksLikeGenericParameter("T1")).toBe(true);
  expect(TypeGuards.looksLikeGenericParameter("Value2")).toBe(true);
});

test("importContainsSymbol identifies default import", () => {
  const project = createMockProject();
  const importDecl = createImport(project, 'import React from "react";');

  const result = TypeGuards.importContainsSymbol(importDecl, "React");

  expect(result).toBe(true);
});

test("importContainsSymbol identifies named import", () => {
  const project = createMockProject();
  const importDecl = createImport(
    project,
    'import { useState, useEffect } from "react";',
  );

  expect(TypeGuards.importContainsSymbol(importDecl, "useState")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "useEffect")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "useCallback")).toBe(
    false,
  );
});

test("importContainsSymbol identifies aliased import", () => {
  const project = createMockProject();
  const importDecl = createImport(
    project,
    'import { useState as state, useEffect as effect } from "react";',
  );

  expect(TypeGuards.importContainsSymbol(importDecl, "state")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "effect")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "useState")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "useEffect")).toBe(true);
});

test("importContainsSymbol handles mixed imports", () => {
  const project = createMockProject();
  const importDecl = createImport(
    project,
    'import React, { useState, useEffect as effect } from "react";',
  );

  expect(TypeGuards.importContainsSymbol(importDecl, "React")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "useState")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "effect")).toBe(true);
  expect(TypeGuards.importContainsSymbol(importDecl, "useEffect")).toBe(true);
});

test("importContainsSymbol returns false for non-matching symbols", () => {
  const project = createMockProject();
  const importDecl = createImport(project, 'import React from "react";');

  expect(TypeGuards.importContainsSymbol(importDecl, "Vue")).toBe(false);
  expect(TypeGuards.importContainsSymbol(importDecl, "useState")).toBe(false);
});

test("importContainsSymbol handles errors gracefully", () => {
  const project = createMockProject();
  const importDecl = createImport(project, 'import React from "react";');

  // Mock to throw error
  const mockImport = {
    ...importDecl,
    getDefaultImport: () => {
      throw new Error("Test error");
    },
  };

  const result = TypeGuards.importContainsSymbol(mockImport as any, "React");

  expect(result).toBe(false);
});

test("isRelativeImport identifies relative imports", () => {
  expect(TypeGuards.isRelativeImport("./utils")).toBe(true);
  expect(TypeGuards.isRelativeImport("../components/Button")).toBe(true);
  expect(TypeGuards.isRelativeImport("../../types")).toBe(true);
  expect(TypeGuards.isRelativeImport("/absolute/path")).toBe(true);
});

test("isRelativeImport rejects external imports", () => {
  expect(TypeGuards.isRelativeImport("react")).toBe(false);
  expect(TypeGuards.isRelativeImport("@types/node")).toBe(false);
  expect(TypeGuards.isRelativeImport("lodash")).toBe(false);
});

test("isExternalImport identifies external imports", () => {
  expect(TypeGuards.isExternalImport("react")).toBe(true);
  expect(TypeGuards.isExternalImport("@types/node")).toBe(true);
  expect(TypeGuards.isExternalImport("lodash")).toBe(true);
});

test("isExternalImport rejects relative imports", () => {
  expect(TypeGuards.isExternalImport("./utils")).toBe(false);
  expect(TypeGuards.isExternalImport("../components/Button")).toBe(false);
  expect(TypeGuards.isExternalImport("/absolute/path")).toBe(false);
});

test("getTypeArguments extracts type arguments", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(
    project,
    "Array<string>",
  ) as TypeReferenceNode;

  const result = TypeGuards.getTypeArguments(typeNode);

  expect(result).toHaveLength(1);
  expect(result[0]?.getText()).toBe("string");
});

test("getTypeArguments extracts multiple type arguments", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(
    project,
    "Map<string, number>",
  ) as TypeReferenceNode;

  const result = TypeGuards.getTypeArguments(typeNode);

  expect(result).toHaveLength(2);
  expect(result[0]?.getText()).toBe("string");
  expect(result[1]?.getText()).toBe("number");
});

test("getTypeArguments returns empty array when no arguments", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "UserProfile") as TypeReferenceNode;

  const result = TypeGuards.getTypeArguments(typeNode);

  expect(result).toEqual([]);
});

test("getTypeArguments returns empty array on error", () => {
  const project = createMockProject();
  const primitiveNode = createTypeNode(project, "string");

  const result = TypeGuards.getTypeArguments(primitiveNode as any);

  expect(result).toEqual([]);
});

test("hasTypeArguments identifies types with arguments", () => {
  const project = createMockProject();
  const withArgsNode = createTypeNode(
    project,
    "Array<string>",
  ) as TypeReferenceNode;
  const withoutArgsNode = createTypeNode(
    project,
    "UserProfile",
  ) as TypeReferenceNode;

  expect(TypeGuards.hasTypeArguments(withArgsNode)).toBe(true);
  expect(TypeGuards.hasTypeArguments(withoutArgsNode)).toBe(false);
});

test("getBaseTypeName extracts base name from generic", () => {
  expect(TypeGuards.getBaseTypeName("Array<string>")).toBe("Array");
  expect(TypeGuards.getBaseTypeName("Map<string, number>")).toBe("Map");
  expect(TypeGuards.getBaseTypeName("Promise<User>")).toBe("Promise");
});

test("getBaseTypeName handles nested generics", () => {
  expect(TypeGuards.getBaseTypeName("Array<Map<string, number>>")).toBe(
    "Array",
  );
  expect(TypeGuards.getBaseTypeName("Promise<Response<User>>")).toBe("Promise");
});

test("getBaseTypeName returns original for non-generic", () => {
  expect(TypeGuards.getBaseTypeName("UserProfile")).toBe("UserProfile");
  expect(TypeGuards.getBaseTypeName("string")).toBe("string");
  expect(TypeGuards.getBaseTypeName("number")).toBe("number");
});

test("getBaseTypeName handles whitespace", () => {
  expect(TypeGuards.getBaseTypeName("  Array<string>  ")).toBe("Array");
  expect(TypeGuards.getBaseTypeName("Map < string , number >")).toBe("Map");
});

test("getBaseTypeName handles malformed input", () => {
  expect(TypeGuards.getBaseTypeName("")).toBe("");
  expect(TypeGuards.getBaseTypeName("<string>")).toBe("<string>");
  expect(TypeGuards.getBaseTypeName("Array<")).toBe("Array");
});

test("isPrimitiveType identifies all primitive types", () => {
  expect(TypeGuards.isPrimitiveType("string")).toBe(true);
  expect(TypeGuards.isPrimitiveType("number")).toBe(true);
  expect(TypeGuards.isPrimitiveType("boolean")).toBe(true);
  expect(TypeGuards.isPrimitiveType("bigint")).toBe(true);
  expect(TypeGuards.isPrimitiveType("symbol")).toBe(true);
  expect(TypeGuards.isPrimitiveType("undefined")).toBe(true);
  expect(TypeGuards.isPrimitiveType("null")).toBe(true);
  expect(TypeGuards.isPrimitiveType("void")).toBe(true);
});

test("isPrimitiveType rejects non-primitive types", () => {
  expect(TypeGuards.isPrimitiveType("Array")).toBe(false);
  expect(TypeGuards.isPrimitiveType("UserProfile")).toBe(false);
  expect(TypeGuards.isPrimitiveType("object")).toBe(false);
  expect(TypeGuards.isPrimitiveType("Date")).toBe(false);
});

test("isPrimitiveType is case sensitive", () => {
  expect(TypeGuards.isPrimitiveType("String")).toBe(false);
  expect(TypeGuards.isPrimitiveType("Number")).toBe(false);
  expect(TypeGuards.isPrimitiveType("Boolean")).toBe(false);
});

test("isUtilityType identifies all utility types", () => {
  const utilityTypes = [
    "Partial",
    "Required",
    "Readonly",
    "Pick",
    "Omit",
    "Exclude",
    "Extract",
    "NonNullable",
    "Parameters",
    "ConstructorParameters",
    "ReturnType",
    "InstanceType",
    "Record",
    "ThisType",
  ];

  for (const utilityType of utilityTypes) {
    expect(TypeGuards.isUtilityType(utilityType)).toBe(true);
  }
});

test("isUtilityType rejects non-utility types", () => {
  expect(TypeGuards.isUtilityType("Array")).toBe(false);
  expect(TypeGuards.isUtilityType("Promise")).toBe(false);
  expect(TypeGuards.isUtilityType("UserProfile")).toBe(false);
  expect(TypeGuards.isUtilityType("string")).toBe(false);
});

test("isUtilityType is case sensitive", () => {
  expect(TypeGuards.isUtilityType("partial")).toBe(false);
  expect(TypeGuards.isUtilityType("required")).toBe(false);
  expect(TypeGuards.isUtilityType("PARTIAL")).toBe(false);
});
