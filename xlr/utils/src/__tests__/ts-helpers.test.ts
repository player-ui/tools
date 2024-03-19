import { test, expect, describe } from "vitest";
import * as ts from "typescript";
import { NodeType } from "@player-tools/xlr";

import {
  tsStripOptionalType,
  isExportedDeclaration,
  applyPickOrOmitToNodeType,
  getStringLiteralsFromUnion,
  applyPartialOrRequiredToNodeType,
} from "../ts-helpers";

test("tsStripOptionalType", () => {
  const input: ts.TypeNode = ts.factory.createKeywordTypeNode(
    ts.SyntaxKind.StringKeyword
  );
  const expected: ts.TypeNode = ts.factory.createKeywordTypeNode(
    ts.SyntaxKind.StringKeyword
  );
  const actual = tsStripOptionalType(input);
  expect(actual).toEqual(expected);
});

describe("isExportedDeclaration", () => {
  test("should return false for a non exported Statement", () => {
    const source = ts.createSourceFile(
      "test.ts",
      `
        interface Test {
          prop?: string;
        }
      `,
      ts.ScriptTarget.Latest,
      true
    );
    const node = source.statements[0] as ts.Statement;

    const result = isExportedDeclaration(node);
    expect(result).toBe(false);
  });

  test("should return true for an exported Statement", () => {
    const source = ts.createSourceFile(
      "test.ts",
      `
          export interface Test {
            prop?: string;
          }
        `,
      ts.ScriptTarget.Latest,
      true
    );
    const node = source.statements[0] as ts.Statement;

    const result = isExportedDeclaration(node);
    expect(result).toBe(true);
  });
});

test("getStringLiteralsFromUnion", () => {
  const input: ts.Node = ts.factory.createUnionTypeNode([
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("foo")),
    ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("bar")),
  ]);
  const expected: Set<string> = new Set(["foo", "bar"]);
  const actual = getStringLiteralsFromUnion(input);
  expect(actual).toEqual(expected);
});

describe("applyPickOrOmitToNodeType", () => {
  test("Omit - Doesn't filter property that doesn't exist", () => {
    const baseObject: NodeType = {
      type: "object",
      properties: { foo: { node: { type: "string" }, required: false } },
      additionalProperties: false,
    };
    const operation = "Omit";
    const properties = new Set(["bar"]);

    const result = applyPickOrOmitToNodeType(baseObject, operation, properties);

    expect(result).toStrictEqual(baseObject);
  });

  test("Omit - Filters property that do exist", () => {
    const baseObject: NodeType = {
      type: "object",
      properties: {
        foo: { node: { type: "string" }, required: false },
        bar: { node: { type: "string" }, required: false },
      },
      additionalProperties: false,
    };

    const filteredObject: NodeType = {
      type: "object",
      properties: { foo: { node: { type: "string" }, required: false } },
      additionalProperties: false,
    };
    const operation = "Omit";
    const properties = new Set(["bar"]);

    const result = applyPickOrOmitToNodeType(baseObject, operation, properties);

    expect(result).toStrictEqual(filteredObject);
  });

  test("Pick - Selects property that do exist", () => {
    const baseObject: NodeType = {
      type: "object",
      properties: {
        foo: { node: { type: "string" }, required: false },
        bar: { node: { type: "string" }, required: false },
      },
      additionalProperties: false,
    };

    const filteredObject: NodeType = {
      type: "object",
      properties: { bar: { node: { type: "string" }, required: false } },
      additionalProperties: false,
    };
    const operation = "Pick";
    const properties = new Set(["bar"]);

    const result = applyPickOrOmitToNodeType(baseObject, operation, properties);

    expect(result).toStrictEqual(filteredObject);
  });
});

describe("applyPartialOrRequiredToNodeType", () => {
  test("Partial - Makes required properties optional", () => {
    const baseObject: NodeType = {
      type: "object",
      properties: {
        foo: { node: { type: "string" }, required: false },
        bar: { node: { type: "string" }, required: true },
      },
      additionalProperties: false,
    };

    const modifiedObject: NodeType = {
      type: "object",
      properties: {
        foo: { node: { type: "string" }, required: false },
        bar: { node: { type: "string" }, required: false },
      },
      additionalProperties: false,
    };

    const result = applyPartialOrRequiredToNodeType(baseObject, false);

    expect(result).toStrictEqual(modifiedObject);
  });

  test("Required - Makes optional properties required", () => {
    const baseObject: NodeType = {
      type: "object",
      properties: {
        foo: { node: { type: "string" }, required: false },
        bar: { node: { type: "string" }, required: true },
      },
      additionalProperties: false,
    };

    const modifiedObject: NodeType = {
      type: "object",
      properties: {
        foo: { node: { type: "string" }, required: true },
        bar: { node: { type: "string" }, required: true },
      },
      additionalProperties: false,
    };

    const result = applyPartialOrRequiredToNodeType(baseObject, true);

    expect(result).toStrictEqual(modifiedObject);
  });
});
