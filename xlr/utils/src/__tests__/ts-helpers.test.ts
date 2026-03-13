import { test, expect, describe } from "vitest";
import * as ts from "typescript";
import type {
  NodeType,
  NodeTypeWithGenerics,
  ObjectNode,
  OrType,
} from "@player-tools/xlr";

import {
  tsStripOptionalType,
  isExportedDeclaration,
  isExportedModuleDeclaration,
  isNodeExported,
  getReferencedType,
  isTypeScriptLibType,
  buildTemplateRegex,
  fillInGenerics,
  applyPickOrOmitToNodeType,
  getStringLiteralsFromUnion,
  applyPartialOrRequiredToNodeType,
  applyExcludeToNodeType,
} from "../ts-helpers";
import { ScriptTarget } from "typescript";

/** Create a TypeChecker from a source string (single file). */
function createChecker(source: string, fileName = "test.ts"): ts.TypeChecker {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const defaultHost = ts.createCompilerHost({});
  const host: ts.CompilerHost = {
    ...defaultHost,
    getSourceFile: (name) =>
      name === fileName
        ? sourceFile
        : defaultHost.getSourceFile(name, ScriptTarget.ESNext),
    writeFile: () => {},
    getCurrentDirectory: () => "",
    readFile: () => "",
  };
  const program = ts.createProgram([fileName], {}, host);
  return program.getTypeChecker();
}

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

test("tsStripOptionalType strips optional type", () => {
  const inner = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
  const optional = ts.factory.createOptionalTypeNode(inner);
  const actual = tsStripOptionalType(optional);
  expect(actual).toBe(inner);
  expect(ts.isOptionalTypeNode(actual)).toBe(false);
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

  test("should return false for node without modifiers", () => {
    const source = ts.createSourceFile(
      "test.ts",
      "const x = 1;",
      ts.ScriptTarget.Latest,
      true,
    );
    const node = source.statements[0] as ts.Statement;
    expect(ts.canHaveModifiers(node)).toBe(true);
    const result = isExportedDeclaration(node);
    expect(result).toBe(false);
  });
});

describe("isExportedModuleDeclaration", () => {
  test("returns true for exported module declaration", () => {
    const source = ts.createSourceFile(
      "test.ts",
      "export module M { }",
      ts.ScriptTarget.Latest,
      true,
    );
    const node = source.statements[0] as ts.Statement;
    expect(isExportedModuleDeclaration(node)).toBe(true);
    expect(ts.isModuleDeclaration(node)).toBe(true);
  });

  test("returns false for non-exported module declaration", () => {
    const source = ts.createSourceFile(
      "test.ts",
      "module M { }",
      ts.ScriptTarget.Latest,
      true,
    );
    const node = source.statements[0] as ts.Statement;
    expect(isExportedModuleDeclaration(node)).toBe(false);
  });

  test("returns false for exported non-module declaration", () => {
    const source = ts.createSourceFile(
      "test.ts",
      "export interface I { }",
      ts.ScriptTarget.Latest,
      true,
    );
    const node = source.statements[0] as ts.Statement;
    expect(isExportedModuleDeclaration(node)).toBe(false);
  });
});

describe("isNodeExported", () => {
  test("returns true when node has Export modifier", () => {
    const source = ts.createSourceFile(
      "test.ts",
      "export interface I { x: number; }",
      ts.ScriptTarget.Latest,
      true,
    );
    const decl = source.statements[0] as ts.InterfaceDeclaration;
    expect(isNodeExported(decl)).toBe(true);
  });

  test("returns false when node is nested and has no Export modifier", () => {
    const source = ts.createSourceFile(
      "test.ts",
      "namespace N { interface I { x: number; } }",
      ts.ScriptTarget.Latest,
      true,
    );
    const mod = source.statements[0] as ts.ModuleDeclaration;
    const body = mod.body as ts.ModuleBlock;
    const decl = body.statements[0] as ts.InterfaceDeclaration;
    expect(isNodeExported(decl)).toBe(false);
  });

  test("returns true when parent is SourceFile (top-level)", () => {
    const source = ts.createSourceFile(
      "test.ts",
      "type T = string;",
      ts.ScriptTarget.Latest,
      true,
    );
    const decl = source.statements[0];
    expect(decl.parent?.kind).toBe(ts.SyntaxKind.SourceFile);
    expect(isNodeExported(decl)).toBe(true);
  });
});

describe("getReferencedType", () => {
  test("returns declaration and exported for interface reference", () => {
    const source = `interface Foo { a: number }
type Bar = Foo;`;
    const checker = createChecker(source);
    const sourceFile = ts.createSourceFile(
      "test.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
    const typeRef = typeAlias.type as ts.TypeReferenceNode;
    const result = getReferencedType(typeRef, checker);
    expect(result).toBeDefined();
    expect(result!.declaration.kind).toBe(ts.SyntaxKind.InterfaceDeclaration);
    expect(ts.isInterfaceDeclaration(result!.declaration)).toBe(true);
    expect(result!.exported).toBe(true);
  });

  test("returns declaration for type alias reference", () => {
    const source = `type Foo = { a: number };
type Bar = Foo;`;
    const checker = createChecker(source);
    const sourceFile = ts.createSourceFile(
      "test.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
    const typeRef = typeAlias.type as ts.TypeReferenceNode;
    const result = getReferencedType(typeRef, checker);
    expect(result).toBeDefined();
    expect(result!.declaration.kind).toBe(ts.SyntaxKind.TypeAliasDeclaration);
    expect(ts.isTypeAliasDeclaration(result!.declaration)).toBe(true);
  });

  test("returns undefined when reference is to class (not interface/type alias)", () => {
    const source = `class C { }
type Bar = C;`;
    const checker = createChecker(source);
    const sourceFile = ts.createSourceFile(
      "test.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
    const typeRef = typeAlias.type as ts.TypeReferenceNode;
    const result = getReferencedType(typeRef, checker);
    expect(result).toBeUndefined();
  });
});

describe("isTypeScriptLibType", () => {
  test("returns true for Promise (lib type)", () => {
    const source = "type T = Promise<string>;";
    const checker = createChecker(source);
    const sourceFile = ts.createSourceFile(
      "test.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const typeRef = typeAlias.type as ts.TypeReferenceNode;
    expect(isTypeScriptLibType(typeRef, checker)).toBe(true);
  });

  test("returns false for user-defined type", () => {
    const source = "interface Foo { } type T = Foo;";
    const checker = createChecker(source);
    const sourceFile = ts.createSourceFile(
      "test.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const typeAlias = sourceFile.statements[1] as ts.TypeAliasDeclaration;
    const typeRef = typeAlias.type as ts.TypeReferenceNode;
    expect(isTypeScriptLibType(typeRef, checker)).toBe(false);
  });

  test("returns false when symbol is undefined", () => {
    const source = "type T = NonExistent;";
    const checker = createChecker(source);
    const typeRef = ts.factory.createTypeReferenceNode(
      ts.factory.createIdentifier("NonExistent"),
    );
    expect(isTypeScriptLibType(typeRef, checker)).toBe(false);
  });
});

describe("getStringLiteralsFromUnion", () => {
  test("extracts string literals from union type node", () => {
    const input: ts.Node = ts.factory.createUnionTypeNode([
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("foo")),
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("bar")),
    ]);
    const expected: Set<string> = new Set(["foo", "bar"]);
    const actual = getStringLiteralsFromUnion(input);
    expect(actual).toEqual(expected);
  });

  test("returns single string literal from LiteralTypeNode", () => {
    const input = ts.factory.createLiteralTypeNode(
      ts.factory.createStringLiteral("only"),
    );
    expect(getStringLiteralsFromUnion(input)).toEqual(new Set(["only"]));
  });

  test("returns empty set for non-union non-literal node", () => {
    const input = ts.factory.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
    expect(getStringLiteralsFromUnion(input)).toEqual(new Set());
  });

  test("union with non-string literal yields empty string in set", () => {
    const input = ts.factory.createUnionTypeNode([
      ts.factory.createLiteralTypeNode(ts.factory.createStringLiteral("a")),
      ts.factory.createLiteralTypeNode(ts.factory.createNumericLiteral(42)),
    ]);
    const actual = getStringLiteralsFromUnion(input);
    expect(actual).toEqual(new Set(["a", ""]));
  });
});

describe("buildTemplateRegex", () => {
  test("builds regex for template literal with string, number, boolean", () => {
    const source = "type T = `pre${string}mid${number}suf`;";
    const checker = createChecker(source);
    const sourceFile = ts.createSourceFile(
      "test.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const templateNode = typeAlias.type as ts.TemplateLiteralTypeNode;
    const regex = buildTemplateRegex(templateNode, checker);
    expect(regex).toBe("pre.*mid[0-9]*suf");
  });

  test("template with one string span", () => {
    const source = "type T = `prefix-${string}-suffix`;";
    const checker = createChecker(source);
    const sourceFile = ts.createSourceFile(
      "test.ts",
      source,
      ts.ScriptTarget.Latest,
      true,
    );
    const typeAlias = sourceFile.statements[0] as ts.TypeAliasDeclaration;
    const templateNode = typeAlias.type as ts.TemplateLiteralTypeNode;
    const regex = buildTemplateRegex(templateNode, checker);
    expect(regex).toBe("prefix-.*-suffix");
  });
});

describe("fillInGenerics", () => {
  test("returns primitive node unchanged when no generics", () => {
    const node: NodeType = { type: "string" };
    expect(fillInGenerics(node)).toBe(node);
  });

  test("fills ref with value from generics map", () => {
    const refNode: NodeType = {
      type: "ref",
      ref: "T",
    };
    const generics = new Map<string, NodeType>([["T", { type: "string" }]]);
    const result = fillInGenerics(refNode, generics);
    expect(result).toEqual({ type: "string" });
  });

  test("ref with genericArguments fills each argument", () => {
    const refNode: NodeType = {
      type: "ref",
      ref: "Outer",
      genericArguments: [{ type: "ref", ref: "T" }],
    };
    const generics = new Map<string, NodeType>([["T", { type: "number" }]]);
    const result = fillInGenerics(refNode, generics);
    expect(result).toMatchObject({
      type: "ref",
      ref: "Outer",
      genericArguments: [{ type: "number" }],
    });
  });

  test("ref not in map returns ref with filled genericArguments", () => {
    const refNode: NodeType = {
      type: "ref",
      ref: "Outer",
      genericArguments: [{ type: "ref", ref: "T" }],
    };
    const generics = new Map<string, NodeType>([["T", { type: "boolean" }]]);
    const result = fillInGenerics(refNode, generics);
    expect(result).toMatchObject({
      type: "ref",
      ref: "Outer",
      genericArguments: [{ type: "boolean" }],
    });
  });

  test("object properties are filled recursively", () => {
    const obj: NodeType = {
      type: "object",
      properties: {
        p: { required: true, node: { type: "ref", ref: "T" } },
      },
      additionalProperties: false,
    };
    const generics = new Map<string, NodeType>([["T", { type: "string" }]]);
    const result = fillInGenerics(obj, generics);
    expect(result).toMatchObject({
      type: "object",
      properties: {
        p: { required: true, node: { type: "string" } },
      },
    });
  });

  test("array elementType is filled", () => {
    const arr: NodeType = {
      type: "array",
      elementType: { type: "ref", ref: "T" },
    };
    const generics = new Map<string, NodeType>([["T", { type: "number" }]]);
    const result = fillInGenerics(arr, generics);
    expect(result).toEqual({
      type: "array",
      elementType: { type: "number" },
    });
  });

  test("or type members are filled", () => {
    const orNode: NodeType = {
      type: "or",
      or: [{ type: "ref", ref: "T" }, { type: "string" }],
    };
    const generics = new Map<string, NodeType>([["T", { type: "number" }]]);
    const result = fillInGenerics(orNode, generics);
    expect(result).toMatchObject({
      type: "or",
      or: [{ type: "number" }, { type: "string" }],
    });
  });

  test("and type members are filled", () => {
    const andNode: NodeType = {
      type: "and",
      and: [
        { type: "object", properties: {}, additionalProperties: false },
        { type: "ref", ref: "T" },
      ],
    };
    const generics = new Map<string, NodeType>([["T", { type: "null" }]]);
    const result = fillInGenerics(andNode, generics);
    expect(result.type).toBe("and");
    expect((result as { and: NodeType[] }).and).toHaveLength(2);
    expect((result as { and: NodeType[] }).and[1]).toEqual({ type: "null" });
  });

  test("record keyType and valueType are filled", () => {
    const recordNode: NodeType = {
      type: "record",
      keyType: { type: "ref", ref: "K" },
      valueType: { type: "ref", ref: "V" },
    };
    const generics = new Map<string, NodeType>([
      ["K", { type: "string" }],
      ["V", { type: "number" }],
    ]);
    const result = fillInGenerics(recordNode, generics);
    expect(result).toEqual({
      type: "record",
      keyType: { type: "string" },
      valueType: { type: "number" },
    });
  });

  test("generic node without map builds defaults from genericTokens", () => {
    const genericObj: NodeTypeWithGenerics<ObjectNode> = {
      type: "object",
      properties: {},
      additionalProperties: false,
      genericTokens: [
        {
          symbol: "T",
          default: { type: "string" },
          constraints: undefined,
        },
      ],
    };
    const result = fillInGenerics(genericObj);
    expect(result).toMatchObject({ type: "object" });
  });

  test("conditional type with both sides non-ref resolves via resolveConditional", () => {
    const conditionalNode: NodeType = {
      type: "conditional",
      check: {
        left: { type: "string" },
        right: { type: "string" },
      },
      value: {
        true: { type: "number" },
        false: { type: "boolean" },
      },
    };
    const result = fillInGenerics(conditionalNode);
    expect(result).toEqual({ type: "number" });
  });

  test("conditional type with ref in check returns unresolved conditional", () => {
    const conditionalNode: NodeType = {
      type: "conditional",
      check: {
        left: { type: "ref", ref: "T" },
        right: { type: "string" },
      },
      value: {
        true: { type: "number" },
        false: { type: "boolean" },
      },
    };
    const result = fillInGenerics(conditionalNode);
    expect(result).toMatchObject({
      type: "conditional",
      check: { left: { type: "ref", ref: "T" }, right: { type: "string" } },
      value: { true: { type: "number" }, false: { type: "boolean" } },
    });
  });

  test("object with genericTokens and extends fills constraints and extends", () => {
    const objWithExtends: NodeTypeWithGenerics<ObjectNode> = {
      type: "object",
      properties: { p: { required: false, node: { type: "ref", ref: "T" } } },
      additionalProperties: false,
      genericTokens: [
        { symbol: "T", default: { type: "string" }, constraints: undefined },
      ],
      extends: { type: "ref", ref: "Base" },
    };
    const generics = new Map<string, NodeType>([
      ["T", { type: "number" }],
      ["Base", { type: "object", properties: {}, additionalProperties: false }],
    ]);
    const result = fillInGenerics(objWithExtends, generics);
    expect(result).toMatchObject({
      type: "object",
      properties: { p: { node: { type: "number" } } },
      extends: { type: "object" },
    });
  });
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

  test("Pick - no matching properties returns undefined", () => {
    const baseObject: NodeType = {
      type: "object",
      properties: { foo: { node: { type: "string" }, required: false } },
      additionalProperties: false,
    };
    const result = applyPickOrOmitToNodeType(
      baseObject,
      "Pick",
      new Set(["bar"]),
    );
    expect(result).toBeUndefined();
  });

  test("Omit - all properties with additionalProperties false returns undefined", () => {
    const baseObject: NodeType = {
      type: "object",
      properties: { foo: { node: { type: "string" }, required: false } },
      additionalProperties: false,
    };
    const result = applyPickOrOmitToNodeType(
      baseObject,
      "Omit",
      new Set(["foo"]),
    );
    expect(result).toBeUndefined();
  });

  test("and type - applies to each member and returns and", () => {
    const baseObject: NodeType = {
      type: "and",
      and: [
        {
          type: "object",
          properties: {
            a: { node: { type: "string" }, required: false },
            b: { node: { type: "string" }, required: false },
          },
          additionalProperties: false,
        },
        {
          type: "object",
          properties: {
            b: { node: { type: "string" }, required: false },
            c: { node: { type: "string" }, required: false },
          },
          additionalProperties: false,
        },
      ],
    };
    const result = applyPickOrOmitToNodeType(
      baseObject,
      "Pick",
      new Set(["b"]),
    );
    expect(result).toMatchObject({ type: "and" });
    const and = (result as { and: NodeType[] }).and;
    expect(and).toHaveLength(2);
    expect(and[0]).toMatchObject({
      type: "object",
      properties: { b: { node: { type: "string" }, required: false } },
    });
    expect(and[1]).toMatchObject({
      type: "object",
      properties: { b: { node: { type: "string" }, required: false } },
    });
  });

  test("or type - applies to each member and returns or", () => {
    const baseObject: NodeType = {
      type: "or",
      or: [
        {
          type: "object",
          properties: {
            x: { node: { type: "string" }, required: false },
            y: { node: { type: "string" }, required: false },
          },
          additionalProperties: false,
        },
      ],
    };
    const result = applyPickOrOmitToNodeType(
      baseObject,
      "Pick",
      new Set(["x"]),
    );
    expect(result).toMatchObject({
      type: "object",
      properties: { x: { node: { type: "string" }, required: false } },
    });
  });

  test("or type with multiple members returns single or", () => {
    const baseObject: NodeType = {
      type: "or",
      or: [
        {
          type: "object",
          properties: { a: { node: { type: "string" }, required: false } },
          additionalProperties: false,
        },
        {
          type: "object",
          properties: { b: { node: { type: "string" }, required: false } },
          additionalProperties: false,
        },
      ],
    };
    const result = applyPickOrOmitToNodeType(
      baseObject,
      "Pick",
      new Set(["a", "b"]),
    );
    expect(result).toMatchObject({ type: "or", or: expect.any(Array) });
    expect((result as { or: NodeType[] }).or.length).toBe(2);
  });

  test("throws when applying Pick/Omit to non-object non-union non-intersection", () => {
    const baseObject: NodeType = { type: "string" };
    expect(() =>
      applyPickOrOmitToNodeType(baseObject, "Pick", new Set(["x"])),
    ).toThrow(/Can not apply Pick to type string/);
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

  test("and type - applies modifier to each member", () => {
    const baseObject: NodeType = {
      type: "and",
      and: [
        {
          type: "object",
          properties: { a: { node: { type: "string" }, required: false } },
          additionalProperties: false,
        },
      ],
    };
    const result = applyPartialOrRequiredToNodeType(baseObject, true);
    expect(result).toMatchObject({ type: "and" });
    expect((result as { and: NodeType[] }).and[0]).toMatchObject({
      type: "object",
      properties: { a: { required: true, node: { type: "string" } } },
    });
  });

  test("or type - applies modifier to each member", () => {
    const baseObject: NodeType = {
      type: "or",
      or: [
        {
          type: "object",
          properties: { a: { node: { type: "string" }, required: true } },
          additionalProperties: false,
        },
      ],
    };
    const result = applyPartialOrRequiredToNodeType(baseObject, false);
    expect(result).toMatchObject({ type: "or" });
    expect((result as { or: NodeType[] }).or[0]).toMatchObject({
      type: "object",
      properties: { a: { required: false, node: { type: "string" } } },
    });
  });

  test("throws when applying Partial/Required to non-object non-union non-intersection", () => {
    const baseObject: NodeType = { type: "number" };
    expect(() => applyPartialOrRequiredToNodeType(baseObject, false)).toThrow(
      /Can not apply Partial to type number/,
    );
  });
});

describe("applyExcludeToNodeType", () => {
  test("excludes single type from union", () => {
    const baseObject: OrType = {
      type: "or",
      or: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
    };
    const result = applyExcludeToNodeType(baseObject, { type: "number" });
    expect(result).toMatchObject({
      type: "or",
      or: [{ type: "string" }, { type: "boolean" }],
    });
  });

  test("excludes with filter union (or)", () => {
    const baseObject: OrType = {
      type: "or",
      or: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
    };
    const filters: OrType = {
      type: "or",
      or: [{ type: "number" }, { type: "boolean" }],
    };
    const result = applyExcludeToNodeType(baseObject, filters);
    expect(result).toEqual({ type: "string" });
  });

  test("single remaining member returns that member", () => {
    const baseObject: OrType = {
      type: "or",
      or: [{ type: "string" }, { type: "number" }],
    };
    const result = applyExcludeToNodeType(baseObject, { type: "number" });
    expect(result).toEqual({ type: "string" });
  });

  test("multiple remaining members returns or", () => {
    const baseObject: OrType = {
      type: "or",
      or: [{ type: "string" }, { type: "number" }, { type: "boolean" }],
    };
    const result = applyExcludeToNodeType(baseObject, { type: "number" });
    expect(result).toMatchObject({
      type: "or",
      or: [{ type: "string" }, { type: "boolean" }],
    });
  });
});
