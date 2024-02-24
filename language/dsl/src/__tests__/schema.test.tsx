import { test, expect, describe, vi } from "vitest";
import React from "react";
import { render } from "react-json-reconciler";
import {
  makeBindingsForObject,
  SchemaGenerator,
  SchemaTypeName,
} from "../compiler/schema";
import { FooTypeRef, BarTypeRef, LocalBazType } from "./helpers/mock-data-refs";

describe("Schema Bindings Generate Properly", () => {
  const testObj = {
    main: {
      sub: {
        a: FooTypeRef,
        b: BarTypeRef,
      },
      sub2: [
        {
          [SchemaTypeName]: "sub2a",
          val: LocalBazType,
        },
      ],
      sub4: {
        [SchemaTypeName]: "sub3",
        c: FooTypeRef,
      },
    },
  };

  test("is able to get bindings for all paths", () => {
    const schema = makeBindingsForObject(testObj);
    expect(schema.main.toRefString()).toStrictEqual("{{main}}");
    expect(schema.main.sub.toRefString()).toStrictEqual("{{main.sub}}");
    expect(schema.main.sub.a.toRefString()).toStrictEqual("{{main.sub.a}}");
    expect(schema.main.sub.b.toRefString()).toStrictEqual("{{main.sub.b}}");
    expect(schema.main.sub2.toRefString()).toStrictEqual("{{main.sub2}}");
    expect(schema.main.sub2[0].toRefString()).toStrictEqual("{{main.sub2.0}}");
    expect(schema.main.sub2._index_.toRefString()).toStrictEqual(
      "{{main.sub2._index_}}"
    );

    expect(schema.main.sub2[0].val.toRefString()).toStrictEqual(
      "{{main.sub2.0.val}}"
    );
    expect(
      // eslint-disable-next-line dot-notation
      schema.main.sub2["_index_"].toRefString()
    ).toStrictEqual("{{main.sub2._index_}}");
    expect(
      // eslint-disable-next-line dot-notation
      schema.main.sub2["_index_"].val.toRefString()
    ).toStrictEqual("{{main.sub2._index_.val}}");
  });

  test("is able to serialize to a schema object", () => {
    const g = new SchemaGenerator();
    const schema = g.toSchema(testObj);
    expect(schema).toMatchInlineSnapshot(`
      {
        "ROOT": {
          "main": {
            "type": "mainType",
          },
        },
        "mainType": {
          "sub": {
            "type": "subType",
          },
          "sub2": {
            "isArray": true,
            "type": "sub2aType",
          },
          "sub4": {
            "type": "sub3Type",
          },
        },
        "sub2aType": {
          "val": {
            "default": false,
            "type": "BazType",
            "validation": [
              {
                "message": "some message",
                "options": [
                  "1",
                  "2",
                ],
                "type": "someValidation",
              },
            ],
          },
        },
        "sub3Type": {
          "c": {
            "type": "FooType",
          },
        },
        "subType": {
          "a": {
            "type": "FooType",
          },
          "b": {
            "type": "BarType",
          },
        },
      }
    `);
  });

  test("is able to serialize to a schema object with a custom array indicator", () => {
    const g = new SchemaGenerator();
    const schema = g.toSchema(testObj);
    expect(schema).toMatchInlineSnapshot(`
      {
        "ROOT": {
          "main": {
            "type": "mainType",
          },
        },
        "mainType": {
          "sub": {
            "type": "subType",
          },
          "sub2": {
            "isArray": true,
            "type": "sub2aType",
          },
          "sub4": {
            "type": "sub3Type",
          },
        },
        "sub2aType": {
          "val": {
            "default": false,
            "type": "BazType",
            "validation": [
              {
                "message": "some message",
                "options": [
                  "1",
                  "2",
                ],
                "type": "someValidation",
              },
            ],
          },
        },
        "sub3Type": {
          "c": {
            "type": "FooType",
          },
        },
        "subType": {
          "a": {
            "type": "FooType",
          },
          "b": {
            "type": "BarType",
          },
        },
      }
    `);
  });

  test("logs warning if two types have the same name but are different", () => {
    const mockLogger = {
      error: vi.fn(),
      warn: vi.fn(),
      log: vi.fn(),
    };

    const g = new SchemaGenerator(mockLogger);

    const badObj = {
      main: {
        sub: {
          a: FooTypeRef,
          b: BarTypeRef,
          c: BarTypeRef,
        },
        sub2: {
          sub: {
            a: FooTypeRef,
            b: BarTypeRef,
          },
        },
      },
    };

    const results = g.toSchema(badObj);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      "WARNING: Generated two intermediate types with the name: subType that are of different shapes, using artificial type subType2"
    );
    expect(results).toMatchInlineSnapshot(`
    {
      "ROOT": {
        "main": {
          "type": "mainType",
        },
      },
      "mainType": {
        "sub": {
          "type": "subType",
        },
        "sub2": {
          "type": "sub2Type",
        },
      },
      "sub2Type": {
        "sub": {
          "type": "subType2",
        },
      },
      "subType": {
        "a": {
          "type": "FooType",
        },
        "b": {
          "type": "BarType",
        },
        "c": {
          "type": "BarType",
        },
      },
      "subType2": {
        "a": {
          "type": "FooType",
        },
        "b": {
          "type": "BarType",
        },
      },
    }
  `);
  });

  test("doesnt throw errors if two types have the same name and are the same", () => {
    const g = new SchemaGenerator();

    const badObj = {
      main: {
        sub: {
          a: FooTypeRef,
          b: BarTypeRef,
        },
        sub2: {
          sub: {
            a: FooTypeRef,
            b: BarTypeRef,
          },
        },
      },
    };

    expect(g.toSchema(badObj)).toMatchInlineSnapshot(`
      {
        "ROOT": {
          "main": {
            "type": "mainType",
          },
        },
        "mainType": {
          "sub": {
            "type": "subType",
          },
          "sub2": {
            "type": "sub2Type",
          },
        },
        "sub2Type": {
          "sub": {
            "type": "subType",
          },
        },
        "subType": {
          "a": {
            "type": "FooType",
          },
          "b": {
            "type": "BarType",
          },
        },
      }
    `);
  });

  test("works when used as a jsx element", async () => {
    const schema = makeBindingsForObject(testObj);

    const content = await render(
      <obj>
        <property name="test">{schema.main.sub.a}</property>
      </obj>
    );

    expect(content.jsonValue).toMatchInlineSnapshot(`
      {
        "test": "{{main.sub.a}}",
      }
    `);
  });

  test("primitive arrays are not treated as bindings nor further proxied", () => {
    const schema = makeBindingsForObject({
      main: {
        sub: {
          a: FooTypeRef,
          b: BarTypeRef,
          c: {
            type: "enumtype",
            enum: ["A", "B", "C"],
          },
        },
        sub2: [
          {
            val: LocalBazType,
          },
        ],
        sub4: {
          [SchemaTypeName]: "sub3",
          c: FooTypeRef,
        },
      },
    });

    expect(schema.main.toRefString()).toStrictEqual("{{main}}");
    expect(schema.main.sub.toRefString()).toStrictEqual("{{main.sub}}");
    expect(schema.main.sub.a.toRefString()).toStrictEqual("{{main.sub.a}}");
    expect(schema.main.sub.c.toRefString()).toStrictEqual("{{main.sub.c}}");
    expect(schema.main.sub.c.enum).toStrictEqual(["A", "B", "C"]);
    // make sure iterable method is still there and works
    expect(
      schema.main.sub.c.enum.every((it: any) => typeof it === "string")
    ).toStrictEqual(true);
  });
});

describe("schema plugins", () => {
  const MetaData = Symbol("Meta Data");
  const testObj = {
    foo: {
      [MetaData]: {
        testProp: false,
      },
    },
  };

  test("enables node modification", () => {
    const schemaGenerator = new SchemaGenerator();

    schemaGenerator.hooks.createSchemaNode.tap("test", (node, prop) => {
      if (prop[MetaData]) {
        return {
          ...node,
          metaData: prop[MetaData],
        };
      }

      return node;
    });

    expect(schemaGenerator.toSchema(testObj)).toMatchInlineSnapshot(`
      {
        "ROOT": {
          "foo": {
            "metaData": {
              "testProp": false,
            },
            "type": "fooType",
          },
        },
        "fooType": {},
      }
    `);
  });
});
