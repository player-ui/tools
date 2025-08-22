/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi } from "vitest";
import { Project, TypeNode } from "ts-morph";
import { ReferenceAnalyzer } from "../ReferenceAnalyzer.js";
import { ExtractorContext } from "../../core/ExtractorContext.js";
import { GenericContext } from "../../core/GenericContext.js";
import type { TypeAnalyzer } from "../TypeAnalyzer.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
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

      return {
        kind: "terminal",
        type: "unknown",
        name,
        typeAsString: typeText,
      };
    }),
    getUtilityTypeRegistry: vi.fn(() => ({
      isUtilityType: vi.fn(() => false),
      expand: vi.fn(),
    })),
  } as any;
}

function createMockContext(project: Project): ExtractorContext {
  const sourceFile = project.createSourceFile("/test.ts", "");
  return new ExtractorContext(project, sourceFile);
}

function createTypeNode(project: Project, code: string): TypeNode {
  const fileName = `/temp_${Math.random().toString(36).substr(2, 9)}.ts`;
  const sourceFile = project.createSourceFile(fileName, `type Test = ${code};`);
  const typeAlias = sourceFile.getTypeAlias("Test")!;
  return typeAlias.getTypeNode()!;
}

test("canHandle identifies type reference nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  // Create a project with an interface to reference
  const sourceFile = project.createSourceFile(
    "/types.ts",
    `
    interface User {
      name: string;
    }
    type UserRef = User;
  `,
  );

  const typeAlias = sourceFile.getTypeAlias("UserRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const primitiveTypeNode = createTypeNode(project, "string");
  const arrayTypeNode = createTypeNode(project, "string[]");

  expect(analyzer.canHandle(referenceTypeNode)).toBe(true);
  expect(analyzer.canHandle(primitiveTypeNode)).toBe(false);
  expect(analyzer.canHandle(arrayTypeNode)).toBe(false);
});

test("handles generic type parameter substitution", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const referenceTypeNode = createTypeNode(project, "MyType");

  // Create a generic context with substitution
  const substitutionNode = createTypeNode(project, "string");
  const substitutions = new Map();
  substitutions.set("MyType", substitutionNode);
  const genericContext =
    GenericContext.empty().withSubstitutions(substitutions);

  const result = analyzer.analyze({
    name: "prop",
    typeNode: referenceTypeNode,
    context,
    options: { genericContext },
  });

  expect(result).toEqual({
    kind: "terminal",
    type: "string",
    name: "prop",
    typeAsString: "string",
  });

  expect(typeAnalyzer.analyze).toHaveBeenCalledWith({
    name: "prop",
    typeNode: substitutionNode,
    context,
    options: { genericContext },
  });
});

test("handles utility types through registry", () => {
  const project = createMockProject();
  const typeAnalyzer: TypeAnalyzer = {
    analyze: vi.fn(),
    getUtilityTypeRegistry: vi.fn(() => ({
      isUtilityType: vi.fn((typeName) => typeName === "Pick"),
      expand: vi.fn(() => ({
        kind: "non-terminal",
        type: "object",
        name: "picked",
        typeAsString: "Pick<T, K>",
        properties: [],
      })),
    })),
  } as any;

  const analyzer = new ReferenceAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  // Create Pick<User, "name"> reference
  const sourceFile = project.createSourceFile(
    "/pick.ts",
    `
    interface User { name: string; age: number; }
    type Picked = Pick<User, "name">;
  `,
  );
  const typeAlias = sourceFile.getTypeAlias("Picked")!;
  const pickTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "picked",
    typeNode: pickTypeNode,
    context,
    options: {},
  });

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "picked",
    typeAsString: "Pick<T, K>",
    properties: [],
  });
});

test("resolves local interface type", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  // Create interface and reference in same file
  const sourceFile = project.createSourceFile(
    "/local.ts",
    `
    interface User {
      name: string;
      age: number;
    }
    type UserRef = User;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  const typeAlias = sourceFile.getTypeAlias("UserRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "user",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.kind).toBe("non-terminal");
  expect(result?.type).toBe("object");
});

test("handles external type resolution", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const referenceTypeNode = createTypeNode(project, "ExternalType");

  const result = analyzer.analyze({
    name: "external",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  // Should return null for unresolved external type
  expect(result).toBeNull();
});

test("handles generic constraint resolution", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  // Create interface with generic constraint
  const sourceFile = project.createSourceFile(
    "/generic.ts",
    `
    interface BaseType {
      id: string;
    }
    
    interface Container<T extends BaseType> {
      value: T;
    }
  `,
  );
  const context = new ExtractorContext(project, sourceFile);
  const interfaceDecl = sourceFile.getInterface("Container")!;
  context.setCurrentInterface(interfaceDecl);

  const referenceTypeNode = createTypeNode(project, "T");

  const result = analyzer.analyze({
    name: "value",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  // Should attempt to resolve constraint
  expect(result).toBeDefined();
});

test("returns fallback property on analysis error", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  // Mock a problematic type node that will cause error
  const mockTypeNode = {
    getText: vi.fn(() => "ProblematicType"),
    getKind: vi.fn(() => 999), // Invalid kind
    getKindName: vi.fn(() => "UnknownKind"),
  } as any;

  const result = analyzer.analyze({
    name: "problematic",
    typeNode: mockTypeNode as any,
    context,
    options: {},
  });

  // Should return null for invalid type node
  expect(result).toBeNull();
});

test("returns null for non-type-reference nodes", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);
  const context = createMockContext(project);

  const primitiveTypeNode = createTypeNode(project, "string");

  const result = analyzer.analyze({
    name: "notReference",
    typeNode: primitiveTypeNode,
    context,
    options: {},
  });

  expect(result).toBeNull();
});

test("handles type alias resolution", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  const sourceFile = project.createSourceFile(
    "/alias.ts",
    `
    type StringAlias = string;
    type AliasRef = StringAlias;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  const typeAlias = sourceFile.getTypeAlias("AliasRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "alias",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.typeAsString).toBe("StringAlias");
});

test("handles enum resolution", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  const sourceFile = project.createSourceFile(
    "/enum.ts",
    `
    enum Status {
      Active = "active",
      Inactive = "inactive"
    }
    type StatusRef = Status;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  const typeAlias = sourceFile.getTypeAlias("StatusRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "status",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  expect(result).toBeDefined();
});

test("handles no matching declaration strategy", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  // Create a class declaration (which doesn't have a strategy)
  const sourceFile = project.createSourceFile(
    "/class.ts",
    `
    class MyClass {
      prop: string = "";
    }
    type ClassRef = MyClass;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  const typeAlias = sourceFile.getTypeAlias("ClassRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "classRef",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  // Should handle gracefully when no strategy is found
  expect(result).toBeNull();
});

test("adds dependencies to extractor context", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  const sourceFile = project.createSourceFile(
    "/deps.ts",
    `
    interface User {
      name: string;
    }
    type UserRef = User;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  const typeAlias = sourceFile.getTypeAlias("UserRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  analyzer.analyze({
    name: "user",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  const dependencies = context.getDependencies();
  expect(dependencies).toHaveLength(1);
  expect(dependencies[0]?.dependency).toBe("User");
});

test("handles generic type with type arguments", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  const sourceFile = project.createSourceFile(
    "/generic-args.ts",
    `
    interface Container<T> {
      value: T;
    }
    type StringContainer = Container<string>;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  const typeAlias = sourceFile.getTypeAlias("StringContainer")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "container",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  expect(result).toBeDefined();
  expect(result?.kind).toBe("non-terminal");
});

test("passes options through analysis chain", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  const sourceFile = project.createSourceFile(
    "/options.ts",
    `
    interface User {
      name: string;
    }
    type UserRef = User;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  const typeAlias = sourceFile.getTypeAlias("UserRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "user",
    typeNode: referenceTypeNode,
    context,
    options: { isOptional: true, isArray: true },
  });

  expect(result).toBeDefined();
  if (result) {
    expect(result.isOptional).toBe(true);
    expect(result.isArray).toBe(true);
  }
});

test("handles circular dependency gracefully", () => {
  const project = createMockProject();
  const typeAnalyzer = createMockTypeAnalyzer();
  const analyzer = new ReferenceAnalyzer(typeAnalyzer);

  const sourceFile = project.createSourceFile(
    "/circular.ts",
    `
    interface Node {
      child: Node;
    }
    type NodeRef = Node;
  `,
  );
  const context = new ExtractorContext(project, sourceFile);

  // Mock circular dependency detection
  vi.spyOn(context, "enterCircularCheck").mockReturnValue(false);

  const typeAlias = sourceFile.getTypeAlias("NodeRef")!;
  const referenceTypeNode = typeAlias.getTypeNode()!;

  const result = analyzer.analyze({
    name: "node",
    typeNode: referenceTypeNode,
    context,
    options: {},
  });

  // Should handle circular dependency
  expect(result).toBeDefined();
});
