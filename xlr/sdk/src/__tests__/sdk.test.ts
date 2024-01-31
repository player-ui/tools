import { test, expect, describe } from "vitest";
import type { NamedType, TransformFunction } from "@player-tools/xlr";
import { parseTree } from "jsonc-parser";
import {
  Types,
  ReferenceAssetsWebPluginManifest,
} from "@player-tools/static-xlrs";
import type { Filters } from "../registry";
import { XLRSDK } from "../sdk";

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
      EXCLUDE
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
  test("Processed", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    expect(sdk.getType("InputAsset")).toMatchSnapshot();
  });

  test("Raw", () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromModule(Types);
    sdk.loadDefinitionsFromModule(ReferenceAssetsWebPluginManifest);

    expect(sdk.getType("InputAsset", { getRawType: true })).toMatchSnapshot();
  });
});

describe("Basic Validation", () => {
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

  test("Basic Validation By Type", () => {
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
      sdk.validateByType(inputAsset as NamedType, mockAsset)
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
      [transformFunction]
    );
    expect(results[0][0]).toBe("out.d.ts");
    expect(results[0][1]).toMatchSnapshot();
  });
});
