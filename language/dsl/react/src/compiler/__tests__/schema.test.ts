import { test, expect } from "vitest";
import { SchemaGenerator } from "../schema";

const BasicDataType = {
  type: "StringType",
};

test("generates proper schema", () => {
  const schemaGenerator = new SchemaGenerator();

  expect(
    schemaGenerator.toSchema({
      foo: {
        bar: {
          baz: BasicDataType,
        },
      },
      other: [
        {
          item1: BasicDataType,
        },
      ],
    }),
  ).toStrictEqual({
    ROOT: {
      foo: {
        type: "fooType",
      },
      other: {
        type: "otherType",
        isArray: true,
      },
    },
    fooType: {
      bar: {
        type: "barType",
      },
    },
    barType: {
      baz: {
        type: "StringType",
      },
    },
    otherType: {
      item1: {
        type: "StringType",
      },
    },
  });
});

test("Edge Case - two artificial array nodes", () => {
  const schemaGenerator = new SchemaGenerator();

  expect(
    schemaGenerator.toSchema({
      foo: {
        bar: [
          {
            baa: BasicDataType,
          },
        ],
      },
      other: {
        bar: [
          {
            bab: BasicDataType,
          },
        ],
      },
      another: {
        bar: [
          {
            bac: BasicDataType,
          },
        ],
      },
    }),
  ).toMatchInlineSnapshot(`
    {
      "ROOT": {
        "another": {
          "type": "anotherType",
        },
        "foo": {
          "type": "fooType",
        },
        "other": {
          "type": "otherType",
        },
      },
      "anotherType": {
        "bar": {
          "isArray": true,
          "type": "barType",
        },
      },
      "barType": {
        "bac": {
          "type": "StringType",
        },
      },
      "barType2": {
        "bab": {
          "type": "StringType",
        },
      },
      "barType3": {
        "baa": {
          "type": "StringType",
        },
      },
      "fooType": {
        "bar": {
          "isArray": true,
          "type": "barType3",
        },
      },
      "otherType": {
        "bar": {
          "isArray": true,
          "type": "barType2",
        },
      },
    }
  `);
});
