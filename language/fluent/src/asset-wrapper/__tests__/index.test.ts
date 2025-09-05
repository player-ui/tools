import { describe, test, expect, beforeEach } from "vitest";
import { createAssetWrapper } from "../index";
import { globalIdRegistry } from "../../id-generator";
import type { Asset } from "@player-ui/types";
import type { ParentCtx, FluentBuilder } from "../../types";
import { markAsBuilder } from "../../utils";

describe("createAssetWrapper", () => {
  beforeEach(() => {
    // Reset the global registry before each test
    globalIdRegistry.reset();
  });

  describe("with static assets", () => {
    test("preserves existing ID when asset has one", () => {
      const asset: Asset = {
        id: "custom-id",
        type: "text",
        value: "Hello",
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const result = createAssetWrapper(asset, ctx, "label");

      expect(result.asset.id).toBe("custom-id");
      expect(result.asset.type).toBe("text");
      expect(result.asset.value).toBe("Hello");
    });

    test("generates ID with slot name when asset has no ID", () => {
      const asset: Asset = {
        id: "",
        type: "text",
        value: "Hello",
      } as Asset;

      const ctx: ParentCtx = {
        parentId: "form",
        branch: undefined,
      };

      const result = createAssetWrapper(asset, ctx, "label");

      expect(result.asset.id).toBe("form-label");
      expect(result.asset.type).toBe("text");
    });

    test("generates nested slot IDs correctly", () => {
      const asset: Asset = {
        type: "input",
      } as Asset;

      const ctx: ParentCtx = {
        parentId: "section",
        branch: { type: "slot", name: "fields" },
      };

      const result = createAssetWrapper(asset, ctx, "email");

      expect(result.asset.id).toBe("section-fields-email");
    });

    test("handles empty parent ID", () => {
      const asset: Asset = {
        id: "",
        type: "text",
        value: "Test",
      } as Asset;

      const ctx: ParentCtx = {
        parentId: "",
        branch: undefined,
      };

      const result = createAssetWrapper(asset, ctx, "content");

      expect(result.asset.id).toBe("content");
    });

    test("handles array item context", () => {
      const asset: Asset = {
        id: "",
        type: "text",
        value: "Item",
      } as Asset;

      const ctx: ParentCtx = {
        parentId: "list",
        branch: { type: "array-item", index: 2 },
      };

      const result = createAssetWrapper(asset, ctx, "label");

      expect(result.asset.id).toBe("list-2-label");
    });

    test("handles template context", () => {
      const asset: Asset = {
        id: "",
        type: "text",
        value: "Template Item",
      } as Asset;

      const ctx: ParentCtx = {
        parentId: "container",
        branch: { type: "template", depth: 0 },
      };

      const result = createAssetWrapper(asset, ctx, "item");

      expect(result.asset.id).toBe("container-_index_-item");
    });

    test("handles switch context", () => {
      const asset: Asset = {
        id: "",
        type: "text",
        value: "Switch Content",
      } as Asset;

      const ctx: ParentCtx = {
        parentId: "condition",
        branch: { type: "switch", index: 1, kind: "dynamic" },
      };

      const result = createAssetWrapper(asset, ctx, "content");

      expect(result.asset.id).toBe("condition-dynamicSwitch-1-content");
    });

    test("preserves other asset properties", () => {
      const asset: Asset = {
        id: "",
        type: "complex",
        nested: {
          property: "value",
          array: [1, 2, 3],
        },
        flag: true,
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const result = createAssetWrapper(asset, ctx, "slot");

      expect(result.asset.nested).toEqual({
        property: "value",
        array: [1, 2, 3],
      });
      expect(result.asset.flag).toBe(true);
    });
  });

  describe("with FluentBuilder functions", () => {
    test("calls builder with proper slot context", () => {
      let capturedContext: ParentCtx | undefined;

      const builder: FluentBuilder<Asset, ParentCtx> = markAsBuilder(
        (ctx: ParentCtx) => {
          capturedContext = ctx;
          return {
            id: "builder-generated",
            type: "text",
            value: "Built",
          } as Asset;
        },
      );

      const ctx: ParentCtx = {
        parentId: "container",
        branch: undefined,
      };

      const result = createAssetWrapper(builder, ctx, "content");

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.parentId).toBe("container");
      expect(capturedContext?.branch).toEqual({
        type: "slot",
        name: "content",
      });
      expect(result.asset.id).toBe("builder-generated");
    });

    test("chains context correctly for nested builders", () => {
      let capturedContext: ParentCtx | undefined;

      const builder: FluentBuilder<Asset, ParentCtx> = markAsBuilder(
        (ctx: ParentCtx) => {
          capturedContext = ctx;
          return {
            id: "",
            type: "dynamic",
            value: ctx.parentId, // Use parent ID as value for testing
          };
        },
      );

      const ctx: ParentCtx = {
        parentId: "form",
        branch: { type: "slot", name: "section" },
      };

      const result = createAssetWrapper(builder, ctx, "field");

      expect(capturedContext?.parentId).toBe("form-section");
      expect(capturedContext?.branch).toEqual({
        type: "slot",
        name: "field",
      });
      expect(result.asset.value).toBe("form-section");
    });

    test("generates ID for builder result without ID", () => {
      const builder: FluentBuilder<Asset, ParentCtx> = markAsBuilder(
        (_ctx: ParentCtx) => ({
          id: "",
          type: "text",
          value: "No ID",
        }),
      );

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const result = createAssetWrapper(builder, ctx, "slot");

      // The builder should receive the context and generate ID internally
      expect(result.asset.type).toBe("text");
      expect(result.asset.value).toBe("No ID");
    });

    test("handles complex nested contexts", () => {
      const contexts: ParentCtx[] = [];

      const builder: FluentBuilder<Asset, ParentCtx> = markAsBuilder(
        (ctx: ParentCtx) => {
          contexts.push(ctx);
          return {
            type: "nested",
            id: `${ctx.parentId}-custom`,
          } as Asset;
        },
      );

      const ctx: ParentCtx = {
        parentId: "app",
        branch: {
          type: "switch",
          index: 0,
          kind: "static",
        },
      };

      createAssetWrapper(builder, ctx, "content");

      expect(contexts[0].parentId).toBe("app-staticSwitch-0");
      expect(contexts[0].branch).toEqual({
        type: "slot",
        name: "content",
      });
    });
  });

  describe("ID collision handling", () => {
    test("handles collisions for static assets", () => {
      const asset1: Asset = { id: "", type: "text", value: "First" } as Asset;
      const asset2: Asset = { id: "", type: "text", value: "Second" } as Asset;

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const result1 = createAssetWrapper(asset1, ctx, "slot");
      const result2 = createAssetWrapper(asset2, ctx, "slot");

      expect(result1.asset.id).toBe("parent-slot");
      expect(result2.asset.id).toBe("parent-slot-1"); // Slot gets collision suffix
    });

    test("handles collisions across different slot names", () => {
      // Artificially create a collision scenario
      const asset1: Asset = { type: "text" } as Asset;
      const asset2: Asset = { type: "text" } as Asset;

      const ctx1: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const ctx2: ParentCtx = {
        parentId: "parent-label",
        branch: undefined,
      };

      const result1 = createAssetWrapper(asset1, ctx1, "label-content");
      const result2 = createAssetWrapper(asset2, ctx2, "content");

      // Both would generate "parent-label-content" without collision detection
      expect(result1.asset.id).toBe("parent-label-content");
      expect(result2.asset.id).toBe("parent-label-content-1");
    });
  });

  describe("edge cases", () => {
    test("handles slot names with special characters", () => {
      const asset: Asset = { type: "text" } as Asset;

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const result = createAssetWrapper(asset, ctx, "slot-with-dashes");

      expect(result.asset.id).toBe("parent-slot-with-dashes");
    });

    test("handles numeric slot names", () => {
      const asset: Asset = { type: "text" } as Asset;

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const result = createAssetWrapper(asset, ctx, "123");

      expect(result.asset.id).toBe("parent-123");
    });

    test("handles deeply nested context chains", () => {
      const asset: Asset = { type: "text" } as Asset;

      const ctx: ParentCtx = {
        parentId: "a",
        branch: {
          type: "slot",
          name: "b",
        },
      };

      // This will create: a-b (parent) -> a-b-c (slot)
      const result = createAssetWrapper(asset, ctx, "c");

      expect(result.asset.id).toBe("a-b-c");
    });

    test("returns asset wrapper structure", () => {
      const asset: Asset = {
        id: "test",
        type: "text",
        value: "content",
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const result = createAssetWrapper(asset, ctx, "slot");

      // Verify the wrapper structure
      expect(result).toHaveProperty("asset");
      expect(result.asset).toHaveProperty("id");
      expect(result.asset).toHaveProperty("type");
      expect(result.asset).toHaveProperty("value");
    });

    test("creates unique IDs for same context called multiple times", () => {
      const ctx: ParentCtx = {
        parentId: "parent",
        branch: undefined,
      };

      const results = Array.from({ length: 3 }, () =>
        createAssetWrapper({ type: "text" } as Asset, ctx, "repeated"),
      );

      expect(results[0].asset.id).toBe("parent-repeated");
      expect(results[1].asset.id).toBe("parent-repeated-1"); // Slot gets collision suffix
      expect(results[2].asset.id).toBe("parent-repeated-2");
    });
  });
});
