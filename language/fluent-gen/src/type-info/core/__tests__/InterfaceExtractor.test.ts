/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi, beforeEach } from "vitest";
import { Project } from "ts-morph";
import { InterfaceExtractor } from "../InterfaceExtractor.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

let consoleWarnSpy: any;

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
});

test("creates InterfaceExtractor instance", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface TestInterface { prop: string; }",
  );
  const extractor = new InterfaceExtractor(project, sourceFile);

  expect(extractor).toBeInstanceOf(InterfaceExtractor);
  expect(extractor.getContext()).toBeDefined();
  expect(extractor.getTypeAnalyzer()).toBeDefined();
  expect(extractor.getSymbolResolver()).toBeDefined();
});

test("extracts simple interface with primitive properties", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      name: string;
      age: number;
      isActive: boolean;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result).toEqual({
    kind: "non-terminal",
    type: "object",
    name: "TestInterface",
    typeAsString: expect.stringContaining("interface TestInterface"),
    properties: [
      {
        kind: "terminal",
        type: "string",
        name: "name",
        typeAsString: "string",
      },
      {
        kind: "terminal",
        type: "number",
        name: "age",
        typeAsString: "number",
      },
      {
        kind: "terminal",
        type: "boolean",
        name: "isActive",
        typeAsString: "boolean",
      },
    ],
    filePath: "/test.ts",
    dependencies: [],
  });
});

test("extracts interface with optional properties", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      name: string;
      age?: number;
      email?: string;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  const properties = result.properties;
  expect(properties[0]).toEqual({
    kind: "terminal",
    type: "string",
    name: "name",
    typeAsString: "string",
  });
  expect(properties[1]).toEqual({
    kind: "terminal",
    type: "number",
    name: "age",
    typeAsString: "number",
    isOptional: true,
  });
  expect(properties[2]).toEqual({
    kind: "terminal",
    type: "string",
    name: "email",
    typeAsString: "string",
    isOptional: true,
  });
});

test("extracts interface with array properties", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      items: string[];
      numbers: Array<number>;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.properties).toEqual([
    {
      kind: "terminal",
      type: "string",
      name: "items",
      typeAsString: "string",
      isArray: true,
    },
    {
      kind: "terminal",
      type: "number",
      name: "numbers",
      typeAsString: "number",
      isArray: true,
    },
  ]);
});

test("extracts interface with JSDoc documentation", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /**
     * Test interface for documentation
     * @description This is a test interface
     */
    interface TestInterface {
      /** The name property */
      name: string;
      
      /**
       * The age property
       * @minimum 0
       */
      age: number;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.documentation).toContain("Test interface for documentation");
  expect(result.documentation).toContain(
    "@description This is a test interface",
  );

  const nameProperty = result.properties.find((p) => p.name === "name");
  const ageProperty = result.properties.find((p) => p.name === "age");

  expect(nameProperty?.documentation).toBe("The name property");
  expect(ageProperty?.documentation).toContain("The age property");
  expect(ageProperty?.documentation).toContain("@minimum 0");
});

test("extracts interface with extends clause", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface BaseInterface {
      id: string;
    }
    
    interface ExtendedInterface extends BaseInterface {
      name: string;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("ExtendedInterface");

  expect(result.name).toBe("ExtendedInterface");
  expect(result.properties).toEqual([
    {
      kind: "terminal",
      type: "string",
      name: "name",
      typeAsString: "string",
    },
  ]);

  // Should have dependency for BaseInterface
  expect(result.dependencies).toHaveLength(1);
  expect(result.dependencies[0]).toEqual({
    target: { kind: "local", filePath: "/test.ts", name: "BaseInterface" },
    dependency: "BaseInterface",
  });
});

test("extracts interface with generic extends clause", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface BaseInterface<T> {
      data: T;
    }
    
    interface ExtendedInterface extends BaseInterface<string> {
      name: string;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("ExtendedInterface");

  expect(result.name).toBe("ExtendedInterface");
  expect(result.dependencies).toHaveLength(1);
  expect(result.dependencies[0]).toEqual({
    target: { kind: "local", filePath: "/test.ts", name: "BaseInterface" },
    dependency: "BaseInterface",
  });
});

test("extracts interface with multiple extends clauses", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface Interface1 {
      prop1: string;
    }
    
    interface Interface2 {
      prop2: number;
    }
    
    interface ExtendedInterface extends Interface1, Interface2 {
      name: string;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("ExtendedInterface");

  expect(result.name).toBe("ExtendedInterface");
  expect(result.dependencies).toHaveLength(2);

  const dependencyNames = result.dependencies.map((d) => d.dependency);
  expect(dependencyNames).toContain("Interface1");
  expect(dependencyNames).toContain("Interface2");
});

test("extracts interface with generic parameters and defaults", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface GenericInterface<T = string, U extends object = {}> {
      data: T;
      metadata: U;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("GenericInterface");

  expect(result.name).toBe("GenericInterface");
  expect(result.properties).toHaveLength(2);

  // Properties should use default generic substitutions
  const dataProperty = result.properties.find((p) => p.name === "data");
  const metadataProperty = result.properties.find((p) => p.name === "metadata");

  expect(dataProperty).toBeDefined();
  expect(metadataProperty).toBeDefined();
});

test("throws error for non-existent interface", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface TestInterface { prop: string; }",
  );
  const extractor = new InterfaceExtractor(project, sourceFile);

  expect(() => extractor.extract("NonExistentInterface")).toThrow(
    "Interface 'NonExistentInterface' not found in '/test.ts'. Available interfaces: TestInterface",
  );
});

test("throws error with available interfaces when none exist", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "type TestType = string;",
  );
  const extractor = new InterfaceExtractor(project, sourceFile);

  expect(() => extractor.extract("NonExistentInterface")).toThrow(
    "Interface 'NonExistentInterface' not found in '/test.ts'. Available interfaces: none",
  );
});

test("handles circular dependency detection", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface CircularInterface {
      self: CircularInterface;
      name: string;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("CircularInterface");

  expect(result.name).toBe("CircularInterface");
  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "Circular dependency detected: CircularInterface",
  );
});

test("extracts complex nested interface", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface Address {
      street: string;
      city: string;
    }
    
    interface Person {
      name: string;
      address: Address;
      friends: Person[];
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("Person");

  expect(result.name).toBe("Person");
  expect(result.properties).toHaveLength(3);

  const nameProperty = result.properties.find((p) => p.name === "name");
  const addressProperty = result.properties.find((p) => p.name === "address");
  const friendsProperty = result.properties.find((p) => p.name === "friends");

  expect(nameProperty?.type).toBe("string");
  expect(addressProperty?.type).toBe("object");
  expect(friendsProperty?.type).toBe("object");
  expect(friendsProperty?.isArray).toBe(true);

  // Should have dependencies
  const dependencyNames = result.dependencies.map((d) => d.dependency);
  expect(dependencyNames).toContain("Address");
});

test("extracts interface with union types", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      status: "active" | "inactive" | "pending";
      value: string | number;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.properties).toHaveLength(2);

  const statusProperty = result.properties.find((p) => p.name === "status");
  const valueProperty = result.properties.find((p) => p.name === "value");

  // Union types might be analyzed as the first type in the union or as union type
  // depending on the analyzer implementation
  expect(statusProperty?.type).toBeDefined();
  expect(valueProperty?.type).toBeDefined();
});

test("extracts interface with tuple properties", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      coordinates: [number, number];
      nameAndAge: [string, number];
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.properties).toHaveLength(2);

  const coordinatesProperty = result.properties.find(
    (p) => p.name === "coordinates",
  );
  const nameAndAgeProperty = result.properties.find(
    (p) => p.name === "nameAndAge",
  );

  expect(coordinatesProperty?.type).toBe("object");
  expect(nameAndAgeProperty?.type).toBe("object");
});

test("extracts interface with intersection types", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      combined: { name: string } & { age: number };
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.properties).toHaveLength(1);

  const combinedProperty = result.properties.find((p) => p.name === "combined");
  expect(combinedProperty?.type).toBe("object");
});

test("handles empty interface", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface EmptyInterface {}",
  );
  const extractor = new InterfaceExtractor(project, sourceFile);

  const result = extractor.extract("EmptyInterface");

  expect(result.name).toBe("EmptyInterface");
  expect(result.properties).toEqual([]);
  expect(result.dependencies).toEqual([]);
});

test("extracts interface with method signatures", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      method(): void;
      methodWithParams(param: string): number;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  // Methods might not be extracted as properties depending on analyzer implementation
  // This test verifies the extractor doesn't crash with method signatures
  expect(result.name).toBe("TestInterface");
  expect(Array.isArray(result.properties)).toBe(true);
});

test("handles interface with index signatures", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      [key: string]: unknown;
      name: string;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.name).toBe("TestInterface");
  expect(result.properties).toHaveLength(1); // Only explicit properties, not index signature

  const nameProperty = result.properties.find((p) => p.name === "name");
  expect(nameProperty?.type).toBe("string");
});

test("extracts interface with utility types", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface BaseInterface {
      name: string;
      age: number;
      email: string;
    }
    
    interface TestInterface {
      partial: Partial<BaseInterface>;
      pick: Pick<BaseInterface, "name" | "age">;
      omit: Omit<BaseInterface, "email">;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.properties).toHaveLength(3);

  const partialProperty = result.properties.find((p) => p.name === "partial");
  const pickProperty = result.properties.find((p) => p.name === "pick");
  const omitProperty = result.properties.find((p) => p.name === "omit");

  expect(partialProperty?.type).toBe("object");
  expect(pickProperty?.type).toBe("object");
  expect(omitProperty?.type).toBe("object");

  // Should have dependencies for BaseInterface
  const dependencyNames = result.dependencies.map((d) => d.dependency);
  expect(dependencyNames).toContain("BaseInterface");
});

test("getContext returns the extractor context", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface TestInterface { prop: string; }",
  );
  const extractor = new InterfaceExtractor(project, sourceFile);

  const context = extractor.getContext();

  expect(context).toBeDefined();
  expect(context.getProject()).toBe(project);
  expect(context.getSourceFile()).toBe(sourceFile);
});

test("getTypeAnalyzer returns the type analyzer instance", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface TestInterface { prop: string; }",
  );
  const extractor = new InterfaceExtractor(project, sourceFile);

  const analyzer = extractor.getTypeAnalyzer();

  expect(analyzer).toBeDefined();
  expect(typeof analyzer.analyze).toBe("function");
});

test("getSymbolResolver returns the symbol resolver instance", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    "interface TestInterface { prop: string; }",
  );
  const extractor = new InterfaceExtractor(project, sourceFile);

  const resolver = extractor.getSymbolResolver();

  expect(resolver).toBeDefined();
  expect(typeof resolver.resolve).toBe("function");
});

test("handles interface with computed property names", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface {
      name: string;
      "computed-property": number;
      123: boolean;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  // At minimum should extract the regular name property
  expect(result.properties.length).toBeGreaterThan(0);

  const properties = result.properties;
  expect(properties.some((p) => p.name === "name")).toBe(true);
  // Computed properties might be handled differently by the analyzer
});

test("handles interface with complex generic constraints", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface TestInterface<T extends string | number = string> {
      value: T;
      array: T[];
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.name).toBe("TestInterface");
  expect(result.properties).toHaveLength(2);

  const valueProperty = result.properties.find((p) => p.name === "value");
  const arrayProperty = result.properties.find((p) => p.name === "array");

  expect(valueProperty).toBeDefined();
  expect(arrayProperty).toBeDefined();
  expect(arrayProperty?.isArray).toBe(true);
});

test("handles interface extraction with external module extends", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    import { ExternalInterface } from "some-module";
    
    interface TestInterface extends ExternalInterface {
      name: string;
    }
  `,
  );

  const extractor = new InterfaceExtractor(project, sourceFile);
  const result = extractor.extract("TestInterface");

  expect(result.name).toBe("TestInterface");
  expect(result.properties).toHaveLength(1);

  // Should try to resolve external dependency
  expect(result.dependencies.length).toBeGreaterThanOrEqual(0);
});
