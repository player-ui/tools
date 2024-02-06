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
    })
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

test('Edge Case - two artificial array nodes', () => {
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
    })
  ).toMatchInlineSnapshot(`
    Object {
      "ROOT": Object {
        "another": Object {
          "type": "anotherType",
        },
        "foo": Object {
          "type": "fooType",
        },
        "other": Object {
          "type": "otherType",
        },
      },
      "anotherType": Object {
        "bar": Object {
          "isArray": true,
          "type": "barType",
        },
      },
      "barType": Object {
        "bac": Object {
          "type": "StringType",
        },
      },
      "barType2": Object {
        "bab": Object {
          "type": "StringType",
        },
      },
      "barType3": Object {
        "baa": Object {
          "type": "StringType",
        },
      },
      "fooType": Object {
        "bar": Object {
          "isArray": true,
          "type": "barType3",
        },
      },
      "otherType": Object {
        "bar": Object {
          "isArray": true,
          "type": "barType2",
        },
      },
    }
  `);
});
