import { test, expect, describe, beforeEach } from "vitest";
import { CommonTypes, Types } from "@player-tools/static-xlrs";
import { PlayerLanguageService } from "../..";
import { toTextDocument } from "../../utils";

describe("SchemaValidationPlugin", () => {
  let service: PlayerLanguageService;

  beforeEach(async () => {
    service = new PlayerLanguageService();
    await service.setAssetTypesFromModule([Types, CommonTypes]);
  });

  describe("schema structure validation", () => {
    test("reports error when schema is missing ROOT", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              SomeType: {
                foo: { type: "SomeType" },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - missing: Property "ROOT" missing from type "Schema.Schema"",
            "range": {
              "end": {
                "character": 3,
                "line": 12,
              },
              "start": {
                "character": 12,
                "line": 6,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Schema must have a "ROOT" key.",
            "range": {
              "end": {
                "character": 3,
                "line": 12,
              },
              "start": {
                "character": 12,
                "line": 6,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when DataType is missing type property", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                application: {
                  validation: [],
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 10,
              },
              "start": {
                "character": 21,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Schema.DataType must have a "type" property (reference to schema or XLR type).",
            "range": {
              "end": {
                "character": 7,
                "line": 10,
              },
              "start": {
                "character": 21,
                "line": 8,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when type is not a string", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                application: {
                  type: 123,
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 10,
              },
              "start": {
                "character": 21,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Schema "type" must be a string (schema type name or XLR type name).",
            "range": {
              "end": {
                "character": 19,
                "line": 9,
              },
              "start": {
                "character": 16,
                "line": 9,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when isArray is not a boolean", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                items: {
                  type: "StringType",
                  isArray: "yes",
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Schema.DataType "isArray" must be a boolean.",
            "range": {
              "end": {
                "character": 24,
                "line": 10,
              },
              "start": {
                "character": 19,
                "line": 10,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when validation is not an array", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "TypeA",
                  validation: "not-an-array",
                },
              },
              TypeA: {
                nested: { type: "StringType" },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 11,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when format is not an object", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "TypeA",
                  format: "not-an-object",
                },
              },
              TypeA: {
                nested: { type: "StringType" },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 11,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when isRecord is not a boolean", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  isRecord: "yes",
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Schema.DataType "isRecord" must be a boolean.",
            "range": {
              "end": {
                "character": 25,
                "line": 10,
              },
              "start": {
                "character": 20,
                "line": 10,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when both isArray and isRecord are true", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  isArray: true,
                  isRecord: true,
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Schema.DataType cannot have both "isArray" and "isRecord" true.",
            "range": {
              "end": {
                "character": 7,
                "line": 12,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });
  });

  describe("schema type reference validation", () => {
    test("reports error for unknown type reference (not in schema, not in XLR)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                foo: {
                  type: "NonExistentXLRType",
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Unknown schema type "NonExistentXLRType". Type must be a schema type (key in this schema) or an XLR type loaded in the SDK.",
            "range": {
              "end": {
                "character": 36,
                "line": 9,
              },
              "start": {
                "character": 16,
                "line": 9,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("accepts type reference to XLR-loaded type when that type is in the SDK", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                name: { type: "StringType" },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`[]`);
    });

    test("reports errors for multiple unknown type references", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                a: { type: "UnknownA" },
                b: { type: "UnknownB" },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Unknown schema type "UnknownA". Type must be a schema type (key in this schema) or an XLR type loaded in the SDK.",
            "range": {
              "end": {
                "character": 26,
                "line": 9,
              },
              "start": {
                "character": 16,
                "line": 9,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Unknown schema type "UnknownB". Type must be a schema type (key in this schema) or an XLR type loaded in the SDK.",
            "range": {
              "end": {
                "character": 26,
                "line": 12,
              },
              "start": {
                "character": 16,
                "line": 12,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports no Schema DataType errors when DataType conforms to XLR (StringType)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                name: {
                  type: "StringType",
                  default: "",
                  validation: [],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`[]`);
    });

    test("reports Schema DataType error when BooleanType payload has wrong type for property", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                flag: {
                  type: "BooleanType",
                  default: "not-a-boolean",
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Default value doesn't match the expected type of boolean for type BooleanType",
            "range": {
              "end": {
                "character": 34,
                "line": 10,
              },
              "start": {
                "character": 19,
                "line": 10,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    describe("default property validation (CollectionType / Or type)", () => {
      test("accepts CollectionType with valid default (number)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  items: {
                    type: "CollectionType",
                    default: 0,
                    validation: [{ type: "collection" }],
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(0);
      });

      test("accepts CollectionType with valid default (string)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  items: {
                    type: "CollectionType",
                    default: "",
                    validation: [{ type: "collection" }],
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(0);
      });

      test("reports error when CollectionType default is boolean (not in Or type)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  items: {
                    type: "CollectionType",
                    default: true,
                    validation: [{ type: "collection" }],
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(1);
        expect(schemaErrors[0].message).toBe(
          "Schema Validation Error: Default value doesn't match any of the expected types number, string for type CollectionType",
        );
      });

      test("reports error when CollectionType default is array (not in Or type)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  items: {
                    type: "CollectionType",
                    default: [],
                    validation: [{ type: "collection" }],
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(1);
        expect(schemaErrors[0].message).toBe(
          "Schema Validation Error: Default value doesn't match any of the expected types number, string for type CollectionType",
        );
      });

      test("reports error when CollectionType default is object (not in Or type)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  items: {
                    type: "CollectionType",
                    default: {},
                    validation: [{ type: "collection" }],
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(1);
        expect(schemaErrors[0].message).toBe(
          "Schema Validation Error: Default value doesn't match any of the expected types number, string for type CollectionType",
        );
      });
    });
  });

  describe("flow without schema", () => {
    test("does not add schema errors when schema is absent", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`[]`);
    });
  });

  describe("validation object logic branches", () => {
    test('reports error when validation entry is missing "type" property', async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  validation: [{}],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 16,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Validation object missing "type" property",
            "range": {
              "end": {
                "character": 12,
                "line": 11,
              },
              "start": {
                "character": 10,
                "line": 11,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when validation type is not a string", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  validation: [{ type: 123 }],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 18,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Validation type must be a string",
            "range": {
              "end": {
                "character": 23,
                "line": 12,
              },
              "start": {
                "character": 20,
                "line": 12,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when validation type is not a registered validator", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  validation: [{ type: "NonExistentValidator" }],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Validation Function [object Object] is not a registered validator",
            "range": {
              "end": {
                "character": 11,
                "line": 13,
              },
              "start": {
                "character": 10,
                "line": 11,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when registered validator has invalid props (min expects number)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                score: {
                  type: "IntegerType",
                  validation: [{ type: "min", value: "not-a-number" }],
                  format: { type: "integer" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Expected type "number" but got "string"",
            "range": {
              "end": {
                "character": 11,
                "line": 14,
              },
              "start": {
                "character": 10,
                "line": 11,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when validation array element is not an object", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  validation: ["not-an-object"],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 16,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Schema.DataType "validation" must be an object.",
            "range": {
              "end": {
                "character": 9,
                "line": 12,
              },
              "start": {
                "character": 22,
                "line": 10,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });
  });

  describe("format object logic branches", () => {
    test('reports error when format object is missing "type" property', async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  validation: [],
                  format: {},
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 12,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Format object missing "type" property",
            "range": {
              "end": {
                "character": 20,
                "line": 11,
              },
              "start": {
                "character": 18,
                "line": 11,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when format type is not a string", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  validation: [],
                  format: { type: 42 },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 7,
                "line": 14,
              },
              "start": {
                "character": 15,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Format type must be a string",
            "range": {
              "end": {
                "character": 20,
                "line": 12,
              },
              "start": {
                "character": 18,
                "line": 12,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when format type is not a registered formatter", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                field: {
                  type: "StringType",
                  validation: [],
                  format: { type: "NonExistentFormatter" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Formatter [object Object] is not a registered formatter",
            "range": {
              "end": {
                "character": 9,
                "line": 13,
              },
              "start": {
                "character": 18,
                "line": 11,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when formatter with 3 args has invalid props (date mask must be string)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                birthDate: {
                  type: "DateType",
                  validation: [],
                  format: { type: "date", mask: 123 },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Expected type "string" but got "number"",
            "range": {
              "end": {
                "character": 9,
                "line": 14,
              },
              "start": {
                "character": 18,
                "line": 11,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("accepts formatter with 3 args and valid props (date with mask string)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                birthDate: {
                  type: "DateType",
                  validation: [],
                  format: { type: "date", mask: "MM/DD/YYYY" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });
  });

  describe("schema and flow structure branches", () => {
    test("reports error when flow schema is not an object (string)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: "not-an-object",
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - type: Expected an object but got an "string"",
            "range": {
              "end": {
                "character": 27,
                "line": 6,
              },
              "start": {
                "character": 12,
                "line": 6,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Flow "schema" must be an object with at least a "ROOT" key.",
            "range": {
              "end": {
                "character": 27,
                "line": 6,
              },
              "start": {
                "character": 12,
                "line": 6,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when flow schema is not an object (array)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: [],
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - type: Expected an object but got an "array"",
            "range": {
              "end": {
                "character": 14,
                "line": 6,
              },
              "start": {
                "character": 12,
                "line": 6,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Flow "schema" must be an object with at least a "ROOT" key.",
            "range": {
              "end": {
                "character": 14,
                "line": 6,
              },
              "start": {
                "character": 12,
                "line": 6,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when schema node (ROOT) value is not an object", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: "not-an-object",
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - type: Expected an object but got an "string"",
            "range": {
              "end": {
                "character": 27,
                "line": 7,
              },
              "start": {
                "character": 12,
                "line": 7,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Schema node "ROOT" must be an object.",
            "range": {
              "end": {
                "character": 27,
                "line": 7,
              },
              "start": {
                "character": 12,
                "line": 7,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });

    test("reports error when schema property value is not an object (DataType)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                application: "must-be-DataType-object",
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Content Validation Error - value: Does not match any of the expected types for type: 'DataTypes'",
            "range": {
              "end": {
                "character": 46,
                "line": 8,
              },
              "start": {
                "character": 21,
                "line": 8,
              },
            },
            "severity": 1,
          },
          {
            "message": "Schema Validation Error: Schema property "application" must be an object (Schema.DataType) with a "type" field.",
            "range": {
              "end": {
                "character": 46,
                "line": 8,
              },
              "start": {
                "character": 21,
                "line": 8,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });
  });

  describe("specific DataTypes from CommonTypes", () => {
    test("accepts IntegerType with valid validation and format", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                count: {
                  type: "IntegerType",
                  validation: [{ type: "integer" }],
                  format: { type: "integer" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });

    test("accepts BooleanType with valid default and validation", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                flag: {
                  type: "BooleanType",
                  default: false,
                  validation: [
                    {
                      type: "oneOf",
                      message: "Value must be true or false",
                      options: [true, false],
                    },
                  ],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });

    test("accepts DateType with valid format", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                start: {
                  type: "DateType",
                  validation: [],
                  format: { type: "date" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });

    test("accepts formatter with 2 generic args (integer) without prop validation", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                num: {
                  type: "IntegerType",
                  validation: [],
                  format: { type: "integer" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });
  });

  describe("specific Validators from CommonTypes", () => {
    test("accepts required validator with no props", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                name: {
                  type: "StringType",
                  validation: [{ type: "required" }],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });

    test("accepts string validator (no props)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                name: {
                  type: "StringType",
                  validation: [{ type: "string" }],
                  format: { type: "string" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });

    test("accepts min validator with valid number prop", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                score: {
                  type: "IntegerType",
                  validation: [{ type: "min", value: 0 }],
                  format: { type: "integer" },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });

    describe("length validator (OrType / union params)", () => {
      test("accepts length validator with min/max variant (valid props)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  title: {
                    type: "StringType",
                    validation: [{ type: "length", min: 1, max: 100 }],
                    format: { type: "string" },
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(0);
      });

      test("accepts length validator with min only (first Or variant)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  title: {
                    type: "StringType",
                    validation: [{ type: "length", min: 0 }],
                    format: { type: "string" },
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(0);
      });

      test("accepts length validator with max only (first Or variant)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  code: {
                    type: "StringType",
                    validation: [{ type: "length", max: 10 }],
                    format: { type: "string" },
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(0);
      });

      test("accepts length validator with exact variant (second Or variant)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  pin: {
                    type: "StringType",
                    validation: [{ type: "length", exact: 6 }],
                    format: { type: "string" },
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(0);
      });

      test("reports error when length validator has invalid prop type (min must be number)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  title: {
                    type: "StringType",
                    validation: [{ type: "length", min: "five" }],
                    format: { type: "string" },
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors.length).toBeGreaterThan(0);
        expect(
          schemaErrors.some(
            (d) =>
              d.message.includes("Expected type") ||
              d.message.includes("invalid function parameters"),
          ),
        ).toBe(true);
      });

      test("reports error when length validator has invalid function parameters (no Or variant matches)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  title: {
                    type: "StringType",
                    validation: [
                      { type: "length", min: "not-a-number", max: "also-not" },
                    ],
                    format: { type: "string" },
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors.length).toBeGreaterThan(0);
        expect(
          schemaErrors.some(
            (d) =>
              d.message.includes("invalid function parameters") ||
              d.message.includes("Expected type"),
          ),
        ).toBe(true);
      });

      test("reports error when length validator matches multiple Or variants (ambiguous params)", async () => {
        const document = toTextDocument(
          JSON.stringify(
            {
              id: "foo",
              views: [],
              navigation: { BEGIN: "FLOW1" },
              schema: {
                ROOT: {
                  field: {
                    type: "StringType",
                    validation: [{ type: "length", min: 1, exact: 5 }],
                    format: { type: "string" },
                  },
                },
              },
            },
            null,
            2,
          ),
        );
        const diagnostics = await service.validateTextDocument(document);
        const schemaErrors = (diagnostics ?? []).filter((d) =>
          d.message.includes("Schema Validation Error:"),
        );
        expect(schemaErrors).toHaveLength(1);
        expect(schemaErrors[0].message).toContain(
          "Validation function invalid function parameters for type length",
        );
      });
    });
  });

  describe("specific Formatters from CommonTypes", () => {
    test("accepts currency formatter with valid optional props", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                price: {
                  type: "StringType",
                  validation: [],
                  format: {
                    type: "currency",
                    currencySymbol: "$",
                    precision: 2,
                    useParensForNeg: false,
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      const schemaErrors = (diagnostics ?? []).filter((d) =>
        d.message.includes("Schema Validation Error:"),
      );
      expect(schemaErrors).toHaveLength(0);
    });

    test("reports error when currency formatter has invalid prop type (precision must be number)", async () => {
      const document = toTextDocument(
        JSON.stringify(
          {
            id: "foo",
            views: [],
            navigation: { BEGIN: "FLOW1" },
            schema: {
              ROOT: {
                price: {
                  type: "StringType",
                  validation: [],
                  format: {
                    type: "currency",
                    precision: "two",
                  },
                },
              },
            },
          },
          null,
          2,
        ),
      );
      const diagnostics = await service.validateTextDocument(document);
      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "message": "Schema Validation Error: Expected type "number" but got "string"",
            "range": {
              "end": {
                "character": 9,
                "line": 14,
              },
              "start": {
                "character": 18,
                "line": 11,
              },
            },
            "severity": 1,
          },
        ]
      `);
    });
  });
});
