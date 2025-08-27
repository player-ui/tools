import { test, expect } from "vitest";
import {
  Project,
  TypeNode,
  InterfaceDeclaration,
  TypeAliasDeclaration,
} from "ts-morph";
import { ExtractorContext } from "../../core/ExtractorContext.js";
import {
  extractStringLiteralUnion,
  findInterfaceFromTypeNode,
  getTypeReferenceName,
  parseTypeArguments,
  getGenericTypeParameters,
  getTypeParameterConstraintOrDefault,
  unwrapUtilityTypes,
  isArrayType,
  resolveGenericParametersToDefaults,
  getArrayElementType,
} from "../index.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

function createMockContext(
  project: Project,
  filePath = "/test.ts",
): ExtractorContext {
  const sourceFile = project.createSourceFile(filePath, "");
  return new ExtractorContext(project, sourceFile);
}

function createTypeNode(project: Project, code: string): TypeNode {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, `type Test = ${code};`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  return typeAlias.getTypeNode()!;
}

function createInterface(
  project: Project,
  interfaceOptions: {
    name: string;
    properties?: Array<{ name: string; type: string }>;
    typeParameters?: string[];
  },
  filePath = "/test.ts",
): InterfaceDeclaration {
  const sourceFile =
    project.getSourceFile(filePath) || project.createSourceFile(filePath, "");
  const typeParams = interfaceOptions.typeParameters
    ? `<${interfaceOptions.typeParameters.join(", ")}>`
    : "";
  const properties =
    interfaceOptions.properties
      ?.map((prop) => `${prop.name}: ${prop.type};`)
      .join("\n  ") || "";
  const interfaceCode = `interface ${interfaceOptions.name}${typeParams} {\n  ${properties}\n}`;
  sourceFile.addStatements(interfaceCode);
  return sourceFile.getInterfaces()[sourceFile.getInterfaces().length - 1]!;
}

function createTypeAlias(
  project: Project,
  typeAliasOptions: { name: string; type: string; typeParameters?: string[] },
): TypeAliasDeclaration {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, "");
  const typeParams = typeAliasOptions.typeParameters
    ? `<${typeAliasOptions.typeParameters.join(", ")}>`
    : "";
  const typeAliasCode = `type ${typeAliasOptions.name}${typeParams} = ${typeAliasOptions.type};`;
  sourceFile.addStatements(typeAliasCode);
  return sourceFile.getTypeAliases()[0]!;
}

test("extractStringLiteralUnion extracts single string literal", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, '"hello"');

  const result = extractStringLiteralUnion(typeNode);

  expect(result).toEqual(["hello"]);
});

test("extractStringLiteralUnion extracts union of string literals", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, '"red" | "green" | "blue"');

  const result = extractStringLiteralUnion(typeNode);

  expect(result).toEqual(["red", "green", "blue"]);
});

test("extractStringLiteralUnion ignores non-string literals in union", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, '"red" | 42 | true | "blue"');

  const result = extractStringLiteralUnion(typeNode);

  expect(result).toEqual(["red", "blue"]);
});

test("extractStringLiteralUnion returns empty array for non-literal types", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");

  const result = extractStringLiteralUnion(typeNode);

  expect(result).toEqual([]);
});

test("extractStringLiteralUnion returns empty array for number union", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "1 | 2 | 3");

  const result = extractStringLiteralUnion(typeNode);

  expect(result).toEqual([]);
});

test("findInterfaceFromTypeNode finds local interface in same file", () => {
  const project = createMockProject();
  const context = createMockContext(project);

  createInterface(project, {
    name: "UserProfile",
    properties: [{ name: "name", type: "string" }],
  });

  const typeNode = createTypeNode(project, "UserProfile");
  const result = findInterfaceFromTypeNode(typeNode, context);

  expect(result).not.toBeNull();
  expect(result?.declaration.getName()).toBe("UserProfile");
  expect(result?.target.kind).toBe("local");
  expect(result?.target.name).toBe("UserProfile");
});

test("findInterfaceFromTypeNode finds interface in different project file", () => {
  const project = createMockProject();
  const context = createMockContext(project, "/main.ts");

  // Create interface in a different file
  const otherFile = "/models.ts";
  createInterface(
    project,
    {
      name: "Product",
      properties: [{ name: "id", type: "string" }],
    },
    otherFile,
  );

  const typeNode = createTypeNode(project, "Product");
  const result = findInterfaceFromTypeNode(typeNode, context);

  expect(result).not.toBeNull();
  expect(result?.declaration.getName()).toBe("Product");
  expect(result?.target.kind).toBe("local");
  expect(result?.target.name).toBe("Product");
  if (result?.target.kind === "local") {
    expect(result.target.filePath).toBe(otherFile);
  }
});

test("findInterfaceFromTypeNode returns null for non-type reference", () => {
  const project = createMockProject();
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "string");
  const result = findInterfaceFromTypeNode(typeNode, context);

  expect(result).toBeNull();
});

test("findInterfaceFromTypeNode returns null when interface not found", () => {
  const project = createMockProject();
  const context = createMockContext(project);

  const typeNode = createTypeNode(project, "NonExistentInterface");
  const result = findInterfaceFromTypeNode(typeNode, context);

  expect(result).toBeNull();
});

test("findInterfaceFromTypeNode prioritizes local file over other files", () => {
  const project = createMockProject();
  const context = createMockContext(project, "/main.ts");

  // Create same-named interface in both files
  createInterface(
    project,
    {
      name: "Config",
      properties: [{ name: "mainConfig", type: "string" }],
    },
    "/main.ts",
  );

  createInterface(
    project,
    {
      name: "Config",
      properties: [{ name: "otherConfig", type: "number" }],
    },
    "/other.ts",
  );

  const typeNode = createTypeNode(project, "Config");
  const result = findInterfaceFromTypeNode(typeNode, context);

  expect(result).not.toBeNull();
  expect(result?.declaration.getName()).toBe("Config");
  if (result?.target.kind === "local") {
    expect(result.target.filePath).toBe("/main.ts");
  }
});

test("getTypeReferenceName extracts simple type name", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "UserProfile");

  const result = getTypeReferenceName(typeNode as any);

  expect(result).toBe("UserProfile");
});

test("getTypeReferenceName extracts generic type name", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "Array<string>");

  const result = getTypeReferenceName(typeNode as any);

  expect(result).toBe("Array");
});

test("getTypeReferenceName returns empty string on error", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");

  const result = getTypeReferenceName(typeNode as any);

  expect(result).toBe("");
});

test("parseTypeArguments extracts type arguments", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "Array<string>");

  const result = parseTypeArguments(typeNode as any);

  expect(result).toHaveLength(1);
  expect(result[0]?.getText()).toBe("string");
});

test("parseTypeArguments extracts multiple type arguments", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "Map<string, number>");

  const result = parseTypeArguments(typeNode as any);

  expect(result).toHaveLength(2);
  expect(result[0]?.getText()).toBe("string");
  expect(result[1]?.getText()).toBe("number");
});

test("parseTypeArguments returns empty array when no arguments", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "UserProfile");

  const result = parseTypeArguments(typeNode as any);

  expect(result).toEqual([]);
});

test("parseTypeArguments returns empty array on error", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "string");

  const result = parseTypeArguments(typeNode as any);

  expect(result).toEqual([]);
});

test("getGenericTypeParameters extracts interface type parameters", () => {
  const project = createMockProject();
  const interfaceDecl = createInterface(project, {
    name: "Container",
    typeParameters: ["T", "U"],
    properties: [{ name: "value", type: "T" }],
  });

  const result = getGenericTypeParameters(interfaceDecl);

  expect(result).toEqual(["T", "U"]);
});

test("getGenericTypeParameters extracts type alias parameters", () => {
  const project = createMockProject();
  const typeAlias = createTypeAlias(project, {
    name: "Mapper",
    typeParameters: ["Input", "Output"],
    type: "(input: Input) => Output",
  });

  const result = getGenericTypeParameters(typeAlias);

  expect(result).toEqual(["Input", "Output"]);
});

test("getGenericTypeParameters returns empty array when no parameters", () => {
  const project = createMockProject();
  const interfaceDecl = createInterface(project, {
    name: "SimpleInterface",
    properties: [{ name: "name", type: "string" }],
  });

  const result = getGenericTypeParameters(interfaceDecl);

  expect(result).toEqual([]);
});

test("getGenericTypeParameters returns empty array on error", () => {
  const project = createMockProject();
  const interfaceDecl = createInterface(project, {
    name: "TestInterface",
    properties: [{ name: "test", type: "string" }],
  });

  // Force an error by accessing a non-existent method
  const mockDecl = {
    ...interfaceDecl,
    getTypeParameters: () => {
      throw new Error("Test error");
    },
  };

  const result = getGenericTypeParameters(mockDecl as any);

  expect(result).toEqual([]);
});

test("getTypeParameterConstraintOrDefault extracts constraint", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface Container<T extends string> {
      value: T;
    }
  `,
  );
  const interfaceDecl = sourceFile.getInterface("Container")!;

  const result = getTypeParameterConstraintOrDefault(interfaceDecl, "T");

  expect(result).not.toBeNull();
  expect(result?.getText()).toBe("string");
});

test("getTypeParameterConstraintOrDefault extracts default", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface Container<T = string> {
      value: T;
    }
  `,
  );
  const interfaceDecl = sourceFile.getInterface("Container")!;

  const result = getTypeParameterConstraintOrDefault(interfaceDecl, "T");

  expect(result).not.toBeNull();
  expect(result?.getText()).toBe("string");
});

test("getTypeParameterConstraintOrDefault prefers default over constraint", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface Container<T extends object = string> {
      value: T;
    }
  `,
  );
  const interfaceDecl = sourceFile.getInterface("Container")!;

  const result = getTypeParameterConstraintOrDefault(interfaceDecl, "T");

  expect(result).not.toBeNull();
  expect(result?.getText()).toBe("string");
});

test("getTypeParameterConstraintOrDefault returns null for unknown parameter", () => {
  const project = createMockProject();
  const interfaceDecl = createInterface(project, {
    name: "Container",
    typeParameters: ["T"],
    properties: [{ name: "value", type: "T" }],
  });

  const result = getTypeParameterConstraintOrDefault(interfaceDecl, "U");

  expect(result).toBeNull();
});

test("getTypeParameterConstraintOrDefault returns null on error", () => {
  const project = createMockProject();
  const interfaceDecl = createInterface(project, {
    name: "Container",
    properties: [{ name: "value", type: "string" }],
  });

  // Force an error by accessing a non-existent method
  const mockDecl = {
    ...interfaceDecl,
    getTypeParameters: () => {
      throw new Error("Test error");
    },
  };

  const result = getTypeParameterConstraintOrDefault(mockDecl as any, "T");

  expect(result).toBeNull();
});

test("unwrapUtilityTypes unwraps single wrapper", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "Required<UserProfile>");

  const result = unwrapUtilityTypes(typeNode);

  expect(result.getText()).toBe("UserProfile");
});

test("unwrapUtilityTypes unwraps nested wrappers", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(
    project,
    "Required<NonNullable<UserProfile>>",
  );

  const result = unwrapUtilityTypes(typeNode);

  expect(result.getText()).toBe("UserProfile");
});

test("unwrapUtilityTypes with custom wrapper types", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "CustomWrapper<UserProfile>");

  const result = unwrapUtilityTypes(typeNode, ["CustomWrapper"]);

  expect(result.getText()).toBe("UserProfile");
});

test("unwrapUtilityTypes stops at non-wrapper types", () => {
  const project = createMockProject();
  const typeNode = createTypeNode(project, "Array<UserProfile>");

  const result = unwrapUtilityTypes(typeNode);

  expect(result.getText()).toBe("Array<UserProfile>");
});

test("unwrapUtilityTypes handles non-generic wrapper", () => {
  const project = createMockProject();

  // Mock a wrapper without type arguments
  const mockWrapper = createTypeNode(project, "NoArgsWrapper");

  const result = unwrapUtilityTypes(mockWrapper, ["NoArgsWrapper"]);

  expect(result.getText()).toBe("NoArgsWrapper");
});

test("isArrayType identifies array syntax", () => {
  const project = createMockProject();
  const arrayTypeNode = createTypeNode(project, "string[]");

  const result = isArrayType(arrayTypeNode);

  expect(result).toBe(true);
});

test("isArrayType identifies Array generic", () => {
  const project = createMockProject();
  const arrayTypeNode = createTypeNode(project, "Array<string>");

  const result = isArrayType(arrayTypeNode);

  expect(result).toBe(true);
});

test("isArrayType rejects non-array types", () => {
  const project = createMockProject();
  const stringTypeNode = createTypeNode(project, "string");

  const result = isArrayType(stringTypeNode);

  expect(result).toBe(false);
});

test("isArrayType rejects non-Array generics", () => {
  const project = createMockProject();
  const mapTypeNode = createTypeNode(project, "Map<string, number>");

  const result = isArrayType(mapTypeNode);

  expect(result).toBe(false);
});

test("resolveGenericParametersToDefaults resolves default parameters", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface Container<T = string, U = number> {
      first: T;
      second: U;
    }
  `,
  );
  const interfaceDecl = sourceFile.getInterface("Container")!;

  const result = resolveGenericParametersToDefaults(interfaceDecl);

  expect(result.size).toBe(2);
  expect(result.get("T")?.getText()).toBe("string");
  expect(result.get("U")?.getText()).toBe("number");
});

test("resolveGenericParametersToDefaults uses constraints as fallback", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface Container<T extends string, U = number> {
      first: T;
      second: U;
    }
  `,
  );
  const interfaceDecl = sourceFile.getInterface("Container")!;

  const result = resolveGenericParametersToDefaults(interfaceDecl);

  expect(result.size).toBe(2);
  expect(result.get("T")?.getText()).toBe("string");
  expect(result.get("U")?.getText()).toBe("number");
});

test("resolveGenericParametersToDefaults handles parameters without defaults", () => {
  const project = createMockProject();
  const interfaceDecl = createInterface(project, {
    name: "Container",
    typeParameters: ["T"],
    properties: [{ name: "value", type: "T" }],
  });

  const result = resolveGenericParametersToDefaults(interfaceDecl);

  expect(result.size).toBe(0);
});

test("resolveGenericParametersToDefaults handles errors gracefully", () => {
  const project = createMockProject();
  const interfaceDecl = createInterface(project, {
    name: "Container",
    properties: [{ name: "value", type: "string" }],
  });

  // Force an error by accessing a non-existent method
  const mockDecl = {
    ...interfaceDecl,
    getTypeParameters: () => {
      throw new Error("Test error");
    },
  };

  const result = resolveGenericParametersToDefaults(mockDecl as any);

  expect(result.size).toBe(0);
});

test("getArrayElementType extracts from array syntax", () => {
  const project = createMockProject();
  const arrayTypeNode = createTypeNode(project, "string[]");

  const result = getArrayElementType(arrayTypeNode);

  expect(result).not.toBeNull();
  expect(result?.getText()).toBe("string");
});

test("getArrayElementType extracts from Array generic", () => {
  const project = createMockProject();
  const arrayTypeNode = createTypeNode(project, "Array<UserProfile>");

  const result = getArrayElementType(arrayTypeNode);

  expect(result).not.toBeNull();
  expect(result?.getText()).toBe("UserProfile");
});

test("getArrayElementType returns null for non-array types", () => {
  const project = createMockProject();
  const stringTypeNode = createTypeNode(project, "string");

  const result = getArrayElementType(stringTypeNode);

  expect(result).toBeNull();
});

test("getArrayElementType returns null for Array without type args", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile("/test.ts", `type Test = Array;`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  const typeNode = typeAlias.getTypeNode()!;

  const result = getArrayElementType(typeNode);

  expect(result).toBeNull();
});

test("getArrayElementType returns null for non-Array generics", () => {
  const project = createMockProject();
  const mapTypeNode = createTypeNode(project, "Map<string, number>");

  const result = getArrayElementType(mapTypeNode);

  expect(result).toBeNull();
});
