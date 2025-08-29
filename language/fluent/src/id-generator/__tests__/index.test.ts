import { describe, test, expect } from "vitest";
import { genId } from "../index";
import type {
  ArrayItemBranch,
  IdBranch,
  ParentCtx,
  SlotBranch,
  SwitchBranch,
  TemplateBranch,
} from "../../types";

describe("genId", () => {
  describe("no branch (custom ID case)", () => {
    test("returns parentId when no branch is provided", () => {
      const ctx: ParentCtx = {
        parentId: "custom-id",
      };

      const result = genId(ctx);

      expect(result).toBe("custom-id");
    });

    test("returns parentId when branch is undefined", () => {
      const ctx: ParentCtx = {
        parentId: "another-custom-id",
        branch: undefined,
      };

      const result = genId(ctx);

      expect(result).toBe("another-custom-id");
    });

    test("handles empty string parentId with no branch", () => {
      const ctx: ParentCtx = {
        parentId: "",
      };

      const result = genId(ctx);

      expect(result).toBe("");
    });

    test("handles complex parentId with special characters", () => {
      const ctx: ParentCtx = {
        parentId: "parent_with-special.chars@123",
      };

      const result = genId(ctx);

      expect(result).toBe("parent_with-special.chars@123");
    });
  });

  describe("slot branch", () => {
    test("generates ID for slot with parentId", () => {
      const branch: SlotBranch = {
        type: "slot",
        name: "header",
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("parent-header");
    });

    test("generates ID for slot with empty parentId", () => {
      const branch: SlotBranch = {
        type: "slot",
        name: "footer",
      };

      const ctx: ParentCtx = {
        parentId: "",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("footer");
    });

    test("handles slot with empty name", () => {
      const branch: SlotBranch = {
        type: "slot",
        name: "",
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("parent-");
    });

    test("handles slot with special characters in name", () => {
      const branch: SlotBranch = {
        type: "slot",
        name: "slot_with-special.chars",
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("parent-slot_with-special.chars");
    });

    test("handles slot with numeric name", () => {
      const branch: SlotBranch = {
        type: "slot",
        name: "123",
      };

      const ctx: ParentCtx = {
        parentId: "parent",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("parent-123");
    });
  });

  describe("array-item branch", () => {
    test("generates ID for array item with positive index", () => {
      const branch: ArrayItemBranch = {
        type: "array-item",
        index: 2,
      };

      const ctx: ParentCtx = {
        parentId: "list",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("list-2");
    });

    test("generates ID for array item with zero index", () => {
      const branch: ArrayItemBranch = {
        type: "array-item",
        index: 0,
      };

      const ctx: ParentCtx = {
        parentId: "array",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("array-0");
    });

    test("generates ID for array item with negative index", () => {
      const branch: ArrayItemBranch = {
        type: "array-item",
        index: -1,
      };

      const ctx: ParentCtx = {
        parentId: "items",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("items--1");
    });

    test("generates ID for array item with large index", () => {
      const branch: ArrayItemBranch = {
        type: "array-item",
        index: 999999,
      };

      const ctx: ParentCtx = {
        parentId: "bigArray",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("bigArray-999999");
    });

    test("handles array item with empty parentId", () => {
      const branch: ArrayItemBranch = {
        type: "array-item",
        index: 5,
      };

      const ctx: ParentCtx = {
        parentId: "",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("-5");
    });
  });

  describe("template branch", () => {
    test("generates ID for template with depth", () => {
      const branch: TemplateBranch = {
        type: "template",
        depth: 1,
      };

      const ctx: ParentCtx = {
        parentId: "template",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("template-_index1_");
    });

    test("generates ID for template without depth (undefined)", () => {
      const branch: TemplateBranch = {
        type: "template",
      };

      const ctx: ParentCtx = {
        parentId: "template",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("template-_index_");
    });

    test("generates ID for template with zero depth", () => {
      const branch: TemplateBranch = {
        type: "template",
        depth: 0,
      };

      const ctx: ParentCtx = {
        parentId: "template",
        branch,
      };

      const result = genId(ctx);

      // Note: depth 0 is treated as falsy by the || operator, so it becomes empty string
      expect(result).toBe("template-_index_");
    });

    test("documents depth 0 vs undefined behavior (both result in empty string)", () => {
      const branchWithZero: TemplateBranch = {
        type: "template",
        depth: 0,
      };

      const branchWithUndefined: TemplateBranch = {
        type: "template",
      };

      const ctx1: ParentCtx = {
        parentId: "template",
        branch: branchWithZero,
      };

      const ctx2: ParentCtx = {
        parentId: "template",
        branch: branchWithUndefined,
      };

      const result1 = genId(ctx1);
      const result2 = genId(ctx2);

      // Both depth: 0 and depth: undefined result in the same output
      // due to the || operator treating 0 as falsy
      expect(result1).toBe("template-_index_");
      expect(result2).toBe("template-_index_");
      expect(result1).toBe(result2);
    });

    test("generates ID for template with negative depth", () => {
      const branch: TemplateBranch = {
        type: "template",
        depth: -2,
      };

      const ctx: ParentCtx = {
        parentId: "template",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("template-_index-2_");
    });

    test("generates ID for template with large depth", () => {
      const branch: TemplateBranch = {
        type: "template",
        depth: 100,
      };

      const ctx: ParentCtx = {
        parentId: "deepTemplate",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("deepTemplate-_index100_");
    });

    test("handles template with empty parentId", () => {
      const branch: TemplateBranch = {
        type: "template",
        depth: 3,
      };

      const ctx: ParentCtx = {
        parentId: "",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("-_index3_");
    });
  });

  describe("switch branch", () => {
    test("generates ID for static switch", () => {
      const branch: SwitchBranch = {
        type: "switch",
        index: 0,
        kind: "static",
      };

      const ctx: ParentCtx = {
        parentId: "condition",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("condition-staticSwitch-0");
    });

    test("generates ID for dynamic switch", () => {
      const branch: SwitchBranch = {
        type: "switch",
        index: 1,
        kind: "dynamic",
      };

      const ctx: ParentCtx = {
        parentId: "condition",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("condition-dynamicSwitch-1");
    });

    test("generates ID for switch with zero index", () => {
      const branch: SwitchBranch = {
        type: "switch",
        index: 0,
        kind: "dynamic",
      };

      const ctx: ParentCtx = {
        parentId: "switch",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("switch-dynamicSwitch-0");
    });

    test("generates ID for switch with negative index", () => {
      const branch: SwitchBranch = {
        type: "switch",
        index: -1,
        kind: "static",
      };

      const ctx: ParentCtx = {
        parentId: "negativeSwitch",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("negativeSwitch-staticSwitch--1");
    });

    test("generates ID for switch with large index", () => {
      const branch: SwitchBranch = {
        type: "switch",
        index: 9999,
        kind: "dynamic",
      };

      const ctx: ParentCtx = {
        parentId: "bigSwitch",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("bigSwitch-dynamicSwitch-9999");
    });

    test("handles switch with empty parentId", () => {
      const branch: SwitchBranch = {
        type: "switch",
        index: 2,
        kind: "static",
      };

      const ctx: ParentCtx = {
        parentId: "",
        branch,
      };

      const result = genId(ctx);

      expect(result).toBe("-staticSwitch-2");
    });
  });

  describe("error handling", () => {
    test("throws error for unknown branch type", () => {
      // Create an invalid branch type by casting
      const invalidBranch = {
        type: "unknown",
        someProperty: "value",
      } as unknown as IdBranch;

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: invalidBranch,
      };

      expect(() => genId(ctx)).toThrow("Unhandled branch type:");
    });

    test("error message includes the invalid branch object", () => {
      const invalidBranch = {
        type: "invalid-type",
        data: "test",
      } as unknown as IdBranch;

      const ctx: ParentCtx = {
        parentId: "parent",
        branch: invalidBranch,
      };

      expect(() => genId(ctx)).toThrow(
        "Unhandled branch type: [object Object]",
      );
    });
  });

  describe("edge cases and integration", () => {
    test("handles complex parentId with all branch types", () => {
      const complexParentId = "complex_parent-with.special@chars123";

      const testCases = [
        {
          branch: { type: "slot", name: "test" } as SlotBranch,
          expected: "complex_parent-with.special@chars123-test",
        },
        {
          branch: { type: "array-item", index: 5 } as ArrayItemBranch,
          expected: "complex_parent-with.special@chars123-5",
        },
        {
          branch: { type: "template", depth: 2 } as TemplateBranch,
          expected: "complex_parent-with.special@chars123-_index2_",
        },
        {
          branch: {
            type: "switch",
            index: 3,
            kind: "static",
          } as SwitchBranch,
          expected: "complex_parent-with.special@chars123-staticSwitch-3",
        },
      ];

      testCases.forEach(({ branch, expected }) => {
        const ctx: ParentCtx = {
          parentId: complexParentId,
          branch,
        };

        const result = genId(ctx);
        expect(result).toBe(expected);
      });
    });

    test("handles all branch types with empty parentId", () => {
      const testCases = [
        {
          branch: { type: "slot", name: "empty" } as SlotBranch,
          expected: "empty",
        },
        {
          branch: { type: "array-item", index: 0 } as ArrayItemBranch,
          expected: "-0",
        },
        {
          branch: { type: "template", depth: 1 } as TemplateBranch,
          expected: "-_index1_",
        },
        {
          branch: {
            type: "switch",
            index: 0,
            kind: "dynamic",
          } as SwitchBranch,
          expected: "-dynamicSwitch-0",
        },
      ];

      testCases.forEach(({ branch, expected }) => {
        const ctx: ParentCtx = {
          parentId: "",
          branch,
        };

        const result = genId(ctx);
        expect(result).toBe(expected);
      });
    });

    test("maintains consistency across multiple calls with same input", () => {
      const ctx: ParentCtx = {
        parentId: "consistent",
        branch: { type: "slot", name: "test" },
      };

      const result1 = genId(ctx);
      const result2 = genId(ctx);
      const result3 = genId(ctx);

      expect(result1).toBe("consistent-test");
      expect(result2).toBe("consistent-test");
      expect(result3).toBe("consistent-test");
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    test("generates different IDs for different contexts", () => {
      const contexts = [
        {
          parentId: "parent1",
          branch: { type: "slot", name: "slot1" } as SlotBranch,
        },
        {
          parentId: "parent2",
          branch: { type: "slot", name: "slot1" } as SlotBranch,
        },
        {
          parentId: "parent1",
          branch: { type: "slot", name: "slot2" } as SlotBranch,
        },
        {
          parentId: "parent1",
          branch: { type: "array-item", index: 0 } as ArrayItemBranch,
        },
      ];

      const results = contexts.map((ctx) => genId(ctx));

      // All results should be unique
      const uniqueResults = new Set(results);
      expect(uniqueResults.size).toBe(results.length);

      expect(results).toEqual([
        "parent1-slot1",
        "parent2-slot1",
        "parent1-slot2",
        "parent1-0",
      ]);
    });
  });

  describe("type safety and interface compliance", () => {
    test("accepts all valid IdBranch types", () => {
      const branches: IdBranch[] = [
        { type: "slot", name: "test" },
        { type: "array-item", index: 0 },
        { type: "template", depth: 1 },
        { type: "template" }, // depth is optional
        { type: "switch", index: 0, kind: "static" },
        { type: "switch", index: 1, kind: "dynamic" },
      ];

      branches.forEach((branch) => {
        const ctx: ParentCtx = {
          parentId: "test",
          branch,
        };

        // Should not throw and should return a string
        const result = genId(ctx);
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
      });
    });

    test("ParentCtx interface works with optional branch", () => {
      // Test that ParentCtx works with just parentId
      const ctx1: ParentCtx = {
        parentId: "test",
      };

      // Test that ParentCtx works with parentId and branch
      const ctx2: ParentCtx = {
        parentId: "test",
        branch: { type: "slot", name: "test" },
      };

      expect(() => genId(ctx1)).not.toThrow();
      expect(() => genId(ctx2)).not.toThrow();
    });
  });
});
