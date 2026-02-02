import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  IDRegistry,
  createIdRegistry,
  globalIdRegistry,
  genId,
} from "../id/generator";
import { BaseBuildContext } from "../types";

describe("IDRegistry", () => {
  let registry: IDRegistry;

  beforeEach(() => {
    registry = new IDRegistry();
  });

  describe("ensureUnique", () => {
    test("returns original ID when no collision", () => {
      const id = registry.ensureUnique("test-id");
      expect(id).toBe("test-id");
    });

    test("appends counter when collision detected", () => {
      const id1 = registry.ensureUnique("duplicate");
      const id2 = registry.ensureUnique("duplicate");
      const id3 = registry.ensureUnique("duplicate");

      expect(id1).toBe("duplicate");
      expect(id2).toBe("duplicate-1");
      expect(id3).toBe("duplicate-2");
    });

    test("handles complex ID patterns", () => {
      const id1 = registry.ensureUnique("parent-slot-child");
      const id2 = registry.ensureUnique("parent-slot-child");

      expect(id1).toBe("parent-slot-child");
      expect(id2).toBe("parent-slot-child-1");
    });

    test("maintains separate counters for different base IDs", () => {
      registry.ensureUnique("id-a");
      registry.ensureUnique("id-a"); // id-a-1
      registry.ensureUnique("id-b");
      registry.ensureUnique("id-a"); // id-a-2
      registry.ensureUnique("id-b"); // id-b-1

      expect(registry.ensureUnique("id-a")).toBe("id-a-3");
      expect(registry.ensureUnique("id-b")).toBe("id-b-2");
    });

    test("handles empty string IDs", () => {
      const id1 = registry.ensureUnique("");
      const id2 = registry.ensureUnique("");

      expect(id1).toBe("");
      expect(id2).toBe("-1");
    });

    test("returns ID as-is when registry is disabled", () => {
      registry.setEnabled(false);

      const id1 = registry.ensureUnique("test");
      const id2 = registry.ensureUnique("test");

      expect(id1).toBe("test");
      expect(id2).toBe("test"); // No collision detection
    });

    test("allows template placeholder IDs as duplicates", () => {
      const id1 = registry.ensureUnique("parent-_index_");
      const id2 = registry.ensureUnique("parent-_index_");
      const id3 = registry.ensureUnique("parent-_index1_");
      const id4 = registry.ensureUnique("parent-_row_");

      // Template placeholders should not trigger collision detection
      expect(id1).toBe("parent-_index_");
      expect(id2).toBe("parent-_index_");
      expect(id3).toBe("parent-_index1_");
      expect(id4).toBe("parent-_row_");
    });

    test("enforces uniqueness for non-template IDs with similar patterns", () => {
      const id1 = registry.ensureUnique("parent-_index_-field");
      const id2 = registry.ensureUnique("parent-_index_-field");
      const id3 = registry.ensureUnique("parent-something");
      const id4 = registry.ensureUnique("parent-something");

      // Non-template IDs should still enforce uniqueness
      expect(id1).toBe("parent-_index_-field");
      expect(id2).toBe("parent-_index_-field-1");
      expect(id3).toBe("parent-something");
      expect(id4).toBe("parent-something-1");
    });
  });

  describe("has", () => {
    test("returns false for unregistered IDs", () => {
      expect(registry.has("unknown")).toBe(false);
    });

    test("returns true for registered IDs", () => {
      registry.ensureUnique("known");
      expect(registry.has("known")).toBe(true);
    });

    test("tracks modified IDs", () => {
      registry.ensureUnique("base");
      registry.ensureUnique("base"); // Creates "base-1"

      expect(registry.has("base")).toBe(true);
      expect(registry.has("base-1")).toBe(true);
      expect(registry.has("base-2")).toBe(false);
    });
  });

  describe("reset", () => {
    test("clears all registered IDs", () => {
      registry.ensureUnique("id1");
      registry.ensureUnique("id2");
      registry.ensureUnique("id3");

      expect(registry.size()).toBe(3);

      registry.reset();

      expect(registry.size()).toBe(0);
      expect(registry.has("id1")).toBe(false);
    });

    test("allows reuse of IDs after reset", () => {
      registry.ensureUnique("reusable");
      registry.ensureUnique("reusable"); // Would be "reusable-1"

      registry.reset();

      const id2 = registry.ensureUnique("reusable");
      expect(id2).toBe("reusable"); // Not "reusable-2"
    });
  });

  describe("size", () => {
    test("returns 0 for empty registry", () => {
      expect(registry.size()).toBe(0);
    });

    test("counts unique registered IDs", () => {
      registry.ensureUnique("a");
      registry.ensureUnique("b");
      registry.ensureUnique("a"); // Creates "a-1"

      expect(registry.size()).toBe(3);
    });
  });

  describe("getRegisteredIds", () => {
    test("returns empty array for empty registry", () => {
      expect(registry.getRegisteredIds()).toEqual([]);
    });

    test("returns all registered IDs", () => {
      registry.ensureUnique("first");
      registry.ensureUnique("second");
      registry.ensureUnique("first"); // Creates "first-1"

      const ids = registry.getRegisteredIds();
      expect(ids).toContain("first");
      expect(ids).toContain("second");
      expect(ids).toContain("first-1");
      expect(ids).toHaveLength(3);
    });
  });
});

describe("createIdRegistry", () => {
  test("creates independent registry instances", () => {
    const registry1 = createIdRegistry();
    const registry2 = createIdRegistry();

    registry1.ensureUnique("shared");

    // registry2 should not know about registry1's IDs
    const id = registry2.ensureUnique("shared");
    expect(id).toBe("shared");
  });

  test("respects enabled parameter", () => {
    const disabled = createIdRegistry(false);

    const id1 = disabled.ensureUnique("test");
    const id2 = disabled.ensureUnique("test");

    expect(id1).toBe("test");
    expect(id2).toBe("test");
  });
});

describe("genId with IDRegistry integration", () => {
  beforeEach(() => {
    // Reset the global registry before each test
    globalIdRegistry.reset();
    globalIdRegistry.setEnabled(true);
  });

  test("prevents ID collisions in slot branches", () => {
    const ctx1: BaseBuildContext = {
      parentId: "form",
      branch: { type: "slot", name: "label" },
    };

    const ctx2: BaseBuildContext = {
      parentId: "form",
      branch: { type: "slot", name: "label" },
    };

    const id1 = genId(ctx1);
    const id2 = genId(ctx2);

    expect(id1).toBe("form-label");
    expect(id2).toBe("form-label-1");
  });

  test("prevents collisions across different branch types", () => {
    // These contexts would generate the same base ID
    const slotCtx: BaseBuildContext = {
      parentId: "parent",
      branch: { type: "slot", name: "0" },
    };

    const arrayCtx: BaseBuildContext = {
      parentId: "parent",
      branch: { type: "array-item", index: 0 },
    };

    const id1 = genId(slotCtx);
    const id2 = genId(arrayCtx);

    expect(id1).toBe("parent-0");
    expect(id2).toBe("parent-0-1");
  });

  test("handles complex nested contexts", () => {
    const ctx1: BaseBuildContext = {
      parentId: "collection-values-0",
      branch: { type: "slot", name: "label" },
    };

    const ctx2: BaseBuildContext = {
      parentId: "collection-values-0",
      branch: { type: "slot", name: "label" },
    };

    const id1 = genId(ctx1);
    const id2 = genId(ctx2);

    expect(id1).toBe("collection-values-0-label");
    expect(id2).toBe("collection-values-0-label-1");
  });

  test("warns about collisions in development", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const ctx: BaseBuildContext = {
      parentId: "test",
      branch: { type: "slot", name: "slot" },
    };

    genId(ctx);
    genId(ctx); // Should trigger collision warning

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("ID collision detected"),
    );

    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  test("allows template placeholders as duplicates", () => {
    const templateCtx1: BaseBuildContext = {
      parentId: "list",
      branch: { type: "template", depth: 0 },
    };

    const templateCtx2: BaseBuildContext = {
      parentId: "list",
      branch: { type: "template", depth: 0 },
    };

    const id1 = genId(templateCtx1);
    const id2 = genId(templateCtx2);

    // Template placeholders should be allowed as duplicates
    expect(id1).toBe("list-_index_");
    expect(id2).toBe("list-_index_"); // Should be the same, not "list-_index_-1"
  });

  test("handles switch branches with collision detection", () => {
    const switchCtx1: BaseBuildContext = {
      parentId: "condition",
      branch: { type: "switch", index: 0, kind: "static" },
    };

    const switchCtx2: BaseBuildContext = {
      parentId: "condition",
      branch: { type: "switch", index: 0, kind: "static" },
    };

    const id1 = genId(switchCtx1);
    const id2 = genId(switchCtx2);

    expect(id1).toBe("condition-staticSwitch-0");
    expect(id2).toBe("condition-staticSwitch-0-1");
  });
});

describe("ID Registry with real-world scenarios", () => {
  beforeEach(() => {
    globalIdRegistry.reset();
  });

  test("collection with duplicate slot names", () => {
    // Simulates a collection with multiple items having the same structure
    const contexts = [
      {
        parentId: "collection",
        branch: { type: "slot" as const, name: "values" },
      },
      {
        parentId: "collection-values",
        branch: { type: "array-item" as const, index: 0 },
      },
      {
        parentId: "collection-values-0",
        branch: { type: "slot" as const, name: "label" },
      },
      {
        parentId: "collection-values",
        branch: { type: "array-item" as const, index: 1 },
      },
      {
        parentId: "collection-values-1",
        branch: { type: "slot" as const, name: "label" },
      },
    ];

    const ids = contexts.map((ctx) => genId(ctx as BaseBuildContext));

    // All IDs should be unique
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  test("deeply nested components with potential collisions", () => {
    // Form > Section > Field > Validation > Error
    const deepNesting: BaseBuildContext[] = [
      { parentId: "form", branch: { type: "slot", name: "sections" } },
      { parentId: "form-sections", branch: { type: "array-item", index: 0 } },
      { parentId: "form-sections-0", branch: { type: "slot", name: "fields" } },
      {
        parentId: "form-sections-0-fields",
        branch: { type: "array-item", index: 0 },
      },
      {
        parentId: "form-sections-0-fields-0",
        branch: { type: "slot", name: "validation" },
      },
      {
        parentId: "form-sections-0-fields-0-validation",
        branch: { type: "slot", name: "error" },
      },
      // Duplicate path (e.g., from a template)
      {
        parentId: "form-sections-0-fields-0-validation",
        branch: { type: "slot", name: "error" },
      },
    ];

    const ids = deepNesting.map((ctx) => genId(ctx));
    const lastTwo = ids.slice(-2);

    expect(lastTwo[0]).toBe("form-sections-0-fields-0-validation-error");
    expect(lastTwo[1]).toBe("form-sections-0-fields-0-validation-error-1");
  });

  test("mixed static and dynamic content", () => {
    const contexts: BaseBuildContext[] = [
      // Static content
      { parentId: "page", branch: { type: "slot", name: "header" } },
      // Dynamic switch
      {
        parentId: "page",
        branch: { type: "switch", index: 0, kind: "dynamic" },
      },
      // Template-generated content
      { parentId: "page", branch: { type: "template", depth: 0 } },
      // Another header (collision with first)
      { parentId: "page", branch: { type: "slot", name: "header" } },
    ];

    const ids = contexts.map((ctx) => genId(ctx));

    expect(ids[0]).toBe("page-header");
    expect(ids[1]).toBe("page-dynamicSwitch-0");
    expect(ids[2]).toBe("page-_index_");
    expect(ids[3]).toBe("page-header-1");
  });
});

describe("Template Placeholder Handling", () => {
  let registry: IDRegistry;

  beforeEach(() => {
    registry = new IDRegistry();
  });

  test("allows duplicate IDs ending with _index_", () => {
    const id1 = registry.ensureUnique("list-_index_");
    const id2 = registry.ensureUnique("list-_index_");
    const id3 = registry.ensureUnique("list-_index_");

    expect(id1).toBe("list-_index_");
    expect(id2).toBe("list-_index_");
    expect(id3).toBe("list-_index_");
  });

  test("allows duplicate IDs ending with _index1_", () => {
    const id1 = registry.ensureUnique("nested-_index1_");
    const id2 = registry.ensureUnique("nested-_index1_");

    expect(id1).toBe("nested-_index1_");
    expect(id2).toBe("nested-_index1_");
  });

  test("allows duplicate IDs ending with _row_", () => {
    const id1 = registry.ensureUnique("table-_row_");
    const id2 = registry.ensureUnique("table-_row_");

    expect(id1).toBe("table-_row_");
    expect(id2).toBe("table-_row_");
  });

  test("allows duplicate IDs ending with _item_", () => {
    const id1 = registry.ensureUnique("list-_item_");
    const id2 = registry.ensureUnique("list-_item_");

    expect(id1).toBe("list-_item_");
    expect(id2).toBe("list-_item_");
  });

  test("enforces uniqueness for IDs with placeholder in middle", () => {
    const id1 = registry.ensureUnique("list-_index_-field");
    const id2 = registry.ensureUnique("list-_index_-field");

    // Should enforce uniqueness because placeholder is not at the end
    expect(id1).toBe("list-_index_-field");
    expect(id2).toBe("list-_index_-field-1");
  });

  test("enforces uniqueness for IDs with _index prefix but not template placeholder", () => {
    // _index is not a valid placeholder, only _index_ is
    const id1 = registry.ensureUnique("list-_index");
    const id2 = registry.ensureUnique("list-_index");

    expect(id1).toBe("list-_index");
    expect(id2).toBe("list-_index-1");
  });
});

describe("Registry Edge Cases", () => {
  let registry: IDRegistry;

  beforeEach(() => {
    registry = new IDRegistry();
  });

  test("handles IDs with special characters", () => {
    const id1 = registry.ensureUnique("id-with-special/chars");
    const id2 = registry.ensureUnique("id-with-special/chars");

    expect(id1).toBe("id-with-special/chars");
    expect(id2).toBe("id-with-special/chars-1");
  });

  test("handles very long IDs", () => {
    const longId = "a".repeat(500);
    const id1 = registry.ensureUnique(longId);
    const id2 = registry.ensureUnique(longId);

    expect(id1).toBe(longId);
    expect(id2).toBe(longId + "-1");
  });

  test("setEnabled(false) bypasses all checks", () => {
    registry.setEnabled(false);

    const id1 = registry.ensureUnique("test");
    const id2 = registry.ensureUnique("test");
    const id3 = registry.ensureUnique("test");

    expect(id1).toBe("test");
    expect(id2).toBe("test");
    expect(id3).toBe("test");

    // Also should not track them
    registry.setEnabled(true);
    const id4 = registry.ensureUnique("test");
    expect(id4).toBe("test"); // First unique since registry was disabled
  });

  test("handles numeric-looking IDs", () => {
    const id1 = registry.ensureUnique("123");
    const id2 = registry.ensureUnique("123");

    expect(id1).toBe("123");
    expect(id2).toBe("123-1");
  });

  test("handles IDs with hyphens that look like collision suffixes", () => {
    // First register "test-1" as a base ID
    const id1 = registry.ensureUnique("test-1");
    // Try to register "test" which would normally get "-1" suffix
    const id2 = registry.ensureUnique("test");
    const id3 = registry.ensureUnique("test");

    expect(id1).toBe("test-1");
    expect(id2).toBe("test");
    // The registry uses a simple counter per base ID, so "test" -> "test-2" (not "test-1-1")
    expect(id3).toBe("test-2");
  });
});
