import { test, expect, describe } from "vitest";
import type { FunctionType, OrType, TupleType } from "@player-tools/xlr";
import { createDocString } from "../documentation";

describe("docs", () => {
  test("or", () => {
    const type1: OrType = {
      type: "or",
      or: [
        {
          type: "string",
        },
        {
          type: "array",
          elementType: {
            type: "string",
          },
        },
      ],
    };

    expect(createDocString(type1)).toMatchInlineSnapshot(
      `"string | Array<string>"`,
    );
  });

  test("function", () => {
    const type1: FunctionType = {
      type: "function",
      name: "testABC",
      parameters: [
        {
          name: "a",
          type: {
            type: "string",
          },
        },
        {
          name: "b",
          type: {
            type: "array",
            elementType: {
              type: "string",
            },
          },
        },
      ],
      returnType: {
        type: "string",
      },
    };

    expect(createDocString(type1)).toMatchInlineSnapshot(
      `"function testABC(a: string, b: Array<string>): string"`,
    );
  });

  test("tuple", () => {
    const type1: TupleType = {
      type: "tuple",
      name: "testABC",
      elementTypes: [
        {
          name: "a",
          type: {
            type: "string",
          },
        },
        {
          type: {
            type: "array",
            elementType: {
              type: "string",
            },
          },
        },
      ],
      minItems: 2,
      additionalItems: false,
    };

    expect(createDocString(type1)).toMatchInlineSnapshot(
      `"[a: string, Array<string>]"`,
    );
  });

  test("const", () => {
    const type1: OrType = {
      type: "or",
      or: [
        {
          type: "string",
          const: "abc",
        },
        {
          type: "number",
          const: 123,
        },
        {
          type: "boolean",
          const: true,
        },
        {
          type: "array",
          elementType: {
            type: "string",
          },
        },
      ],
    };

    expect(createDocString(type1)).toMatchInlineSnapshot(
      `""abc" | 123 | true | Array<string>"`,
    );
  });
});
