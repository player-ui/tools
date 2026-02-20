import { test, expect, describe } from "vitest";
import * as ts from "typescript";
import type { NodeType } from "@player-tools/xlr";

import {
  tsStripOptionalType,
  isExportedDeclaration,
  applyPickOrOmitToNodeType,
  getStringLiteralsFromUnion,
  applyPartialOrRequiredToNodeType,
} from "../ts-helpers";

test("tsStripOptionalType", () => {
  const input: ts.TypeNode = ts.factory.createKeywordTypeNode(
    ts.SyntaxKind.StringKeyword,
  );
  const expected: ts.TypeNode = ts.factory.createKeywordTypeNode(
    ts.SyntaxKind.StringKeyword,
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
      true,
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
      true,
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

// describe("fillInGenerics", () => {
//   test("scopes refs inside object with genericTokens to inner generic, not top-level", () => {
//     // Simulates Schema.DataType<T = unknown> nested under Flow<T = Asset>:
//     // inner object has T = unknown; we pass top-level map T → Asset.
//     // Refs inside the inner object (e.g. default: ref "T") must resolve to unknown.
//     const assetLikeType: NodeType = {
//       type: "object",
//       properties: {
//         id: { required: true, node: { type: "string" } },
//         type: { required: true, node: { type: "string" } },
//       },
//       additionalProperties: false,
//     };
//     const topLevelGenerics = new Map<string, NodeType>([["T", assetLikeType]]);

//     const dataTypeLike: NodeType = {
//       type: "object",
//       name: "DataType",
//       properties: {
//         type: {
//           required: true,
//           node: { type: "string" },
//         },
//         default: {
//           required: false,
//           node: { type: "ref", ref: "T" },
//         },
//       },
//       additionalProperties: false,
//       genericTokens: [
//         { symbol: "T", constraints: undefined, default: { type: "unknown" } },
//       ],
//     } as NodeType;

//     const result = fillInGenerics(dataTypeLike, topLevelGenerics);

//     expect(result.type).toBe("object");
//     const resultObj = result as ObjectType;
//     expect(resultObj.properties.default.node).toBeDefined();
//     // Resolved from inner scope (DataType's T = unknown), not top-level (Asset)
//     expect((resultObj.properties.default.node as { type?: string }).type).toBe(
//       "unknown",
//     );
//   });

//   test("uses passed-in generic map when object has no genericTokens", () => {
//     const assetLikeType: NodeType = {
//       type: "object",
//       properties: {
//         id: { required: true, node: { type: "string" } },
//       },
//       additionalProperties: false,
//     };
//     const generics = new Map<string, NodeType>([["T", assetLikeType]]);

//     // No genericTokens on this object (e.g. Flow level): passed-in map is used,
//     // so ref "T" resolves to Asset — Flow still works as T = Asset.
//     const nodeWithRefT: NodeType = {
//       type: "object",
//       properties: {
//         value: {
//           required: true,
//           node: { type: "ref", ref: "T" },
//         },
//       },
//       additionalProperties: false,
//     };

//     const result = fillInGenerics(nodeWithRefT, generics);

//     const resultObj = result as ObjectType;
//     expect(resultObj.properties.value.node).toBeDefined();
//     expect((resultObj.properties.value.node as { type?: string }).type).toBe(
//       "object",
//     );
//   });
// });
