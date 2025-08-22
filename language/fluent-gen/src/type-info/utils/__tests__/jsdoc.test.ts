import { test, expect } from "vitest";
import { Project } from "ts-morph";
import { extractJSDocFromNode } from "../jsdoc.js";

function createMockProject(): Project {
  return new Project({ useInMemoryFileSystem: true });
}

test("extractJSDocFromNode extracts single line JSDoc", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** This is a simple interface */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe("This is a simple interface");
});

test("extractJSDocFromNode extracts multiline JSDoc", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /**
     * This is a complex interface
     * that handles user data
     * with multiple properties
     */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe(
    "This is a complex interface\nthat handles user data\nwith multiple properties",
  );
});

test("extractJSDocFromNode extracts JSDoc with tags", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /**
     * User profile interface
     * @since 1.0.0
     * @author John Doe
     */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe("User profile interface\n@since 1.0.0\n@author John Doe");
});

test("extractJSDocFromNode extracts JSDoc from property", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface User {
      /** The user's full name */
      name: string;
      /** The user's email address */
      email: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const nameProperty = interfaceDecl.getProperty("name")!;
  const emailProperty = interfaceDecl.getProperty("email")!;

  expect(extractJSDocFromNode(nameProperty)).toBe("The user's full name");
  expect(extractJSDocFromNode(emailProperty)).toBe("The user's email address");
});

test("extractJSDocFromNode extracts JSDoc from method", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface UserService {
      /** 
       * Creates a new user
       * @param name The user's name
       * @returns The created user
       */
      createUser(name: string): User;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("UserService")!;
  const method = interfaceDecl.getMethod("createUser")!;
  const result = extractJSDocFromNode(method);

  expect(result).toBe(
    "Creates a new user\n@param name The user's name\n@returns The created user",
  );
});

test("extractJSDocFromNode extracts JSDoc from function", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** 
     * Validates user input
     * @param input The input to validate
     * @returns True if valid
     */
    function validateUser(input: string): boolean {
      return input.length > 0;
    }
  `,
  );

  const functionDecl = sourceFile.getFunction("validateUser")!;
  const result = extractJSDocFromNode(functionDecl);

  expect(result).toBe(
    "Validates user input\n@param input The input to validate\n@returns True if valid",
  );
});

test("extractJSDocFromNode extracts JSDoc from variable", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** Default user configuration */
    const defaultConfig = { name: "Anonymous" };
  `,
  );

  const variableStatement = sourceFile.getVariableStatements()[0]!;
  const result = extractJSDocFromNode(variableStatement);

  expect(result).toBe("Default user configuration");
});

test("extractJSDocFromNode extracts JSDoc from class", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /**
     * User management class
     * Handles all user-related operations
     */
    class UserManager {
      name: string = "";
    }
  `,
  );

  const classDecl = sourceFile.getClass("UserManager")!;
  const result = extractJSDocFromNode(classDecl);

  expect(result).toBe(
    "User management class\nHandles all user-related operations",
  );
});

test("extractJSDocFromNode extracts JSDoc from enum", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** User status enumeration */
    enum UserStatus {
      Active,
      Inactive
    }
  `,
  );

  const enumDecl = sourceFile.getEnum("UserStatus")!;
  const result = extractJSDocFromNode(enumDecl);

  expect(result).toBe("User status enumeration");
});

test("extractJSDocFromNode extracts JSDoc from type alias", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** User identifier type */
    type UserId = string | number;
  `,
  );

  const typeAlias = sourceFile.getTypeAlias("UserId")!;
  const result = extractJSDocFromNode(typeAlias);

  expect(result).toBe("User identifier type");
});

test("extractJSDocFromNode concatenates multiple JSDoc comments", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** First comment */
    /** Second comment */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe("First comment\nSecond comment");
});

test("extractJSDocFromNode handles empty JSDoc", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe("");
});

test("extractJSDocFromNode handles JSDoc with only whitespace", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /**
     *   
     *    
     */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe("");
});

test("extractJSDocFromNode returns undefined for nodes without JSDoc", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBeUndefined();
});

test("extractJSDocFromNode returns undefined for non-JSDocable nodes", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const nameProperty = interfaceDecl.getProperty("name")!;
  const typeNode = nameProperty.getTypeNode()!;

  const result = extractJSDocFromNode(typeNode);

  expect(result).toBeUndefined();
});

test("extractJSDocFromNode handles mixed JSDoc formats", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** Single line comment */
    /**
     * Multi-line comment
     * with additional info
     */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe(
    "Single line comment\nMulti-line comment\nwith additional info",
  );
});

test("extractJSDocFromNode preserves formatting in JSDoc", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /**
     * User interface with examples:
     * 
     * \`\`\`typescript
     * const user: User = {
     *   name: "John",
     *   email: "john@example.com"
     * };
     * \`\`\`
     */
    interface User {
      name: string;
      email: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe(
    `User interface with examples:\n\n\`\`\`typescript\nconst user: User = {\n  name: "John",\n  email: "john@example.com"\n};\n\`\`\``,
  );
});

test("extractJSDocFromNode handles JSDoc with special characters", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /** 
     * User with special chars: @#$%^&*()
     * And unicode: 🚀 ∀ ∈ ℝ
     */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe(
    "User with special chars: @#$%^&*()\nAnd unicode: 🚀 ∀ ∈ ℝ",
  );
});

test("extractJSDocFromNode handles JSDoc with HTML", () => {
  const project = createMockProject();
  const sourceFile = project.createSourceFile(
    "/test.ts",
    `
    /**
     * User interface with <strong>bold</strong> text
     * and <em>italic</em> formatting
     * <br>
     * Line break above
     */
    interface User {
      name: string;
    }
  `,
  );

  const interfaceDecl = sourceFile.getInterface("User")!;
  const result = extractJSDocFromNode(interfaceDecl);

  expect(result).toBe(
    "User interface with <strong>bold</strong> text\nand <em>italic</em> formatting\n<br>\nLine break above",
  );
});
