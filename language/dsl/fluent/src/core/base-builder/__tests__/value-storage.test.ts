import { describe, test, expect, beforeEach, vi } from "vitest";
import type { BaseBuildContext, FluentBuilder } from "../types";
import { FLUENT_BUILDER_SYMBOL } from "../types";
import { ValueStorage } from "../storage/value-storage";

// Create a mock builder that satisfies the FluentBuilder interface
function createMockBuilder<T>(
  buildResult: T,
): FluentBuilder<T, BaseBuildContext> {
  return {
    [FLUENT_BUILDER_SYMBOL]: true as const,
    build: vi.fn(() => buildResult),
  } as unknown as FluentBuilder<T, BaseBuildContext>;
}

interface TestType {
  value?: string;
  count?: number;
  items?: string[];
  label?: string;
  nested?: { deep: string };
  builder?: { id: string };
  mixedArray?: unknown[];
}

describe("ValueStorage - set() Routing", () => {
  let storage: ValueStorage<TestType>;

  beforeEach(() => {
    storage = new ValueStorage<TestType>();
  });

  test("routes FluentBuilder to builders Map", () => {
    const builder = createMockBuilder({ id: "test", type: "text" });

    storage.set("builder", builder);

    expect(storage.getValueType("builder")).toBe("builder");
    expect(storage.getBuilders().has("builder")).toBe(true);
    expect(storage.peek("builder")).toBeUndefined();
    expect(storage.peekBuilder("builder")).toBeDefined();
  });

  test("routes arrays with builders to mixedArrays Map", () => {
    const builder = createMockBuilder({ id: "test", type: "text" });

    storage.set("mixedArray", [builder, "static"]);

    expect(storage.getValueType("mixedArray")).toBe("mixed-array");
    expect(storage.getMixedArrays().has("mixedArray")).toBe(true);
  });

  test("routes objects containing builders to builders Map", () => {
    const builder = createMockBuilder({ id: "test", type: "text" });
    const objWithBuilder = { asset: builder };

    storage.set("nested", objWithBuilder as unknown as { deep: string });

    expect(storage.getValueType("nested")).toBe("builder");
    expect(storage.getBuilders().has("nested")).toBe(true);
  });

  test("routes static values to values object", () => {
    storage.set("value", "hello");
    storage.set("count", 42);
    storage.set("items", ["a", "b", "c"]);
    storage.set("nested", { deep: "value" });

    expect(storage.getValueType("value")).toBe("static");
    expect(storage.getValueType("count")).toBe("static");
    expect(storage.getValueType("items")).toBe("static");
    expect(storage.getValueType("nested")).toBe("static");

    expect(storage.peek("value")).toBe("hello");
    expect(storage.peek("count")).toBe(42);
    expect(storage.peek("items")).toEqual(["a", "b", "c"]);
    expect(storage.peek("nested")).toEqual({ deep: "value" });
  });

  test("clears previous storage type when setting new value", () => {
    const builder = createMockBuilder({ id: "test" });

    // First set as builder
    storage.set("value", builder as unknown as string);
    expect(storage.getValueType("value")).toBe("builder");

    // Then set as static
    storage.set("value", "static");
    expect(storage.getValueType("value")).toBe("static");
    expect(storage.getBuilders().has("value")).toBe(false);

    // Then set as mixed array
    storage.set("value", [builder, "mixed"] as unknown as string);
    expect(storage.getValueType("value")).toBe("mixed-array");
    expect(storage.getValues().value).toBeUndefined();
  });
});

describe("ValueStorage - containsBuilder() Detection", () => {
  let storage: ValueStorage<TestType>;

  beforeEach(() => {
    storage = new ValueStorage<TestType>();
  });

  test("detects direct FluentBuilder", () => {
    const builder = createMockBuilder({ id: "test" });

    storage.set("builder", builder);

    expect(storage.getValueType("builder")).toBe("builder");
  });

  test("detects FluentBuilder in nested object", () => {
    const builder = createMockBuilder({ id: "test" });
    const nested = {
      level1: {
        level2: {
          builder,
        },
      },
    };

    storage.set("nested", nested as unknown as { deep: string });

    expect(storage.getValueType("nested")).toBe("builder");
  });

  test("handles circular references without infinite loop", () => {
    const obj: Record<string, unknown> = { value: "test" };
    obj.circular = obj;

    // Should not throw or hang
    expect(() => {
      storage.set("nested", obj as unknown as { deep: string });
    }).not.toThrow();
  });

  test("returns false for plain objects", () => {
    const plainObj = { a: 1, b: "string", c: [1, 2, 3] };

    storage.set("nested", plainObj as unknown as { deep: string });

    expect(storage.getValueType("nested")).toBe("static");
  });

  test("ignores objects with custom prototypes", () => {
    class CustomClass {
      value = "test";
    }
    const customInstance = new CustomClass();

    // Objects with custom prototypes are treated as static
    // (they won't be checked for nested builders)
    storage.set("nested", customInstance as unknown as { deep: string });

    expect(storage.getValueType("nested")).toBe("static");
  });
});

describe("ValueStorage - Utility Methods", () => {
  let storage: ValueStorage<TestType>;

  beforeEach(() => {
    storage = new ValueStorage<TestType>();
  });

  describe("has()", () => {
    test("returns true for values in static storage", () => {
      storage.set("value", "test");
      expect(storage.has("value")).toBe(true);
    });

    test("returns true for values in builders storage", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("builder", builder);
      expect(storage.has("builder")).toBe(true);
    });

    test("returns true for values in mixedArrays storage", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("mixedArray", [builder, "static"]);
      expect(storage.has("mixedArray")).toBe(true);
    });

    test("returns false for unset values", () => {
      expect(storage.has("value")).toBe(false);
    });
  });

  describe("peek()", () => {
    test("returns static value", () => {
      storage.set("value", "hello");
      expect(storage.peek("value")).toBe("hello");
    });

    test("returns mixed array", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("mixedArray", [builder, "static"]);
      expect(storage.peek("mixedArray")).toEqual([builder, "static"]);
    });

    test("returns undefined for builder", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("builder", builder);
      expect(storage.peek("builder")).toBeUndefined();
    });

    test("returns undefined for unset value", () => {
      expect(storage.peek("value")).toBeUndefined();
    });
  });

  describe("peekBuilder()", () => {
    test("returns builder when exists", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("builder", builder);
      expect(storage.peekBuilder("builder")).toBe(builder);
    });

    test("returns undefined when no builder", () => {
      storage.set("value", "static");
      expect(storage.peekBuilder("value")).toBeUndefined();
    });

    test("returns undefined for unset value", () => {
      expect(storage.peekBuilder("builder")).toBeUndefined();
    });

    test("returns undefined for object containing builder (not direct builder)", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("nested", { wrapper: builder } as unknown as {
        deep: string;
      });
      // peekBuilder returns the builder only if it's a direct FluentBuilder
      // If it's an object containing a builder, peekBuilder returns undefined
      expect(storage.peekBuilder("nested")).toBeUndefined();
    });
  });

  describe("getValueType()", () => {
    test("returns 'static' for static values", () => {
      storage.set("value", "test");
      expect(storage.getValueType("value")).toBe("static");
    });

    test("returns 'builder' for builders", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("builder", builder);
      expect(storage.getValueType("builder")).toBe("builder");
    });

    test("returns 'mixed-array' for mixed arrays", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("mixedArray", [builder, "static"]);
      expect(storage.getValueType("mixedArray")).toBe("mixed-array");
    });

    test("returns 'unset' for unset values", () => {
      expect(storage.getValueType("value")).toBe("unset");
    });
  });

  describe("unset()", () => {
    test("removes from static storage", () => {
      storage.set("value", "test");
      storage.unset("value");
      expect(storage.has("value")).toBe(false);
    });

    test("removes from builders storage", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("builder", builder);
      storage.unset("builder");
      expect(storage.has("builder")).toBe(false);
    });

    test("removes from mixedArrays storage", () => {
      const builder = createMockBuilder({ id: "test" });
      storage.set("mixedArray", [builder, "static"]);
      storage.unset("mixedArray");
      expect(storage.has("mixedArray")).toBe(false);
    });

    test("removes from correct storage type", () => {
      storage.set("value", "static");
      storage.unset("value");

      expect(storage.getValueType("value")).toBe("unset");
      expect(storage.getValues().value).toBeUndefined();
      expect(storage.getBuilders().has("value")).toBe(false);
      expect(storage.getMixedArrays().has("value")).toBe(false);
    });
  });
});

describe("ValueStorage - clone()", () => {
  let storage: ValueStorage<TestType>;

  beforeEach(() => {
    storage = new ValueStorage<TestType>();
  });

  test("creates independent copy of values", () => {
    storage.set("value", "original");
    storage.set("count", 42);

    const cloned = storage.clone();

    // Modify original
    storage.set("value", "modified");

    // Clone should be unchanged
    expect(cloned.peek("value")).toBe("original");
    expect(cloned.peek("count")).toBe(42);
  });

  test("creates new Sets for mixedArray indices", () => {
    const builder = createMockBuilder({ id: "test" });
    storage.set("mixedArray", [builder, "static"]);

    const cloned = storage.clone();

    // Get the mixed array metadata
    const originalMeta = storage.getMixedArrays().get("mixedArray");
    const clonedMeta = cloned.getMixedArrays().get("mixedArray");

    // Should be different Set instances
    expect(originalMeta?.builderIndices).not.toBe(clonedMeta?.builderIndices);
    expect(originalMeta?.objectIndices).not.toBe(clonedMeta?.objectIndices);

    // But should have same values
    expect([...originalMeta!.builderIndices]).toEqual([
      ...clonedMeta!.builderIndices,
    ]);
  });

  test("modifications to clone do not affect original", () => {
    storage.set("value", "original");
    const builder = createMockBuilder({ id: "test" });
    storage.set("builder", builder);

    const cloned = storage.clone();

    // Modify cloned
    cloned.set("value", "cloned-value");
    cloned.unset("builder");

    // Original should be unchanged
    expect(storage.peek("value")).toBe("original");
    expect(storage.has("builder")).toBe(true);

    // Clone should have new values
    expect(cloned.peek("value")).toBe("cloned-value");
    expect(cloned.has("builder")).toBe(false);
  });
});

describe("ValueStorage - clear()", () => {
  let storage: ValueStorage<TestType>;

  beforeEach(() => {
    storage = new ValueStorage<TestType>();
  });

  test("clears all storage types", () => {
    const builder = createMockBuilder({ id: "test" });

    storage.set("value", "static");
    storage.set("builder", builder);
    storage.set("mixedArray", [builder, "static"]);

    storage.clear();

    expect(storage.has("value")).toBe(false);
    expect(storage.has("builder")).toBe(false);
    expect(storage.has("mixedArray")).toBe(false);

    expect(storage.getValues()).toEqual({});
    expect(storage.getBuilders().size).toBe(0);
    expect(storage.getMixedArrays().size).toBe(0);
  });
});

describe("ValueStorage - Constructor", () => {
  test("initializes with empty storage", () => {
    const storage = new ValueStorage<TestType>();

    expect(storage.getValues()).toEqual({});
    expect(storage.getBuilders().size).toBe(0);
    expect(storage.getMixedArrays().size).toBe(0);
  });

  test("accepts initial values", () => {
    const initial: Partial<TestType> = {
      value: "initial",
      count: 10,
    };

    const storage = new ValueStorage<TestType>(initial);

    expect(storage.peek("value")).toBe("initial");
    expect(storage.peek("count")).toBe(10);
  });

  test("initial values are copied not referenced", () => {
    const initial: Partial<TestType> = {
      value: "initial",
    };

    const storage = new ValueStorage<TestType>(initial);

    // Modify initial object
    initial.value = "modified";

    // Storage should be unchanged
    expect(storage.peek("value")).toBe("initial");
  });
});

describe("ValueStorage - Array Handling", () => {
  let storage: ValueStorage<TestType>;

  beforeEach(() => {
    storage = new ValueStorage<TestType>();
  });

  test("static arrays go to values storage", () => {
    storage.set("items", ["a", "b", "c"]);

    expect(storage.getValueType("items")).toBe("static");
    expect(storage.peek("items")).toEqual(["a", "b", "c"]);
  });

  test("arrays with only builders go to mixedArrays", () => {
    const builder1 = createMockBuilder({ id: "1" });
    const builder2 = createMockBuilder({ id: "2" });

    storage.set("mixedArray", [builder1, builder2]);

    expect(storage.getValueType("mixedArray")).toBe("mixed-array");

    const meta = storage.getMixedArrays().get("mixedArray");
    expect(meta?.builderIndices.has(0)).toBe(true);
    expect(meta?.builderIndices.has(1)).toBe(true);
  });

  test("arrays with nested builders go to mixedArrays", () => {
    const builder = createMockBuilder({ id: "test" });
    const objWithBuilder = { wrapper: builder };

    storage.set("mixedArray", [objWithBuilder, "static"]);

    expect(storage.getValueType("mixedArray")).toBe("mixed-array");

    const meta = storage.getMixedArrays().get("mixedArray");
    expect(meta?.objectIndices.has(0)).toBe(true);
  });
});
