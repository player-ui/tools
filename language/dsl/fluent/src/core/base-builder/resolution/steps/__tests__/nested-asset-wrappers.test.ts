import { describe, test, expect } from "vitest";
import { resolveNestedAssetWrappers } from "../nested-asset-wrappers";
import type { BaseBuildContext } from "../../../types";
import { FLUENT_BUILDER_SYMBOL } from "../../../types";

describe("resolveNestedAssetWrappers", () => {
  test("skips paths with length < 2", () => {
    const result: Record<string, unknown> = {
      label: { type: "text", value: "Hello" },
    };

    resolveNestedAssetWrappers(result, undefined, [["label"]]);

    // Should not wrap - this is handled by direct AssetWrapper resolution
    expect(result.label).toEqual({ type: "text", value: "Hello" });
  });

  test("wraps asset at nested path", () => {
    const result: Record<string, unknown> = {
      header: {
        left: { type: "text", value: "Hello" },
      },
    };

    resolveNestedAssetWrappers(result, undefined, [["header", "left"]]);

    expect(result.header).toEqual({
      left: { asset: { type: "text", value: "Hello" } },
    });
  });

  test("wraps multiple nested paths", () => {
    const result: Record<string, unknown> = {
      header: {
        left: { type: "text", value: "Left" },
        right: { type: "text", value: "Right" },
      },
    };

    resolveNestedAssetWrappers(result, undefined, [
      ["header", "left"],
      ["header", "right"],
    ]);

    expect(result.header).toEqual({
      left: { asset: { type: "text", value: "Left" } },
      right: { asset: { type: "text", value: "Right" } },
    });
  });

  test("handles deeply nested paths", () => {
    const result: Record<string, unknown> = {
      section: {
        content: {
          slot: { type: "text", value: "Deep" },
        },
      },
    };

    resolveNestedAssetWrappers(result, undefined, [
      ["section", "content", "slot"],
    ]);

    expect(result.section).toEqual({
      content: {
        slot: { asset: { type: "text", value: "Deep" } },
      },
    });
  });

  test("skips already wrapped assets", () => {
    const result: Record<string, unknown> = {
      header: {
        left: { asset: { type: "text", value: "Already wrapped" } },
      },
    };

    resolveNestedAssetWrappers(result, undefined, [["header", "left"]]);

    expect(result.header).toEqual({
      left: { asset: { type: "text", value: "Already wrapped" } },
    });
  });

  test("handles missing intermediate path", () => {
    const result: Record<string, unknown> = {
      // header.left doesn't exist
    };

    // Should not throw
    resolveNestedAssetWrappers(result, undefined, [["header", "left"]]);

    expect(result).toEqual({});
  });

  test("handles null value in path", () => {
    const result: Record<string, unknown> = {
      header: {
        left: null,
      },
    };

    resolveNestedAssetWrappers(result, undefined, [["header", "left"]]);

    expect(result.header).toEqual({ left: null });
  });

  test("wraps arrays of assets", () => {
    const result: Record<string, unknown> = {
      content: {
        items: [
          { type: "text", value: "Item 1" },
          { type: "text", value: "Item 2" },
        ],
      },
    };

    resolveNestedAssetWrappers(result, undefined, [["content", "items"]]);

    expect(result.content).toEqual({
      items: [
        { asset: { type: "text", value: "Item 1" } },
        { asset: { type: "text", value: "Item 2" } },
      ],
    });
  });

  test("filters null/undefined from arrays", () => {
    const result: Record<string, unknown> = {
      content: {
        items: [{ type: "text", value: "Valid" }, null, undefined],
      },
    };

    resolveNestedAssetWrappers(result, undefined, [["content", "items"]]);

    expect(result.content).toEqual({
      items: [{ asset: { type: "text", value: "Valid" } }],
    });
  });

  test("skips non-asset values", () => {
    const result: Record<string, unknown> = {
      config: {
        name: "test",
      },
    };

    resolveNestedAssetWrappers(result, undefined, [["config", "name"]]);

    // String value should not be wrapped
    expect(result.config).toEqual({ name: "test" });
  });

  test("generates slot names from path", () => {
    const context: BaseBuildContext = {
      parentId: "parent",
    };

    const result: Record<string, unknown> = {
      header: {
        left: { type: "text", value: "Hello", id: "" },
      },
    };

    resolveNestedAssetWrappers(result, context, [["header", "left"]]);

    // The ID should be generated using the path as slot name
    const header = result.header as Record<string, unknown>;
    const left = header.left as { asset: { id: string } };
    expect(left.asset.id).toBe("parent-header-left");
  });

  test("resolves intermediate builders before continuing traversal", () => {
    // Create a mock builder for the intermediate object
    const mockBuilder = {
      [FLUENT_BUILDER_SYMBOL]: true as const,
      build: () => ({
        left: { type: "text", value: "From builder" },
      }),
    };

    const result: Record<string, unknown> = {
      header: mockBuilder,
    };

    resolveNestedAssetWrappers(result, undefined, [["header", "left"]]);

    // The intermediate builder should be resolved, and the leaf should be wrapped
    expect(result.header).toEqual({
      left: { asset: { type: "text", value: "From builder" } },
    });
  });

  test("handles empty path gracefully", () => {
    const result: Record<string, unknown> = {
      label: { type: "text", value: "Hello" },
    };

    // Should not throw for empty path
    resolveNestedAssetWrappers(result, undefined, [[]]);

    // Result should be unchanged
    expect(result.label).toEqual({ type: "text", value: "Hello" });
  });
});
