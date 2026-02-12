import { describe, test, expect } from "vitest";
import type { ObjectType } from "@player-tools/xlr";
import {
  extractBaseName,
  parseNamespacedType,
  findAssetWrapperPaths,
  extendsAssetWrapper,
  type TypeRegistry,
} from "../utils";

describe("extractBaseName", () => {
  test("returns type name when no generics present", () => {
    expect(extractBaseName("MyType")).toBe("MyType");
    expect(extractBaseName("Asset")).toBe("Asset");
    expect(extractBaseName("SingleBar")).toBe("SingleBar");
  });

  test("extracts base name from simple generic", () => {
    expect(extractBaseName("MyType<T>")).toBe("MyType");
    expect(extractBaseName("Asset<string>")).toBe("Asset");
    expect(extractBaseName("Array<number>")).toBe("Array");
  });

  test("extracts base name from nested generics", () => {
    expect(extractBaseName("Map<string, Array<T>>")).toBe("Map");
    expect(extractBaseName("Promise<Array<Map<K, V>>>")).toBe("Promise");
    expect(extractBaseName("Wrapper<Nested<Inner<T>>>")).toBe("Wrapper");
  });

  test("handles multiple generic parameters", () => {
    expect(extractBaseName("Map<K, V>")).toBe("Map");
    expect(extractBaseName("Record<string, number>")).toBe("Record");
    expect(extractBaseName("Tuple<A, B, C>")).toBe("Tuple");
  });

  test("handles generic constraints in type arguments", () => {
    expect(extractBaseName("ListItem<AnyAsset extends Asset>")).toBe(
      "ListItem",
    );
    expect(extractBaseName("Container<T extends Base = Default>")).toBe(
      "Container",
    );
  });

  test("handles empty string", () => {
    expect(extractBaseName("")).toBe("");
  });
});

describe("parseNamespacedType", () => {
  test("returns null for non-namespaced types", () => {
    expect(parseNamespacedType("MyType")).toBeNull();
    expect(parseNamespacedType("Asset")).toBeNull();
    expect(parseNamespacedType("SingleBar")).toBeNull();
  });

  test("parses simple namespaced type", () => {
    const result = parseNamespacedType("Validation.CrossfieldReference");
    expect(result).toEqual({
      namespace: "Validation",
      member: "CrossfieldReference",
    });
  });

  test("parses namespaced type with nested namespace", () => {
    const result = parseNamespacedType("Player.Types.Asset");
    expect(result).toEqual({
      namespace: "Player",
      member: "Types.Asset",
    });
  });

  test("parses single character namespace", () => {
    const result = parseNamespacedType("V.Type");
    expect(result).toEqual({
      namespace: "V",
      member: "Type",
    });
  });

  test("handles empty string", () => {
    expect(parseNamespacedType("")).toBeNull();
  });

  test("handles string with only dot", () => {
    const result = parseNamespacedType(".Type");
    expect(result).toEqual({
      namespace: "",
      member: "Type",
    });
  });
});

describe("findAssetWrapperPaths", () => {
  test("finds direct AssetWrapper property", () => {
    const node: ObjectType = {
      type: "object",
      properties: {
        label: { required: true, node: { type: "ref", ref: "AssetWrapper" } },
      },
    };

    const paths = findAssetWrapperPaths(node, new Map());
    expect(paths).toEqual([["label"]]);
  });

  test("finds multiple AssetWrapper properties", () => {
    const node: ObjectType = {
      type: "object",
      properties: {
        header: { required: true, node: { type: "ref", ref: "AssetWrapper" } },
        footer: {
          required: false,
          node: { type: "ref", ref: "AssetWrapper<TextAsset>" },
        },
      },
    };

    const paths = findAssetWrapperPaths(node, new Map());
    expect(paths).toEqual([["header"], ["footer"]]);
  });

  test("finds AssetWrapper in array type", () => {
    const node: ObjectType = {
      type: "object",
      properties: {
        items: {
          required: true,
          node: {
            type: "array",
            elementType: { type: "ref", ref: "AssetWrapper" },
          },
        },
      },
    };

    const paths = findAssetWrapperPaths(node, new Map());
    expect(paths).toEqual([["items"]]);
  });

  test("finds nested AssetWrapper via type registry", () => {
    const headerType: ObjectType = {
      type: "object",
      name: "ContentCardHeader",
      properties: {
        left: { required: false, node: { type: "ref", ref: "AssetWrapper" } },
        right: { required: false, node: { type: "ref", ref: "AssetWrapper" } },
      },
    };

    const cardType: ObjectType = {
      type: "object",
      properties: {
        header: {
          required: false,
          node: { type: "ref", ref: "ContentCardHeader" },
        },
      },
    };

    const typeRegistry: TypeRegistry = new Map([
      ["ContentCardHeader", headerType],
    ]);

    const paths = findAssetWrapperPaths(cardType, typeRegistry);
    expect(paths).toEqual([
      ["header", "left"],
      ["header", "right"],
    ]);
  });

  test("finds deeply nested AssetWrapper paths", () => {
    const slotType: ObjectType = {
      type: "object",
      name: "SlotConfig",
      properties: {
        content: { required: true, node: { type: "ref", ref: "AssetWrapper" } },
      },
    };

    const sectionType: ObjectType = {
      type: "object",
      name: "Section",
      properties: {
        slot: { required: true, node: { type: "ref", ref: "SlotConfig" } },
      },
    };

    const pageType: ObjectType = {
      type: "object",
      properties: {
        section: { required: true, node: { type: "ref", ref: "Section" } },
      },
    };

    const typeRegistry: TypeRegistry = new Map([
      ["SlotConfig", slotType],
      ["Section", sectionType],
    ]);

    const paths = findAssetWrapperPaths(pageType, typeRegistry);
    expect(paths).toEqual([["section", "slot", "content"]]);
  });

  test("handles inline nested objects", () => {
    const node: ObjectType = {
      type: "object",
      properties: {
        config: {
          required: true,
          node: {
            type: "object",
            properties: {
              icon: {
                required: false,
                node: { type: "ref", ref: "AssetWrapper" },
              },
            },
          },
        },
      },
    };

    const paths = findAssetWrapperPaths(node, new Map());
    expect(paths).toEqual([["config", "icon"]]);
  });

  test("handles circular references without infinite loop", () => {
    const nodeA: ObjectType = {
      type: "object",
      name: "NodeA",
      properties: {
        child: { required: false, node: { type: "ref", ref: "NodeB" } },
        slot: { required: false, node: { type: "ref", ref: "AssetWrapper" } },
      },
    };

    const nodeB: ObjectType = {
      type: "object",
      name: "NodeB",
      properties: {
        parent: { required: false, node: { type: "ref", ref: "NodeA" } },
        icon: { required: false, node: { type: "ref", ref: "AssetWrapper" } },
      },
    };

    const typeRegistry: TypeRegistry = new Map([
      ["NodeA", nodeA],
      ["NodeB", nodeB],
    ]);

    // Should not infinite loop and should find paths
    const paths = findAssetWrapperPaths(nodeA, typeRegistry);
    expect(paths).toContainEqual(["slot"]);
    expect(paths).toContainEqual(["child", "icon"]);
  });

  test("returns empty array when no AssetWrapper found", () => {
    const node: ObjectType = {
      type: "object",
      properties: {
        name: { required: true, node: { type: "string" } },
        count: { required: false, node: { type: "number" } },
      },
    };

    const paths = findAssetWrapperPaths(node, new Map());
    expect(paths).toEqual([]);
  });

  test("handles union types with AssetWrapper", () => {
    const node: ObjectType = {
      type: "object",
      properties: {
        content: {
          required: true,
          node: {
            type: "or",
            or: [{ type: "ref", ref: "AssetWrapper" }, { type: "string" }],
          },
        },
      },
    };

    const paths = findAssetWrapperPaths(node, new Map());
    expect(paths).toEqual([["content"]]);
  });

  test("handles intersection types with AssetWrapper", () => {
    const baseType: ObjectType = {
      type: "object",
      name: "BaseType",
      properties: {
        slot: { required: true, node: { type: "ref", ref: "AssetWrapper" } },
      },
    };

    const node: ObjectType = {
      type: "object",
      properties: {
        mixed: {
          required: true,
          node: {
            type: "and",
            and: [
              { type: "ref", ref: "BaseType" },
              {
                type: "object",
                properties: {
                  extra: { required: true, node: { type: "string" } },
                },
              },
            ],
          },
        },
      },
    };

    const typeRegistry: TypeRegistry = new Map([["BaseType", baseType]]);

    const paths = findAssetWrapperPaths(node, typeRegistry);
    expect(paths).toContainEqual(["mixed", "slot"]);
  });

  test("finds direct ref extending AssetWrapper", () => {
    const headerType: ObjectType = {
      type: "object",
      name: "Header",
      properties: {
        title: { required: true, node: { type: "string" } },
      },
      extends: { type: "ref", ref: "AssetWrapper<AnyAsset>" },
      additionalProperties: false,
    };

    const tableType: ObjectType = {
      type: "object",
      properties: {
        header: {
          required: true,
          node: { type: "ref", ref: "Header" },
        },
      },
    };

    const typeRegistry: TypeRegistry = new Map([["Header", headerType]]);

    const paths = findAssetWrapperPaths(tableType, typeRegistry);
    expect(paths).toContainEqual(["header"]);
  });

  test("finds array of refs extending AssetWrapper", () => {
    const headerType: ObjectType = {
      type: "object",
      name: "Header",
      properties: {
        title: { required: true, node: { type: "string" } },
      },
      extends: { type: "ref", ref: "AssetWrapper<Asset>" },
      additionalProperties: false,
    };

    const tableType: ObjectType = {
      type: "object",
      properties: {
        headers: {
          required: true,
          node: {
            type: "array",
            elementType: { type: "ref", ref: "Header" },
          },
        },
      },
    };

    const typeRegistry: TypeRegistry = new Map([["Header", headerType]]);

    const paths = findAssetWrapperPaths(tableType, typeRegistry);
    expect(paths).toContainEqual(["headers"]);
  });

  test("finds nested AssetWrapper paths within type extending AssetWrapper", () => {
    const headerType: ObjectType = {
      type: "object",
      name: "Header",
      properties: {
        icon: {
          required: false,
          node: { type: "ref", ref: "AssetWrapper" },
        },
      },
      extends: { type: "ref", ref: "AssetWrapper<Asset>" },
      additionalProperties: false,
    };

    const tableType: ObjectType = {
      type: "object",
      properties: {
        header: {
          required: true,
          node: { type: "ref", ref: "Header" },
        },
      },
    };

    const typeRegistry: TypeRegistry = new Map([["Header", headerType]]);

    const paths = findAssetWrapperPaths(tableType, typeRegistry);
    // Should find both the header itself (extends AssetWrapper) and header.icon
    expect(paths).toContainEqual(["header"]);
    expect(paths).toContainEqual(["header", "icon"]);
  });

  test("finds AssetWrapper paths through Array<ObjectType> element types", () => {
    // StaticFilter has label/value as AssetWrapper (doesn't extend AssetWrapper)
    const staticFilterType: ObjectType = {
      type: "object",
      name: "StaticFilter",
      properties: {
        label: {
          required: true,
          node: { type: "ref", ref: "AssetWrapper" },
        },
        value: {
          required: true,
          node: { type: "ref", ref: "AssetWrapper" },
        },
        comparator: {
          required: true,
          node: { type: "string" },
        },
      },
      additionalProperties: false,
    };

    // Header has staticFilters: Array<StaticFilter> (inline element type)
    const headerType: ObjectType = {
      type: "object",
      properties: {
        staticFilters: {
          required: false,
          node: {
            type: "array",
            elementType: staticFilterType,
          },
        },
      },
    };

    const typeRegistry: TypeRegistry = new Map([
      ["StaticFilter", staticFilterType],
    ]);

    const paths = findAssetWrapperPaths(headerType, typeRegistry);
    // Should recurse into Array<StaticFilter> and find the nested AssetWrapper paths
    expect(paths).toContainEqual(["staticFilters", "label"]);
    expect(paths).toContainEqual(["staticFilters", "value"]);
  });

  test("finds AssetWrapper paths through Array<RefType> element types", () => {
    // Same test but with RefType element type instead of inline ObjectType
    const staticFilterType: ObjectType = {
      type: "object",
      name: "StaticFilter",
      properties: {
        label: {
          required: true,
          node: { type: "ref", ref: "AssetWrapper" },
        },
        value: {
          required: true,
          node: { type: "ref", ref: "AssetWrapper" },
        },
      },
      additionalProperties: false,
    };

    const headerType: ObjectType = {
      type: "object",
      properties: {
        staticFilters: {
          required: false,
          node: {
            type: "array",
            elementType: { type: "ref", ref: "StaticFilter" },
          },
        },
      },
    };

    const typeRegistry: TypeRegistry = new Map([
      ["StaticFilter", staticFilterType],
    ]);

    const paths = findAssetWrapperPaths(headerType, typeRegistry);
    expect(paths).toContainEqual(["staticFilters", "label"]);
    expect(paths).toContainEqual(["staticFilters", "value"]);
  });
});

describe("extendsAssetWrapper", () => {
  test("returns true for direct AssetWrapper extension", () => {
    const headerType: ObjectType = {
      type: "object",
      name: "Header",
      properties: {},
      extends: { type: "ref", ref: "AssetWrapper<Asset>" },
      additionalProperties: false,
    };

    const registry: TypeRegistry = new Map([["Header", headerType]]);

    expect(extendsAssetWrapper({ type: "ref", ref: "Header" }, registry)).toBe(
      true,
    );
  });

  test("returns true for transitive AssetWrapper extension", () => {
    const baseType: ObjectType = {
      type: "object",
      name: "ListItemBase",
      properties: {},
      extends: { type: "ref", ref: "AssetWrapper<AnyAsset>" },
      additionalProperties: false,
    };

    const derivedType: ObjectType = {
      type: "object",
      name: "ListItem",
      properties: {
        help: { required: false, node: { type: "string" } },
      },
      extends: { type: "ref", ref: "ListItemBase" },
      additionalProperties: false,
    };

    const registry: TypeRegistry = new Map([
      ["ListItemBase", baseType],
      ["ListItem", derivedType],
    ]);

    expect(
      extendsAssetWrapper({ type: "ref", ref: "ListItem" }, registry),
    ).toBe(true);
  });

  test("returns false for non-extending types", () => {
    const normalType: ObjectType = {
      type: "object",
      name: "Metadata",
      properties: {
        title: { required: true, node: { type: "string" } },
      },
      additionalProperties: false,
    };

    const registry: TypeRegistry = new Map([["Metadata", normalType]]);

    expect(
      extendsAssetWrapper({ type: "ref", ref: "Metadata" }, registry),
    ).toBe(false);
  });

  test("handles circular references without infinite loop", () => {
    const typeA: ObjectType = {
      type: "object",
      name: "TypeA",
      properties: {},
      extends: { type: "ref", ref: "TypeB" },
      additionalProperties: false,
    };

    const typeB: ObjectType = {
      type: "object",
      name: "TypeB",
      properties: {},
      extends: { type: "ref", ref: "TypeA" },
      additionalProperties: false,
    };

    const registry: TypeRegistry = new Map([
      ["TypeA", typeA],
      ["TypeB", typeB],
    ]);

    // Should not infinite loop - returns false since neither extends AssetWrapper
    expect(extendsAssetWrapper({ type: "ref", ref: "TypeA" }, registry)).toBe(
      false,
    );
  });

  test("returns false for non-ref node types", () => {
    const registry: TypeRegistry = new Map();

    expect(extendsAssetWrapper({ type: "string" }, registry)).toBe(false);
  });
});
