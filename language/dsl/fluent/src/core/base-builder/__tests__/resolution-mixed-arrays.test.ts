import { describe, test, expect, beforeEach, vi } from "vitest";
import type {
  BaseBuildContext,
  FluentBuilder,
  MixedArrayMetadata,
} from "../types";
import { FLUENT_BUILDER_SYMBOL } from "../types";
import { ValueStorage } from "../storage/value-storage";
import { resolveMixedArrays } from "../resolution/steps/mixed-arrays";

// Create a mock builder that satisfies the FluentBuilder interface
function createMockBuilder<T = { id: string; type: string }>(
  buildResult: T,
): FluentBuilder<T, BaseBuildContext> {
  const builder = {
    [FLUENT_BUILDER_SYMBOL]: true as const,
    build: vi.fn((ctx?: BaseBuildContext) => ({
      ...buildResult,
      id: ctx?.parentId
        ? `${ctx.parentId}-${(buildResult as { type?: string }).type ?? "unknown"}`
        : (buildResult as { id?: string }).id,
    })) as () => T,
  };
  return builder as FluentBuilder<T, BaseBuildContext>;
}

describe("resolveMixedArrays - Array Resolution", () => {
  let storage: ValueStorage<{ values: unknown[] }>;

  beforeEach(() => {
    storage = new ValueStorage();
  });

  test("resolves array with all builders", () => {
    const builder1 = createMockBuilder({
      id: "1",
      type: "text",
      value: "first",
    });
    const builder2 = createMockBuilder({
      id: "2",
      type: "text",
      value: "second",
    });

    storage.set("values", [builder1, builder2]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    expect(result.values).toBeInstanceOf(Array);
    expect((result.values as unknown[]).length).toBe(2);
  });

  test("resolves array with mixed builders and static values", () => {
    const builder = createMockBuilder({ id: "1", type: "text" });
    const staticValue = { id: "static", type: "text", value: "static" };

    storage.set("values", [builder, staticValue]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    expect(result.values).toBeInstanceOf(Array);
    expect((result.values as unknown[]).length).toBe(2);
  });

  test("filters null/undefined values from array", () => {
    const builder = createMockBuilder({ id: "1", type: "text" });
    const staticValue = { id: "static", type: "text" };

    // Mock the storage with null/undefined values
    const mixedArrayMeta: MixedArrayMetadata = {
      array: [builder, null, undefined, staticValue],
      builderIndices: new Set([0]),
      objectIndices: new Set(),
    };

    // Directly inject the mixed array metadata
    (
      storage as unknown as { mixedArrays: Map<string, MixedArrayMetadata> }
    ).mixedArrays = new Map([["values", mixedArrayMeta]]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    // Should filter out null and undefined
    expect(result.values).toBeInstanceOf(Array);
    expect((result.values as unknown[]).length).toBe(2);
  });

  test("preserves order after filtering", () => {
    const builder1 = createMockBuilder({ id: "1", type: "text" });
    const builder2 = createMockBuilder({ id: "2", type: "text" });
    const staticValue = { id: "static", type: "text" };

    const mixedArrayMeta: MixedArrayMetadata = {
      array: [null, builder1, undefined, staticValue, null, builder2],
      builderIndices: new Set([1, 5]),
      objectIndices: new Set(),
    };

    (
      storage as unknown as { mixedArrays: Map<string, MixedArrayMetadata> }
    ).mixedArrays = new Map([["values", mixedArrayMeta]]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    expect(result.values).toBeInstanceOf(Array);
    expect((result.values as unknown[]).length).toBe(3);
    // Order should be: builder1, staticValue, builder2
  });
});

describe("resolveMixedArrays - AssetWrapper Objects", () => {
  let storage: ValueStorage<{ values: unknown }>;

  beforeEach(() => {
    storage = new ValueStorage();
  });

  test("handles AssetWrapper format objects containing builders", () => {
    const builder = createMockBuilder({ id: "1", type: "text" });

    // AssetWrapper format: { asset: builder }
    storage.set("values", { asset: builder });

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    // resolveMixedArrays handles mixed arrays, not AssetWrapper objects directly
    // Those are handled by resolveAssetWrappers step
    resolveMixedArrays(storage, result, context);

    // No mixed array to process, result should be empty
    expect(Object.keys(result).length).toBe(0);
  });

  test("processes array containing AssetWrapper-like objects", () => {
    const builder = createMockBuilder({ id: "1", type: "text" });
    const wrapperObject = { asset: builder };

    storage.set("values", [wrapperObject]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    // Array with nested builders should be processed
    expect(result.values).toBeInstanceOf(Array);
    expect((result.values as unknown[]).length).toBe(1);
  });

  test("handles mixed array with both builders and AssetWrapper objects", () => {
    const builder1 = createMockBuilder({ id: "1", type: "text" });
    const builder2 = createMockBuilder({ id: "2", type: "text" });
    const wrapperObject = { asset: builder2 };

    storage.set("values", [builder1, wrapperObject, "static"]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    expect(result.values).toBeInstanceOf(Array);
    expect((result.values as unknown[]).length).toBe(3);
  });
});

describe("resolveMixedArrays - Context Handling", () => {
  let storage: ValueStorage<{ values: unknown[] }>;

  beforeEach(() => {
    storage = new ValueStorage();
  });

  test("generates indexed slot names (key-0, key-1, ...)", () => {
    const builder1 = createMockBuilder({ id: "1", type: "text" });
    const builder2 = createMockBuilder({ id: "2", type: "text" });

    storage.set("values", [builder1, builder2]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    // Builders should receive context with indexed slot names
    expect(builder1.build).toHaveBeenCalled();
    expect(builder2.build).toHaveBeenCalled();
  });

  test("handles undefined context gracefully", () => {
    const builder = createMockBuilder({ id: "1", type: "text" });

    storage.set("values", [builder]);

    const result: Record<string, unknown> = {};

    // Should not throw when context is undefined
    expect(() => {
      resolveMixedArrays(storage, result, undefined);
    }).not.toThrow();

    expect(result.values).toBeInstanceOf(Array);
  });

  test("processes multiple mixed arrays", () => {
    const builder1 = createMockBuilder({ id: "1", type: "text" });
    const builder2 = createMockBuilder({ id: "2", type: "action" });

    const storage2 = new ValueStorage<{
      items: unknown[];
      actions: unknown[];
    }>();
    storage2.set("items", [builder1, { id: "static", type: "text" }]);
    storage2.set("actions", [builder2]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage2, result, context);

    expect(result.items).toBeInstanceOf(Array);
    expect(result.actions).toBeInstanceOf(Array);
    expect((result.items as unknown[]).length).toBe(2);
    expect((result.actions as unknown[]).length).toBe(1);
  });
});

describe("resolveMixedArrays - Empty and Edge Cases", () => {
  test("handles empty storage", () => {
    const storage = new ValueStorage<{ values: unknown[] }>();
    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    expect(() => {
      resolveMixedArrays(storage, result, context);
    }).not.toThrow();

    expect(result).toEqual({});
  });

  test("handles empty array", () => {
    const storage = new ValueStorage<{ values: unknown[] }>();

    const mixedArrayMeta: MixedArrayMetadata = {
      array: [],
      builderIndices: new Set(),
      objectIndices: new Set(),
    };

    (
      storage as unknown as { mixedArrays: Map<string, MixedArrayMetadata> }
    ).mixedArrays = new Map([["values", mixedArrayMeta]]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    expect(result.values).toEqual([]);
  });

  test("handles array with only null/undefined", () => {
    const storage = new ValueStorage<{ values: unknown[] }>();

    const mixedArrayMeta: MixedArrayMetadata = {
      array: [null, undefined, null],
      builderIndices: new Set(),
      objectIndices: new Set(),
    };

    (
      storage as unknown as { mixedArrays: Map<string, MixedArrayMetadata> }
    ).mixedArrays = new Map([["values", mixedArrayMeta]]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    expect(result.values).toEqual([]);
  });

  test("handles deeply nested objects in array", () => {
    const storage = new ValueStorage<{ values: unknown[] }>();
    const builder = createMockBuilder({ id: "1", type: "text" });

    const nestedObject = {
      nested: {
        deep: {
          builder,
        },
      },
    };

    storage.set("values", [nestedObject]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveMixedArrays(storage, result, context);

    expect(result.values).toBeInstanceOf(Array);
    expect((result.values as unknown[]).length).toBe(1);
  });
});
