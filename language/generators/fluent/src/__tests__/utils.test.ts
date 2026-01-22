import { describe, test, expect } from "vitest";
import type { ObjectType } from "@player-tools/xlr";
import {
  extractBaseName,
  parseNamespacedType,
  findAssetWrapperPaths,
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
});
