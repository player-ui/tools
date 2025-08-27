import { test, expect, beforeEach } from "vitest";
import { Project, TypeNode, TypeAliasDeclaration } from "ts-morph";
import { TypeAnalyzer } from "../TypeAnalyzer.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createTypeNode(project: Project, code: string): TypeNode {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, `type Test = ${code};`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  return typeAlias.getTypeNode()!;
}

function createTypeAliasDeclaration(
  project: Project,
  code: string,
): TypeAliasDeclaration {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, code);
  const alias = sourceFile.getTypeAliases()[0];
  if (!alias) {
    throw new Error(`Could not create type alias from code: ${code}`);
  }
  return alias;
}

let project: Project;

beforeEach(() => {
  project = createMockProject();
});

test("extracts base type name from simple type reference", () => {
  const typeNode = createTypeNode(project, "User");

  const result = TypeAnalyzer.getBaseTypeName(typeNode);

  expect(result).toBe("User");
});

test("extracts base type name from generic type reference", () => {
  const typeNode = createTypeNode(project, "Array<string>");

  const result = TypeAnalyzer.getBaseTypeName(typeNode);

  expect(result).toBe("Array");
});

test("extracts base type name from nested generic type reference", () => {
  const typeNode = createTypeNode(project, "Promise<Result<User, Error>>");

  const result = TypeAnalyzer.getBaseTypeName(typeNode);

  expect(result).toBe("Promise");
});

test("extracts base type name from qualified name", () => {
  const typeNode = createTypeNode(project, "React.Component");

  const result = TypeAnalyzer.getBaseTypeName(typeNode);

  expect(result).toBe("Component");
});

test("extracts base type name from type query", () => {
  const typeNode = createTypeNode(project, "typeof myVariable");

  const result = TypeAnalyzer.getBaseTypeName(typeNode);

  expect(result).toBe("myVariable");
});

test("extracts base type name from primitive types", () => {
  const primitiveTypes = [
    "string",
    "number",
    "boolean",
    "bigint",
    "symbol",
    "any",
    "unknown",
    "void",
    "never",
  ];

  primitiveTypes.forEach((type) => {
    const typeNode = createTypeNode(project, type);
    const result = TypeAnalyzer.getBaseTypeName(typeNode);
    expect(result).toBe(type);
  });
});

test("extracts generic arguments from simple generic type", () => {
  const typeNode = createTypeNode(project, "Array<string>");

  const result = TypeAnalyzer.extractGenericArguments(typeNode);

  expect(result).toEqual(["string"]);
});

test("extracts generic arguments from multiple generic parameters", () => {
  const typeNode = createTypeNode(project, "Map<string, number>");

  const result = TypeAnalyzer.extractGenericArguments(typeNode);

  expect(result).toEqual(["string", "number"]);
});

test("extracts generic arguments from nested generic types", () => {
  const typeNode = createTypeNode(project, "Promise<Array<User>>");

  const result = TypeAnalyzer.extractGenericArguments(typeNode);

  expect(result).toEqual(["Array<User>"]);
});

test("returns empty array for non-generic types", () => {
  const typeNode = createTypeNode(project, "string");

  const result = TypeAnalyzer.extractGenericArguments(typeNode);

  expect(result).toEqual([]);
});

test("detects generic types correctly", () => {
  const genericType = createTypeNode(project, "Array<string>");
  const nonGenericType = createTypeNode(project, "string");

  expect(TypeAnalyzer.isGenericType(genericType)).toBe(true);
  expect(TypeAnalyzer.isGenericType(nonGenericType)).toBe(false);
});

test("getGenericArgumentsFromNode delegates to extractGenericArguments", () => {
  const typeNode = createTypeNode(project, "Promise<User>");

  const result = TypeAnalyzer.getGenericArgumentsFromNode(typeNode);

  expect(result).toEqual(["User"]);
});

test("detects utility types correctly", () => {
  const utilityTypes = [
    "Pick",
    "Omit",
    "Partial",
    "Required",
    "NonNullable",
    "Readonly",
    "Record",
    "Exclude",
    "Extract",
    "ReturnType",
  ];

  utilityTypes.forEach((utilType) => {
    const typeNode = createTypeNode(project, `${utilType}<User, 'name'>`);
    expect(TypeAnalyzer.isUtilityType(typeNode)).toBe(true);
  });
});

test("does not detect non-utility types as utility types", () => {
  const nonUtilityTypes = ["Array", "Promise", "User", "string", "number"];

  nonUtilityTypes.forEach((type) => {
    const typeNode = createTypeNode(project, type);
    expect(TypeAnalyzer.isUtilityType(typeNode)).toBe(false);
  });
});

test("detects primitive keyword types", () => {
  const primitiveTypes = [
    "string",
    "number",
    "boolean",
    "symbol",
    "any",
    "undefined",
    "never",
  ];

  primitiveTypes.forEach((type) => {
    const typeNode = createTypeNode(project, type);
    const result = TypeAnalyzer.isPrimitiveType(typeNode);
    expect(result, `Expected ${type} to be detected as primitive`).toBe(true);
  });
});

test("detects supported primitive types correctly", () => {
  // These should be detected as primitive based on the current implementation
  const supportedPrimitives = [
    "string",
    "number",
    "boolean",
    "symbol",
    "any",
    "undefined",
    "never",
  ];

  supportedPrimitives.forEach((type) => {
    const typeNode = createTypeNode(project, type);
    expect(TypeAnalyzer.isPrimitiveType(typeNode)).toBe(true);
  });
});

test("handles unsupported keyword types", () => {
  // These are not detected as primitive by the current implementation
  const unsupportedTypes = ["bigint", "unknown", "void"];

  unsupportedTypes.forEach((type) => {
    const typeNode = createTypeNode(project, type);
    const result = TypeAnalyzer.isPrimitiveType(typeNode);
    // Based on the current implementation, these return false because they're not in isKeyword()
    expect(result).toBe(false);
  });
});

test("detects literal types as primitive", () => {
  const literalTypes = [`"hello"`, "42", "true", "false"];

  literalTypes.forEach((literal) => {
    const typeNode = createTypeNode(project, literal);
    expect(TypeAnalyzer.isPrimitiveType(typeNode)).toBe(true);
  });
});

test("detects null type as primitive", () => {
  const typeNode = createTypeNode(project, "null");

  expect(TypeAnalyzer.isPrimitiveType(typeNode)).toBe(true);
});

test("does not detect complex types as primitive", () => {
  const complexTypes = [
    "Array<string>",
    "User",
    "{ name: string }",
    "string | number",
  ];

  complexTypes.forEach((type) => {
    const typeNode = createTypeNode(project, type);
    expect(TypeAnalyzer.isPrimitiveType(typeNode)).toBe(false);
  });
});

test("gets comprehensive type metadata for utility type", () => {
  const typeNode = createTypeNode(project, "Pick<User, 'name' | 'email'>");

  const result = TypeAnalyzer.getTypeMetadata(typeNode);

  expect(result).toEqual({
    isUtilityType: true,
    baseType: "Pick",
    isGeneric: true,
    genericArgs: ["User", "'name' | 'email'"],
  });
});

test("gets comprehensive type metadata for simple generic type", () => {
  const typeNode = createTypeNode(project, "Array<string>");

  const result = TypeAnalyzer.getTypeMetadata(typeNode);

  expect(result).toEqual({
    baseType: "Array",
    isGeneric: true,
    genericArgs: ["string"],
  });
});

test("gets comprehensive type metadata for non-generic type", () => {
  const typeNode = createTypeNode(project, "User");

  const result = TypeAnalyzer.getTypeMetadata(typeNode);

  expect(result).toEqual({
    baseType: "User",
  });
});

test("detects primitive type alias correctly", () => {
  const stringAlias = createTypeAliasDeclaration(
    project,
    "type UserId = string;",
  );
  const numberAlias = createTypeAliasDeclaration(
    project,
    "type Count = number;",
  );
  const booleanAlias = createTypeAliasDeclaration(
    project,
    "type IsActive = boolean;",
  );
  const complexAlias = createTypeAliasDeclaration(
    project,
    "type User = { name: string };",
  );

  expect(TypeAnalyzer.isPrimitiveTypeAlias(stringAlias)).toBe(true);
  expect(TypeAnalyzer.isPrimitiveTypeAlias(numberAlias)).toBe(true);
  expect(TypeAnalyzer.isPrimitiveTypeAlias(booleanAlias)).toBe(true);
  expect(TypeAnalyzer.isPrimitiveTypeAlias(complexAlias)).toBe(false);
});

test("gets primitive type from string type alias", () => {
  const alias = createTypeAliasDeclaration(project, "type UserId = string;");

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBe("string");
});

test("gets primitive type from number type alias", () => {
  const alias = createTypeAliasDeclaration(project, "type Count = number;");

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBe("number");
});

test("gets primitive type from boolean type alias", () => {
  const alias = createTypeAliasDeclaration(project, "type IsActive = boolean;");

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBe("boolean");
});

test("gets primitive type from string literal type alias", () => {
  const alias = createTypeAliasDeclaration(project, `type Status = "active";`);

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBe("string");
});

test("gets primitive type from number literal type alias", () => {
  const alias = createTypeAliasDeclaration(project, "type Port = 3000;");

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBe("number");
});

test("gets primitive type from boolean literal type alias", () => {
  const trueAlias = createTypeAliasDeclaration(project, "type IsTrue = true;");
  const falseAlias = createTypeAliasDeclaration(
    project,
    "type IsFalse = false;",
  );

  expect(TypeAnalyzer.getPrimitiveFromTypeAlias(trueAlias)).toBe("boolean");
  expect(TypeAnalyzer.getPrimitiveFromTypeAlias(falseAlias)).toBe("boolean");
});

test("gets primitive type from bigint literal type alias", () => {
  const alias = createTypeAliasDeclaration(project, "type BigNumber = 123n;");

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBe("number");
});

test("returns null for non-primitive type alias", () => {
  const alias = createTypeAliasDeclaration(
    project,
    "type User = { name: string };",
  );

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBeNull();
});

test("returns null for complex union type alias", () => {
  const alias = createTypeAliasDeclaration(
    project,
    "type Status = 'active' | 'inactive' | number;",
  );

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBeNull();
});

test("returns null for type alias without type node", () => {
  const sourceFile = project.createSourceFile("/test.ts", "type Empty;");
  const alias = sourceFile.getTypeAliases()[0];

  if (!alias) {
    throw new Error("Could not create type alias");
  }

  const result = TypeAnalyzer.getPrimitiveFromTypeAlias(alias);

  expect(result).toBeNull();
});

test("handles edge case with any keyword", () => {
  const typeNode = createTypeNode(project, "any");

  expect(TypeAnalyzer.isPrimitiveType(typeNode)).toBe(true);
  expect(TypeAnalyzer.getBaseTypeName(typeNode)).toBe("any");
});

test("handles edge case with never keyword", () => {
  const typeNode = createTypeNode(project, "never");

  expect(TypeAnalyzer.isPrimitiveType(typeNode)).toBe(true);
  expect(TypeAnalyzer.getBaseTypeName(typeNode)).toBe("never");
});

test("handles complex nested generic types", () => {
  const typeNode = createTypeNode(
    project,
    "Promise<Result<Array<User>, CustomError<ValidationData>>>",
  );

  expect(TypeAnalyzer.getBaseTypeName(typeNode)).toBe("Promise");
  expect(TypeAnalyzer.isGenericType(typeNode)).toBe(true);
  expect(TypeAnalyzer.extractGenericArguments(typeNode)).toEqual([
    "Result<Array<User>, CustomError<ValidationData>>",
  ]);
});
