/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Asset, AssetWrapper } from "@player-ui/types";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { genId } from "../../id-generator";
import type { ParentCtx } from "../../types";
import { FLUENT_BUILDER_MARKER } from "../../types";
import { createAssetWrapper } from "../index";

// Mock the genId function to make tests predictable
vi.mock("../../id-generator", async () => {
  const actual =
    await vi.importActual<typeof import("../../id-generator")>(
      "../../id-generator",
    );
  return {
    ...actual,
    genId: vi.fn(
      (ctx: ParentCtx) =>
        `generated-${ctx.parentId}-${ctx.branch?.type || "no-branch"}`,
    ),
  };
});

const mockedGenId = vi.mocked(genId);

describe("createAssetWrapper", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Asset object inputs", () => {
    test("wraps a static asset object with an existing ID", () => {
      const asset: Asset = {
        id: "my-custom-id",
        type: "text",
        value: "Hello World",
      };

      const ctx: ParentCtx = {
        parentId: "parent-1",
        branch: { type: "slot", name: "content" },
      };

      const result: AssetWrapper<Asset> = createAssetWrapper(
        asset,
        ctx,
        "mySlot",
      );

      // Should not call genId since asset already has an ID
      expect(mockedGenId).not.toHaveBeenCalled();

      // Should return wrapped asset with original asset preserved
      expect(result).toEqual({
        asset: {
          id: "my-custom-id",
          type: "text",
          value: "Hello World",
        },
      });
    });

    test("wraps a static asset object without an ID and generates one", () => {
      const asset: Omit<Asset, "id"> = {
        type: "text",
        value: "Hello World",
      };

      const ctx: ParentCtx = {
        parentId: "parent-1",
        branch: { type: "slot", name: "content" },
      };

      const result: AssetWrapper<Asset> = createAssetWrapper(
        asset as Asset,
        ctx,
        "mySlot",
      );

      // Should call genId to generate an ID for the asset without one
      expect(mockedGenId).toHaveBeenCalledWith(ctx);

      // Should return wrapped asset with the same content but potentially with generated ID context
      expect(result).toEqual({
        asset: {
          id: "generated-parent-1-slot",
          type: "text",
          value: "Hello World",
        },
      });
    });

    test("preserves all asset properties when wrapping", () => {
      const complexAsset: Asset = {
        id: "complex-asset",
        type: "collection",
        values: ["item1", "item2"],
        label: "My Collection",
        metaData: { custom: "data" },
      };

      const ctx: ParentCtx = {
        parentId: "parent-complex",
        branch: { type: "array-item", index: 0 },
      };

      const result: AssetWrapper<Asset> = createAssetWrapper(
        complexAsset,
        ctx,
        "collection-slot",
      );

      expect(result.asset).toEqual(complexAsset);
      expect(mockedGenId).not.toHaveBeenCalled();
    });

    test("creates a copy of the asset object to avoid mutation", () => {
      const originalAsset: Asset = {
        id: "original",
        type: "text",
        value: "original value",
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: { type: "slot", name: "test" },
      };

      const result = createAssetWrapper(originalAsset, ctx, "test-slot");

      // Modify the result to ensure original isn't affected
      result.asset.value = "modified value";

      expect(originalAsset.value).toBe("original value");
    });
  });

  describe("Asset function inputs", () => {
    test("executes asset function with proper nested context", () => {
      const assetFunction = vi.fn(
        (ctx: ParentCtx): Asset => ({
          id: `dynamic-${ctx.parentId}`,
          type: "text",
          value: `Content for ${ctx.branch?.type}`,
        }),
      );

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const parentCtx: ParentCtx = {
        parentId: "parent-func",
        branch: { type: "template", depth: 1 },
      };

      const result = createAssetWrapper(
        assetFunction,
        parentCtx,
        "dynamic-slot",
      );

      // Should call genId with the original context first
      expect(mockedGenId).toHaveBeenCalledWith(parentCtx);

      // Should call asset function with nested context
      expect(assetFunction).toHaveBeenCalledWith({
        ...parentCtx,
        parentId: "generated-parent-func-template",
        branch: {
          type: "slot",
          name: "dynamic-slot",
        },
      });

      expect(result.asset).toEqual({
        id: "dynamic-generated-parent-func-template",
        type: "text",
        value: "Content for slot",
      });
    });

    test("handles asset function with complex return types", () => {
      interface CustomAsset extends Asset {
        customProp: string;
        nestedData: {
          items: string[];
          count: number;
        };
      }

      const assetFunction = (ctx: ParentCtx): CustomAsset => ({
        id: `custom-${ctx.parentId}`,
        type: "custom",
        customProp: "custom value",
        nestedData: {
          items: ["a", "b", "c"],
          count: 3,
        },
      });

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const ctx: ParentCtx = {
        parentId: "custom-parent",
        branch: { type: "switch", index: 2, kind: "dynamic" },
      };

      const result = createAssetWrapper(assetFunction, ctx, "custom-slot");

      expect(result.asset.customProp).toBe("custom value");
      expect(result.asset.nestedData.items).toEqual(["a", "b", "c"]);
      expect(result.asset.nestedData.count).toBe(3);
    });

    test("asset function receives correct nested context structure", () => {
      const contextCapture = vi.fn((ctx: ParentCtx) => ({
        id: "test",
        type: "text" as const,
        receivedContext: ctx,
      }));

      (contextCapture as any)[FLUENT_BUILDER_MARKER] = true;

      const originalCtx: ParentCtx = {
        parentId: "original-parent",
        branch: { type: "array-item", index: 5 },
      };

      createAssetWrapper(contextCapture, originalCtx, "test-slot");

      const expectedNestedCtx = {
        ...originalCtx,
        parentId: "generated-original-parent-array-item",
        branch: {
          type: "slot",
          name: "test-slot",
        },
      };

      expect(contextCapture).toHaveBeenCalledWith(expectedNestedCtx);
    });

    test("handles asset function that returns asset without ID", () => {
      const assetFunction = (): Omit<Asset, "id"> => ({
        type: "text",
        value: "No ID asset",
      });

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const ctx: ParentCtx = {
        parentId: "func-parent",
        branch: { type: "slot", name: "content" },
      };

      const result = createAssetWrapper(
        assetFunction as () => Asset,
        ctx,
        "no-id-slot",
      );

      expect(result.asset).toEqual({
        type: "text",
        value: "No ID asset",
      });
    });
  });

  describe("Context handling", () => {
    test("handles context without branch", () => {
      const asset: Omit<Asset, "id"> = {
        type: "text",
        value: "test",
      };

      const ctx: ParentCtx = {
        parentId: "parent-no-branch",
      };

      const result = createAssetWrapper(asset as Asset, ctx, "test-slot");

      expect(mockedGenId).toHaveBeenCalledWith(ctx);
      expect(result.asset.type).toBe("text");
    });

    test("preserves original context properties when creating nested context", () => {
      const assetFunction = vi.fn((ctx: ParentCtx) => ({
        id: "test",
        type: "text" as const,
        value: "test",
      }));

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const originalCtx: ParentCtx = {
        parentId: "preserve-test",
        branch: { type: "template", depth: 2 },
      };

      createAssetWrapper(assetFunction, originalCtx, "preserve-slot");

      const receivedCtx = assetFunction.mock.calls[0][0];

      // Should preserve original context and add new branch
      expect(receivedCtx.parentId).toBe("generated-preserve-test-template");
      expect(receivedCtx.branch).toEqual({
        type: "slot",
        name: "preserve-slot",
      });
    });

    test("creates proper nested context for different branch types", () => {
      const assetFunction = vi.fn((ctx: ParentCtx) => ({
        id: "test",
        type: "text" as const,
      }));

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const branchTypes = [
        { type: "slot" as const, name: "header" },
        { type: "array-item" as const, index: 3 },
        { type: "template" as const, depth: 1 },
        { type: "switch" as const, index: 0, kind: "static" as const },
      ];

      branchTypes.forEach((branch, index) => {
        const ctx: ParentCtx = {
          parentId: `parent-${index}`,
          branch,
        };

        createAssetWrapper(assetFunction, ctx, `slot-${index}`);

        const expectedNestedCtx = {
          ...ctx,
          parentId: `generated-parent-${index}-${branch.type}`,
          branch: {
            type: "slot",
            name: `slot-${index}`,
          },
        };

        expect(assetFunction).toHaveBeenCalledWith(expectedNestedCtx);
        assetFunction.mockClear();
        mockedGenId.mockClear();
      });
    });
  });

  describe("Slot name handling", () => {
    test("uses provided slot name in nested context", () => {
      const assetFunction = vi.fn((ctx: ParentCtx) => ({
        id: "test",
        type: "text" as const,
      }));

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const ctx: ParentCtx = {
        parentId: "slot-test-parent",
      };

      const slotNames = ["header", "footer", "content", "sidebar", "main"];

      slotNames.forEach((slotName) => {
        createAssetWrapper(assetFunction, ctx, slotName);

        const receivedCtx =
          assetFunction.mock.calls[assetFunction.mock.calls.length - 1][0];
        expect(receivedCtx.branch).toEqual({
          type: "slot",
          name: slotName,
        });
      });
    });

    test("handles empty slot name", () => {
      const assetFunction = vi.fn((ctx: ParentCtx) => ({
        id: "test",
        type: "text" as const,
      }));

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const ctx: ParentCtx = {
        parentId: "empty-slot-parent",
      };

      createAssetWrapper(assetFunction, ctx, "");

      const receivedCtx = assetFunction.mock.calls[0][0];
      expect(receivedCtx.branch).toEqual({
        type: "slot",
        name: "",
      });
    });

    test("handles special characters in slot name", () => {
      const assetFunction = vi.fn((ctx: ParentCtx) => ({
        id: "test",
        type: "text" as const,
      }));

      (assetFunction as any)[FLUENT_BUILDER_MARKER] = true;

      const ctx: ParentCtx = {
        parentId: "special-char-parent",
      };

      const specialSlotNames = [
        "slot-with-dashes",
        "slot_with_underscores",
        "slot.with.dots",
        "slot123",
      ];

      specialSlotNames.forEach((slotName) => {
        createAssetWrapper(assetFunction, ctx, slotName);

        const receivedCtx =
          assetFunction.mock.calls[assetFunction.mock.calls.length - 1][0];
        expect(receivedCtx.branch?.type).toBe("slot");
        if (receivedCtx.branch?.type === "slot") {
          expect(receivedCtx.branch.name).toBe(slotName);
        }
      });
    });
  });
});
