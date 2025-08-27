import { test, expect, beforeEach } from "vitest";
import { Project } from "ts-morph";
import { LocalDeclarationStrategy } from "../LocalDeclarationStrategy.js";
import type { ResolutionContext } from "../../../types.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

let strategy: LocalDeclarationStrategy;
let project: Project;

beforeEach(() => {
  strategy = new LocalDeclarationStrategy();
  project = createMockProject();
});

test("resolves interface declarations", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `interface UserData {
      id: string;
      name: string;
    }`,
  );

  const context: ResolutionContext = {
    symbolName: "UserData",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeDefined();
  expect(result!.declaration.getKindName()).toBe("InterfaceDeclaration");
  expect(result!.target).toEqual({
    kind: "local",
    filePath: "/test.ts",
    name: "UserData",
  });
  expect(result!.isLocal).toBe(true);
});

test("resolves enum declarations", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `enum Status {
      Active = "active",
      Inactive = "inactive"
    }`,
  );

  const context: ResolutionContext = {
    symbolName: "Status",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeDefined();
  expect(result!.declaration.getKindName()).toBe("EnumDeclaration");
  expect(result!.target).toEqual({
    kind: "local",
    filePath: "/test.ts",
    name: "Status",
  });
  expect(result!.isLocal).toBe(true);
});

test("resolves type alias declarations", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `type UserId = string;
     type UserRole = "admin" | "user" | "guest";`,
  );

  const context: ResolutionContext = {
    symbolName: "UserId",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeDefined();
  expect(result!.declaration.getKindName()).toBe("TypeAliasDeclaration");
  expect(result!.target).toEqual({
    kind: "local",
    filePath: "/test.ts",
    name: "UserId",
  });
  expect(result!.isLocal).toBe(true);
});

test("resolves union type alias declarations", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `type UserRole = "admin" | "user" | "guest";`,
  );

  const context: ResolutionContext = {
    symbolName: "UserRole",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeDefined();
  expect(result!.declaration.getKindName()).toBe("TypeAliasDeclaration");
  expect(result!.target).toEqual({
    kind: "local",
    filePath: "/test.ts",
    name: "UserRole",
  });
  expect(result!.isLocal).toBe(true);
});

test("returns null for non-existent symbols", () => {
  const sourceFile = project.createSourceFile("/test.ts", "interface User {}");

  const context: ResolutionContext = {
    symbolName: "NonExistent",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeNull();
});

test("prioritizes interfaces over type aliases with same name", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `type Data = { id: string };
     interface Data {
       id: string;
       name: string;
     }`,
  );

  const context: ResolutionContext = {
    symbolName: "Data",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeDefined();
  expect(result!.declaration.getKindName()).toBe("InterfaceDeclaration");
});

test("prioritizes enums over type aliases with same name", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `type Status = "active" | "inactive";
     enum Status {
       Active = "active",
       Inactive = "inactive"
     }`,
  );

  const context: ResolutionContext = {
    symbolName: "Status",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeDefined();
  expect(result!.declaration.getKindName()).toBe("EnumDeclaration");
});

test("resolves symbols with generic parameters", () => {
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `interface Container<T> {
       value: T;
     }
     
     type AsyncResult<T, E = Error> = Promise<T> | E;`,
  );

  const containerResult = strategy.resolve({
    symbolName: "Container",
    sourceFile,
  });

  const asyncResult = strategy.resolve({
    symbolName: "AsyncResult",
    sourceFile,
  });

  expect(containerResult).toBeDefined();
  expect(containerResult!.declaration.getKindName()).toBe(
    "InterfaceDeclaration",
  );

  expect(asyncResult).toBeDefined();
  expect(asyncResult!.declaration.getKindName()).toBe("TypeAliasDeclaration");
});

test("handles empty source files", () => {
  const sourceFile = project.createSourceFile("/empty.ts", "");

  const context: ResolutionContext = {
    symbolName: "AnySymbol",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeNull();
});

test("handles source files with only imports", () => {
  const sourceFile = project.createSourceFile(
    "/imports.ts",
    `import { SomeType } from 'external-lib';
     import * as utils from './utils';`,
  );

  const context: ResolutionContext = {
    symbolName: "SomeType",
    sourceFile,
  };

  const result = strategy.resolve(context);

  expect(result).toBeNull();
});

test("always returns true for canResolve", () => {
  const sourceFile = project.createSourceFile("/test.ts", "");

  const context: ResolutionContext = {
    symbolName: "AnySymbol",
    sourceFile,
  };

  expect(strategy.canResolve(context)).toBe(true);
});

test("has correct strategy name", () => {
  expect(strategy.name).toBe("LocalDeclaration");
});

test("handles complex nested declarations", () => {
  const sourceFile = project.createSourceFile(
    "/complex.ts",
    `interface User {
       profile: UserProfile;
       settings: UserSettings;
     }
     
     interface UserProfile {
       name: string;
       avatar?: string;
     }
     
     interface UserSettings {
       theme: Theme;
       notifications: boolean;
     }
     
     enum Theme {
       Light = "light",
       Dark = "dark"
     }
     
     type UserId = string;
     type UserData = User & { id: UserId };`,
  );

  const testCases = [
    { name: "User", expectedKind: "InterfaceDeclaration" },
    { name: "UserProfile", expectedKind: "InterfaceDeclaration" },
    { name: "UserSettings", expectedKind: "InterfaceDeclaration" },
    { name: "Theme", expectedKind: "EnumDeclaration" },
    { name: "UserId", expectedKind: "TypeAliasDeclaration" },
    { name: "UserData", expectedKind: "TypeAliasDeclaration" },
  ];

  testCases.forEach(({ name, expectedKind }) => {
    const result = strategy.resolve({
      symbolName: name,
      sourceFile,
    });

    expect(result).toBeDefined();
    expect(result!.declaration.getKindName()).toBe(expectedKind);
    expect(result!.target.name).toBe(name);
    expect(result!.isLocal).toBe(true);
  });
});

test("handles symbols with special characters in names", () => {
  const sourceFile = project.createSourceFile(
    "/special.ts",
    `interface User$Data {
       id: string;
     }
     
     type API_Response<T> = {
       data: T;
       status: number;
     };
     
     enum HTTP_STATUS {
       OK = 200,
       NOT_FOUND = 404
     }`,
  );

  const specialSymbols = ["User$Data", "API_Response", "HTTP_STATUS"];

  specialSymbols.forEach((symbolName) => {
    const result = strategy.resolve({
      symbolName,
      sourceFile,
    });

    expect(result).toBeDefined();
    expect(result!.target.name).toBe(symbolName);
    expect(result!.isLocal).toBe(true);
  });
});
