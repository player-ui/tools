import { test, expect, describe } from "vitest";
import type { ObjectType } from "@player-tools/xlr";
import { computeEffectiveObject, makePropertyMap } from "../validation-helpers";
import { parseTree } from "jsonc-parser";

describe("computeEffectiveObject tests", () => {
  test("mixed test", () => {
    const type1: ObjectType = {
      type: "object",
      properties: {
        foo: {
          required: true,
          node: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    };

    const type2: ObjectType = {
      type: "object",
      properties: {
        bar: {
          required: true,
          node: {
            type: "number",
          },
        },
      },
      additionalProperties: {
        type: "unknown",
      },
    };

    expect(computeEffectiveObject(type1, type2)).toMatchSnapshot();
  });

  test("Error on property overlap", () => {
    const type1: ObjectType = {
      type: "object",
      properties: {
        foo: {
          required: true,
          node: {
            type: "string",
          },
        },
      },
      additionalProperties: false,
    };

    const type2: ObjectType = {
      type: "object",
      properties: {
        foo: {
          required: true,
          node: {
            type: "number",
          },
        },
      },
      additionalProperties: {
        type: "unknown",
      },
    };

    expect(() =>
      computeEffectiveObject(type1, type2, true),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Can't compute effective type for object literal and object literal because of conflicting properties foo]`,
    );
  });

  test("Merges equal additionalProperties", () => {
    const type1: ObjectType = {
      type: "object",
      properties: {
        foo: {
          required: true,
          node: {
            type: "string",
          },
        },
      },
      additionalProperties: {
        type: "unknown",
      },
    };

    const type2: ObjectType = {
      type: "object",
      properties: {
        bar: {
          required: true,
          node: {
            type: "number",
          },
        },
      },
      additionalProperties: {
        type: "unknown",
      },
    };

    expect(computeEffectiveObject(type1, type2)).toMatchSnapshot();
  });
});

describe("makePropertyMap tests", () => {
  test("basic test", () => {
    const jsonObject = {
      key1: "value",
      key2: true,
      key3: 1,
    };

    const treeObject = parseTree(JSON.stringify(jsonObject));

    const propertyMap = makePropertyMap(treeObject);

    expect(propertyMap.get("key1")?.value).toStrictEqual("value");
    expect(propertyMap.get("key2")?.value).toStrictEqual(true);
    expect(propertyMap.get("key3")?.value).toStrictEqual(1);
  });

  test("escaped key", () => {
    const jsonObject = {
      "some-key": "value",
      // eslint-disable-next-line prettier/prettier
      'some-otherkey': "value",
    };

    const treeObject = parseTree(JSON.stringify(jsonObject));

    const propertyMap = makePropertyMap(treeObject);

    expect(propertyMap.get("'some-key'")?.value).toStrictEqual("value");
    expect(propertyMap.get("'some-otherkey'")?.value).toStrictEqual("value");
  });
});
