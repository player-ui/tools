import { test, expect, beforeEach } from "vitest";
import { Project } from "ts-morph";
import { SymbolResolver } from "../SymbolResolver.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createMockContext(project: Project): ExtractorContext {
  const sourceFile = project.createSourceFile("/test.ts", "");
  return new ExtractorContext(project, sourceFile);
}

let resolver: SymbolResolver;
let project: Project;
let context: ExtractorContext;

beforeEach(() => {
  project = createMockProject();
  context = createMockContext(project);
  resolver = new SymbolResolver(context);
});

test("resolves local interface symbol", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    "interface UserInterface { id: string; }",
  );

  const result = resolver.resolve("UserInterface", sourceFile);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("local");
  expect(result!.isLocal).toBe(true);
});

test("returns cached result on subsequent calls", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    "interface UserInterface { id: string; }",
  );

  // First call
  const result1 = resolver.resolve("UserInterface", sourceFile);
  // Second call - should use cache
  const result2 = resolver.resolve("UserInterface", sourceFile);

  expect(result1).toEqual(result2);
  expect(result1).toBeDefined();
  expect(result2).toBeDefined();
});

test("resolves enum symbol", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    "enum Status { Active = 'active', Inactive = 'inactive' }",
  );

  const result = resolver.resolve("Status", sourceFile);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("local");
  expect(result!.isLocal).toBe(true);
});

test("resolves type alias symbol", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    "type UserId = string;",
  );

  const result = resolver.resolve("UserId", sourceFile);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("local");
  expect(result!.isLocal).toBe(true);
});

test("resolves symbol from different file in project", () => {
  const sourceFile1 = project.createSourceFile(
    "/src/test1.ts",
    "interface TestInterface { id: string; }",
  );
  project.createSourceFile(
    "/src/test2.ts",
    "interface UserInterface { name: string; }",
  );

  const result = resolver.resolve("UserInterface", sourceFile1);

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("local");
  expect(result!.isLocal).toBe(false); // Found in different file
});

test("returns null when symbol cannot be resolved", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    "interface UserInterface { id: string; }",
  );

  const result = resolver.resolve("NonExistentInterface", sourceFile);

  expect(result).toBeNull();
});

test("uses context source file when none provided", () => {
  // Add interface to the context source file
  const contextFile = context.getSourceFile();
  contextFile.insertText(0, "interface ContextInterface { id: string; }");

  const result = resolver.resolve("ContextInterface");

  expect(result).toBeDefined();
  expect(result!.target.kind).toBe("local");
  expect(result!.isLocal).toBe(true);
});

test("gets external module name for imported symbols", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    `import { ExternalType } from 'external-lib';
     import { LocalType } from './local-types';`,
  );

  const externalModuleName = resolver.getExternalModuleName(
    "ExternalType",
    sourceFile,
  );
  const localModuleName = resolver.getExternalModuleName(
    "LocalType",
    sourceFile,
  );
  const nonExistentModuleName = resolver.getExternalModuleName(
    "NonExistent",
    sourceFile,
  );

  expect(externalModuleName).toBe("external-lib");
  expect(localModuleName).toBeNull(); // Relative imports are skipped
  expect(nonExistentModuleName).toBeNull();
});

test("type analysis methods delegate to TypeAnalyzer", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    `type GenericType<T> = Array<T>;
     type StringType = string;`,
  );

  const genericTypeNode = sourceFile
    .getTypeAlias("GenericType")!
    .getTypeNode()!;
  const stringTypeNode = sourceFile.getTypeAlias("StringType")!.getTypeNode()!;

  expect(resolver.isGenericType(genericTypeNode)).toBe(true);
  expect(resolver.isGenericType(stringTypeNode)).toBe(false);

  expect(resolver.extractGenericArguments(genericTypeNode)).toEqual(["T"]);
  expect(resolver.extractGenericArguments(stringTypeNode)).toEqual([]);

  expect(resolver.getBaseTypeName(genericTypeNode)).toBe("Array");
  expect(resolver.getBaseTypeName(stringTypeNode)).toBe("string");
});

test("primitive type alias analysis", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    `type StringAlias = string;
     type NumberAlias = number;
     type ObjectAlias = { id: string };`,
  );

  const stringAlias = sourceFile.getTypeAlias("StringAlias")!;
  const numberAlias = sourceFile.getTypeAlias("NumberAlias")!;
  const objectAlias = sourceFile.getTypeAlias("ObjectAlias")!;

  expect(resolver.isPrimitiveTypeAlias(stringAlias)).toBe(true);
  expect(resolver.isPrimitiveTypeAlias(numberAlias)).toBe(true);
  expect(resolver.isPrimitiveTypeAlias(objectAlias)).toBe(false);

  expect(resolver.getPrimitiveFromTypeAlias(stringAlias)).toBe("string");
  expect(resolver.getPrimitiveFromTypeAlias(numberAlias)).toBe("number");
  expect(resolver.getPrimitiveFromTypeAlias(objectAlias)).toBeNull();
});

test("expands type alias", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    `type UserData = { id: string; name: string };`,
  );

  const userDataAlias = sourceFile.getTypeAlias("UserData")!;
  const expandedUserData = resolver.expandTypeAlias(userDataAlias);

  expect(expandedUserData).toBeDefined();
  expect(expandedUserData!.name).toBe("UserData");
  expect(expandedUserData!.kind).toBe("non-terminal");
  expect(expandedUserData!.type).toBe("object");
});

test("handles recursive type aliases", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    `type RecursiveType = RecursiveType;`,
  );

  const recursiveAlias = sourceFile.getTypeAlias("RecursiveType")!;
  const expandedRecursive = resolver.expandTypeAlias(recursiveAlias);

  // Should handle recursive types without infinite recursion
  expect(expandedRecursive).toBeDefined();
  expect(expandedRecursive!.name).toBe("RecursiveType");
});

test("clears cache when requested", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    "interface UserInterface { id: string; }",
  );

  // First resolution (will be cached)
  const result1 = resolver.resolve("UserInterface", sourceFile);

  // Clear cache
  resolver.clearCache();

  // Second resolution after cache clear (should still work)
  const result2 = resolver.resolve("UserInterface", sourceFile);

  expect(result1).toBeDefined();
  expect(result2).toBeDefined();
  expect(result1!.target).toEqual(result2!.target);
});

test("handles complex interface structures", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    `interface User {
      id: string;
      profile: UserProfile;
    }
    
    interface UserProfile {
      name: string;
      avatar?: string;
    }
    
    enum UserStatus {
      Active = "active",
      Inactive = "inactive"
    }
    
    type UserId = string;`,
  );

  const userResult = resolver.resolve("User", sourceFile);
  const profileResult = resolver.resolve("UserProfile", sourceFile);
  const statusResult = resolver.resolve("UserStatus", sourceFile);
  const idResult = resolver.resolve("UserId", sourceFile);

  expect(userResult).toBeDefined();
  expect(profileResult).toBeDefined();
  expect(statusResult).toBeDefined();
  expect(idResult).toBeDefined();

  // All should be local and from same file
  [userResult, profileResult, statusResult, idResult].forEach((result) => {
    expect(result!.target.kind).toBe("local");
    expect(result!.isLocal).toBe(true);
  });
});

test("handles empty source files", () => {
  const sourceFile = project.createSourceFile("/src/empty.ts", "");

  const result = resolver.resolve("AnySymbol", sourceFile);

  expect(result).toBeNull();
});

test("handles generic interfaces", () => {
  const sourceFile = project.createSourceFile(
    "/src/test.ts",
    `interface Container<T> {
      value: T;
    }
    
    interface Response<T, E = Error> {
      data?: T;
      error?: E;
    }`,
  );

  const containerResult = resolver.resolve("Container", sourceFile);
  const responseResult = resolver.resolve("Response", sourceFile);

  expect(containerResult).toBeDefined();
  expect(responseResult).toBeDefined();

  expect(containerResult!.target.kind).toBe("local");
  expect(responseResult!.target.kind).toBe("local");
});

test("performance with many symbols", () => {
  const interfaces = Array.from(
    { length: 20 },
    (_, i) => `interface Symbol${i} { id${i}: string; }`,
  ).join("\n");

  const sourceFile = project.createSourceFile(
    "/src/many-symbols.ts",
    interfaces,
  );

  // Test resolution of first, middle, and last symbols
  const first = resolver.resolve("Symbol0", sourceFile);
  const middle = resolver.resolve("Symbol10", sourceFile);
  const last = resolver.resolve("Symbol19", sourceFile);

  expect(first).toBeDefined();
  expect(middle).toBeDefined();
  expect(last).toBeDefined();

  // Test non-existent symbol
  const nonExistent = resolver.resolve("Symbol99", sourceFile);
  expect(nonExistent).toBeNull();
});
