import { test, expect, describe } from "vitest";
import type { NamedType, TransformFunction, OrType } from "@player-tools/xlr";
import { parseTree } from "jsonc-parser";
import {
  Types,
  ReferenceAssetsWebPluginManifest,
} from "@player-tools/static-xlrs";
import type { Filters } from "../registry";
import { XLRSDK } from "../sdk";
import { XLRValidator } from "../validator";
import { ValidationMessage } from "../types";

const EXCLUDE: Filters = { typeFilter: "Transformed" };

describe("Loading XLRs", () => {
  test("Loading from Disk", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    expect(sdk.hasType("Asset")).toStrictEqual(true);
    expect(sdk.hasType("AssetWrapper")).toStrictEqual(true);
    expect(sdk.hasType("Binding")).toStrictEqual(true);
    expect(sdk.hasType("BindingRef")).toStrictEqual(true);
    expect(sdk.hasType("ExpressionRef")).toStrictEqual(true);
    expect(sdk.hasType("ActionAsset")).toStrictEqual(true);
    expect(sdk.hasType("InputAsset")).toStrictEqual(true);
    expect(sdk.hasType("TransformedAction")).toStrictEqual(false);
    expect(sdk.hasType("TransformedInput")).toStrictEqual(false);
  });

  test("Loading from Module", async () => {
    const sdk = new XLRSDK();
    await sdk.loadDefinitionsFromModule(
      ReferenceAssetsWebPluginManifest,
      EXCLUDE,
    );
    await sdk.loadDefinitionsFromModule(Types);

    expect(sdk.hasType("Asset")).toStrictEqual(true);
    expect(sdk.hasType("AssetWrapper")).toStrictEqual(true);
    expect(sdk.hasType("Binding")).toStrictEqual(true);
    expect(sdk.hasType("BindingRef")).toStrictEqual(true);
    expect(sdk.hasType("ExpressionRef")).toStrictEqual(true);
    expect(sdk.hasType("ActionAsset")).toStrictEqual(true);
    expect(sdk.hasType("InputAsset")).toStrictEqual(true);
    expect(sdk.hasType("TransformedAction")).toStrictEqual(false);
    expect(sdk.hasType("TransformedInput")).toStrictEqual(false);
  });
});

describe("Object Recall", () => {
  test("Raw", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    expect(sdk.getType("InputAsset", { getRawType: true })).toMatchSnapshot();
  });

  test("Processed", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    expect(sdk.getType("InputAsset", { optimize: false })).toMatchSnapshot();
  });

  test("Optimized", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    expect(sdk.getType("InputAsset")).toMatchSnapshot();
  });
});

describe("Validation", () => {
  test("Basic Validation By Name", () => {
    const mockAsset = parseTree(`
    {
      "id": 1,
      "type": "input",
      "binding": "some.data",
      "label": {
        "asset": {
          "value": "{{input.label}}"
        }
      }
    `);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    expect(sdk.validateByName("InputAsset", mockAsset)).toMatchSnapshot();
  });

  test("Basic Validation By Type (unoptimized)", () => {
    const mockAsset = parseTree(`
    {
      "id": 1,
      "type": "input",
      "binding": "some.data",
      "label": {
        "asset": {
          "value": "{{input.label}}"
        }
      }
    `);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    const inputAsset = sdk.getType("InputAsset", { optimize: false });
    expect(inputAsset).toBeDefined();
    expect(
      sdk.validateByType(inputAsset as NamedType, mockAsset),
    ).toMatchSnapshot();
  });

  test("Basic Validation By Type (optimized)", () => {
    const mockAsset = parseTree(`
    {
      "id": 1,
      "type": "input",
      "binding": "some.data",
      "label": {
        "asset": {
          "value": "{{input.label}}"
        }
      }
    `);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    const inputAsset = sdk.getType("InputAsset");
    expect(inputAsset).toBeDefined();
    expect(
      sdk.validateByType(inputAsset as NamedType, mockAsset),
    ).toMatchSnapshot();
  });
});

describe("Export Test", () => {
  test("Exports Typescript types", () => {
    const importMap = new Map([
      [
        "@player-ui/types",
        ["Expression", "Asset", "Binding", "AssetWrapper", "Schema.DataType"],
      ],
    ]);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);
    const results = sdk.exportRegistry("TypeScript", importMap);
    expect(results[0][0]).toBe("out.d.ts");
    expect(results[0][1]).toMatchSnapshot();
  });

  test("Exports Typescript Types With Filters", () => {
    const importMap = new Map([
      [
        "@player-ui/types",
        ["Expression", "Asset", "Binding", "AssetWrapper", "Schema.DataType"],
      ],
    ]);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);
    const results = sdk.exportRegistry("TypeScript", importMap, {
      typeFilter: "Transformed",
      pluginFilter: "Types",
    });
    expect(results[0][0]).toBe("out.d.ts");
    expect(results[0][1]).toMatchSnapshot();
  });

  test("Exports Typescript Types With Transforms", () => {
    const importMap = new Map([
      [
        "@player-ui/types",
        ["Expression", "Asset", "Binding", "AssetWrapper", "Schema.DataType"],
      ],
    ]);

    /**
     *
     */
    const transformFunction: TransformFunction = (input, capability) => {
      if (capability === "Assets") {
        const ret = { ...input };
        if (ret.type === "object") {
          ret.properties.transformed = {
            required: false,
            node: { type: "boolean", const: true },
          };
        }

        return ret;
      }

      return input;
    };

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);
    const results = sdk.exportRegistry(
      "TypeScript",
      importMap,
      {
        pluginFilter: "Types",
      },
      [transformFunction],
    );
    expect(results[0][0]).toBe("out.d.ts");
    expect(results[0][1]).toMatchSnapshot();
  });
});

describe("Or Type Validation", () => {
  test("Outputs helpful type error messages", () => {
    const mockAsset = parseTree(`
    {
      "type": "string",
      "value": "orange"
    }`);

    const orType: OrType = {
      type: "or",
      or: [
        { type: "string", const: "apple" },
        { type: "string", const: "banana" },
        { type: "string", const: "carrot" },
        { type: "string", const: "deli-meat" },
      ],
    };

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    const validator = new XLRValidator(sdk.getType);
    let validationResult: ValidationMessage[];

    if (mockAsset.children && mockAsset.children.length > 0) {
      validationResult = validator.validateType(mockAsset.children[0], orType);
    } else {
      validationResult = [];
    }

    // Expected error and info messages
    expect(validationResult).toHaveLength(2);
    expect(validationResult[0].message).toBe(
      "Does not match any of the types: string | string | string | string",
    );
    expect(validationResult[1].message).toBe(
      "Expected: apple | banana | carrot | deli-meat",
    );
  });
});

describe("generateNestedTypesInfo Test", () => {
  test("Test with potentialTypeErrors", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);
    const validator = new XLRValidator(sdk.getType);

    const potentialTypeErrors = [
      {
        type: { type: "string" },
        errors: [
          {
            type: "type",
            node: {} as any,
            message: "Expected string",
            severity: 1,
            expected: "string",
          },
        ],
      },
    ];

    const xlrNode = {
      type: "or",
      or: [{ type: "string" }, { type: "number" }],
    } as OrType;

    const rootNode = {
      type: "boolean",
      value: true,
    } as any;

    const result = (validator as any).generateNestedTypesInfo(
      potentialTypeErrors,
      xlrNode,
      rootNode,
    );

    expect(result.nestedTypesList).toBe("string");
    expect(result.infoMessage).toBe("Got: true and expected: string");
  });

  test("Works with urlMapping", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);
    const validator = new XLRValidator(sdk.getType, {
      urlMapping: {
        MyType: "https://example.com/mytype",
      },
    });

    const potentialTypeErrors: any[] = [];

    const xlrNode = {
      type: "or",
      name: "MyType",
      or: [{ type: "string" }, { type: "number" }],
    } as OrType;

    const rootNode = {
      type: "boolean",
      value: true,
    } as any;

    const result = (validator as any).generateNestedTypesInfo(
      potentialTypeErrors,
      xlrNode,
      rootNode,
    );

    expect(result.nestedTypesList).toBe("https://example.com/mytype");
    expect(result.infoMessage).toBe(
      "Got: true and expected: https://example.com/mytype",
    );
  });

  test("Without rootNode value", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);
    const validator = new XLRValidator(sdk.getType);

    const potentialTypeErrors: any[] = [];

    const xlrNode = {
      type: "or",
      or: [{ type: "string" }, { type: "number" }],
    } as OrType;

    const rootNode = {
      type: "boolean",
    } as any;

    const result = (validator as any).generateNestedTypesInfo(
      potentialTypeErrors,
      xlrNode,
      rootNode,
    );

    expect(result.nestedTypesList).toBe("string | number");
    expect(result.infoMessage).toBe("Expected: string | number");
  });
});
