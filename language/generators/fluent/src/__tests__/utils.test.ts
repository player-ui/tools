import { describe, test, expect } from "vitest";
import { extractBaseName, parseNamespacedType } from "../utils";

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
