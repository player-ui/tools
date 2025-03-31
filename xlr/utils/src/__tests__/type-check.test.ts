import * as ts from "typescript";
import { isOptionalProperty } from "../type-checks";
import { describe, test, expect } from "vitest";

describe("isOptionalProperty", () => {
  test("should return true for an optional property", () => {
    const source = ts.createSourceFile(
      "test.ts",
      `
      interface Test {
        prop?: string;
      }
    `,
      ts.ScriptTarget.Latest,
      true,
    );
    const node = source.statements[0] as ts.InterfaceDeclaration;
    const prop = node.members[0] as ts.PropertySignature;

    expect(isOptionalProperty(prop)).toBe(true);
  });

  test("should return false for a non-optional property", () => {
    const source = ts.createSourceFile(
      "test.ts",
      `
      interface Test {
        prop: string;
      }
    `,
      ts.ScriptTarget.Latest,
      true,
    );
    const node = source.statements[0] as ts.InterfaceDeclaration;
    const prop = node.members[0] as ts.PropertySignature;

    expect(isOptionalProperty(prop)).toBe(false);
  });
});
