import { describe, test, expect, beforeEach, vi } from "vitest";
import {
  createChildContext,
  createArrayItemContext,
  createTemplateContext,
  createSwitchContext,
  createRootContext,
  createCustomContext,
  validateContext,
  debugContext,
  ContextValidationError,
} from "../context";
import { globalIdRegistry } from "../../id-generator";
import type { ParentCtx, IdBranch } from "../../types";

describe("Context Helper Functions", () => {
  beforeEach(() => {
    // Reset the global registry before each test
    globalIdRegistry.reset();
  });

  describe("createChildContext", () => {
    test("creates valid child context with slot branch", () => {
      const parent: ParentCtx = { parentId: "form", branch: undefined };
      const child = createChildContext(parent, "label");

      expect(child.parentId).toBe("form");
      expect(child.branch).toEqual({ type: "slot", name: "label" });
    });

    test("chains parent IDs correctly", () => {
      const parent: ParentCtx = {
        parentId: "collection",
        branch: { type: "slot", name: "values" },
      };
      const child = createChildContext(parent, "item");

      expect(child.parentId).toBe("collection-values");
      expect(child.branch).toEqual({ type: "slot", name: "item" });
    });

    test("throws error for undefined parent", () => {
      expect(() => createChildContext(undefined as any, "slot")).toThrow(
        ContextValidationError,
      );
    });

    test("throws error for incomplete parent context", () => {
      const invalidParent = {} as ParentCtx;
      expect(() => createChildContext(invalidParent, "slot")).toThrow(
        "parent context is incomplete",
      );
    });

    test("throws error for empty slot name", () => {
      const parent: ParentCtx = { parentId: "form", branch: undefined };
      expect(() => createChildContext(parent, "")).toThrow(
        "slot name is required",
      );
    });

    test("handles complex parent contexts", () => {
      const parent: ParentCtx = {
        parentId: "app",
        branch: {
          type: "switch",
          index: 0,
          kind: "static",
        },
      };
      const child = createChildContext(parent, "content");

      expect(child.parentId).toBe("app-staticSwitch-0");
      expect(child.branch).toEqual({ type: "slot", name: "content" });
    });
  });

  describe("createArrayItemContext", () => {
    test("creates valid array item context", () => {
      const parent: ParentCtx = { parentId: "list", branch: undefined };
      const item = createArrayItemContext(parent, 0);

      expect(item.parentId).toBe("list");
      expect(item.branch).toEqual({ type: "array-item", index: 0 });
    });

    test("handles non-zero indices", () => {
      const parent: ParentCtx = { parentId: "items", branch: undefined };
      const item = createArrayItemContext(parent, 5);

      expect(item.parentId).toBe("items");
      expect(item.branch).toEqual({ type: "array-item", index: 5 });
    });

    test("chains contexts correctly", () => {
      const parent: ParentCtx = {
        parentId: "collection",
        branch: { type: "slot", name: "values" },
      };
      const item = createArrayItemContext(parent, 2);

      expect(item.parentId).toBe("collection-values");
      expect(item.branch).toEqual({ type: "array-item", index: 2 });
    });

    test("throws error for negative index", () => {
      const parent: ParentCtx = { parentId: "list", branch: undefined };
      expect(() => createArrayItemContext(parent, -1)).toThrow(
        "index must be non-negative",
      );
    });

    test("throws error for undefined parent", () => {
      expect(() => createArrayItemContext(undefined as any, 0)).toThrow(
        ContextValidationError,
      );
    });

    test("creates sequence of array items", () => {
      const parent: ParentCtx = { parentId: "list", branch: undefined };
      const items = [0, 1, 2].map((i) => createArrayItemContext(parent, i));

      expect(items[0].branch).toEqual({ type: "array-item", index: 0 });
      expect(items[1].branch).toEqual({ type: "array-item", index: 1 });
      expect(items[2].branch).toEqual({ type: "array-item", index: 2 });
    });
  });

  describe("createTemplateContext", () => {
    test("creates template context with default depth", () => {
      const parent: ParentCtx = { parentId: "container", branch: undefined };
      const template = createTemplateContext(parent);

      expect(template.parentId).toBe("container");
      expect(template.branch).toEqual({ type: "template", depth: undefined });
    });

    test("creates template context with specific depth", () => {
      const parent: ParentCtx = { parentId: "nested", branch: undefined };
      const template = createTemplateContext(parent, 2);

      expect(template.parentId).toBe("nested");
      expect(template.branch).toEqual({ type: "template", depth: 2 });
    });

    test("handles depth 0 as undefined", () => {
      const parent: ParentCtx = { parentId: "root", branch: undefined };
      const template = createTemplateContext(parent, 0);

      expect(template.branch).toEqual({ type: "template", depth: undefined });
    });

    test("chains template contexts", () => {
      const parent: ParentCtx = {
        parentId: "list",
        branch: { type: "template", depth: 0 },
      };
      const nested = createTemplateContext(parent, 1);

      expect(nested.parentId).toBe("list-_index_");
      expect(nested.branch).toEqual({ type: "template", depth: 1 });
    });

    test("throws error for undefined parent", () => {
      expect(() => createTemplateContext(undefined as any)).toThrow(
        ContextValidationError,
      );
    });
  });

  describe("createSwitchContext", () => {
    test("creates static switch context", () => {
      const parent: ParentCtx = { parentId: "content", branch: undefined };
      const switchCtx = createSwitchContext(parent, 0, false);

      expect(switchCtx.parentId).toBe("content");
      expect(switchCtx.branch).toEqual({
        type: "switch",
        index: 0,
        kind: "static",
      });
    });

    test("creates dynamic switch context", () => {
      const parent: ParentCtx = { parentId: "content", branch: undefined };
      const switchCtx = createSwitchContext(parent, 1, true);

      expect(switchCtx.parentId).toBe("content");
      expect(switchCtx.branch).toEqual({
        type: "switch",
        index: 1,
        kind: "dynamic",
      });
    });

    test("defaults to static switch", () => {
      const parent: ParentCtx = { parentId: "content", branch: undefined };
      const switchCtx = createSwitchContext(parent, 0);

      expect(switchCtx.branch?.kind).toBe("static");
    });

    test("chains switch contexts", () => {
      const parent: ParentCtx = {
        parentId: "page",
        branch: { type: "slot", name: "body" },
      };
      const switchCtx = createSwitchContext(parent, 2, true);

      expect(switchCtx.parentId).toBe("page-body");
      expect(switchCtx.branch).toEqual({
        type: "switch",
        index: 2,
        kind: "dynamic",
      });
    });

    test("throws error for negative index", () => {
      const parent: ParentCtx = { parentId: "content", branch: undefined };
      expect(() => createSwitchContext(parent, -1)).toThrow(
        "index must be non-negative",
      );
    });
  });

  describe("createRootContext", () => {
    test("creates root context with given ID", () => {
      const root = createRootContext("my-app");

      expect(root.parentId).toBe("my-app");
      expect(root.branch).toBeUndefined();
    });

    test("throws error for empty root ID", () => {
      expect(() => createRootContext("")).toThrow("root ID is required");
    });

    test("works with complex IDs", () => {
      const root = createRootContext("app-v2.0-beta");

      expect(root.parentId).toBe("app-v2.0-beta");
      expect(root.branch).toBeUndefined();
    });
  });

  describe("createCustomContext", () => {
    test("creates context with custom branch", () => {
      const parent: ParentCtx = { parentId: "base", branch: undefined };
      const customBranch: IdBranch = { type: "custom" };
      const custom = createCustomContext(parent, customBranch);

      expect(custom.parentId).toBe("base");
      expect(custom.branch).toEqual({ type: "custom" });
    });

    test("preserves complex custom branches", () => {
      const parent: ParentCtx = { parentId: "base", branch: undefined };
      const complexBranch: IdBranch = {
        type: "slot",
        name: "special",
      };
      const custom = createCustomContext(parent, complexBranch);

      expect(custom.branch).toEqual(complexBranch);
    });

    test("chains custom contexts", () => {
      const parent: ParentCtx = {
        parentId: "app",
        branch: { type: "custom" },
      };
      const customBranch: IdBranch = { type: "slot", name: "content" };
      const custom = createCustomContext(parent, customBranch);

      expect(custom.parentId).toBe("app");
      expect(custom.branch).toEqual(customBranch);
    });

    test("throws error for undefined parent", () => {
      const branch: IdBranch = { type: "custom" };
      expect(() => createCustomContext(undefined as any, branch)).toThrow(
        ContextValidationError,
      );
    });
  });

  describe("validateContext", () => {
    test("validates correct context", () => {
      const ctx: ParentCtx = {
        parentId: "valid",
        branch: { type: "slot", name: "test" },
      };

      expect(validateContext(ctx)).toBe(true);
    });

    test("throws for undefined context", () => {
      expect(() => validateContext(undefined as any)).toThrow(
        "context is undefined",
      );
    });

    test("throws for missing parentId", () => {
      const ctx = { branch: { type: "slot", name: "test" } } as ParentCtx;
      expect(() => validateContext(ctx)).toThrow("missing parentId");
    });

    test("validates slot branch", () => {
      const ctx: ParentCtx = {
        parentId: "test",
        branch: { type: "slot", name: "valid" },
      };
      expect(validateContext(ctx)).toBe(true);

      const invalidSlot: ParentCtx = {
        parentId: "test",
        branch: { type: "slot", name: "" } as any,
      };
      expect(() => validateContext(invalidSlot)).toThrow("missing name");
    });

    test("validates array-item branch", () => {
      const validArray: ParentCtx = {
        parentId: "test",
        branch: { type: "array-item", index: 0 },
      };
      expect(validateContext(validArray)).toBe(true);

      const invalidArray: ParentCtx = {
        parentId: "test",
        branch: { type: "array-item", index: -1 },
      };
      expect(() => validateContext(invalidArray)).toThrow("invalid index");
    });

    test("validates switch branch", () => {
      const validSwitch: ParentCtx = {
        parentId: "test",
        branch: { type: "switch", index: 0, kind: "static" },
      };
      expect(validateContext(validSwitch)).toBe(true);

      const invalidKind: ParentCtx = {
        parentId: "test",
        branch: { type: "switch", index: 0, kind: "invalid" as any },
      };
      expect(() => validateContext(invalidKind)).toThrow("invalid kind");
    });

    test("validates template branch", () => {
      const validTemplate: ParentCtx = {
        parentId: "test",
        branch: { type: "template", depth: 1 },
      };
      expect(validateContext(validTemplate)).toBe(true);

      const invalidDepth: ParentCtx = {
        parentId: "test",
        branch: { type: "template", depth: -1 },
      };
      expect(() => validateContext(invalidDepth)).toThrow("invalid depth");
    });

    test("uses custom context name in errors", () => {
      expect(() => validateContext(undefined as any, "myContext")).toThrow(
        "myContext is undefined",
      );
    });
  });

  describe("debugContext", () => {
    test("logs context information in development", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "development";

      const groupSpy = vi.spyOn(console, "group").mockImplementation(() => {});
      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const groupEndSpy = vi
        .spyOn(console, "groupEnd")
        .mockImplementation(() => {});

      const ctx: ParentCtx = {
        parentId: "test",
        branch: { type: "slot", name: "debug" },
      };

      debugContext(ctx, "Test Context");

      expect(groupSpy).toHaveBeenCalledWith("Test Context");
      expect(logSpy).toHaveBeenCalledWith("Parent ID:", "test");
      expect(logSpy).toHaveBeenCalledWith("Branch Type:", "slot");
      expect(groupEndSpy).toHaveBeenCalled();

      groupSpy.mockRestore();
      logSpy.mockRestore();
      groupEndSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });

    test("does not log in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const ctx: ParentCtx = {
        parentId: "test",
        branch: undefined,
      };

      debugContext(ctx);

      expect(logSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Real-world context chaining scenarios", () => {
    test("builds complex form hierarchy", () => {
      // Form > Section > Field > Validation
      const form = createRootContext("registration-form");
      const sections = createChildContext(form, "sections");
      const section0 = createArrayItemContext(
        { parentId: sections.parentId, branch: sections.branch },
        0,
      );
      const fields = createChildContext(
        { parentId: section0.parentId, branch: section0.branch },
        "fields",
      );
      const field0 = createArrayItemContext(
        { parentId: fields.parentId, branch: fields.branch },
        0,
      );
      const validation = createChildContext(
        { parentId: field0.parentId, branch: field0.branch },
        "validation",
      );

      // Validate the chain
      expect(validation.parentId).toContain("registration-form");
      expect(validation.parentId).toContain("sections");
      expect(validation.parentId).toContain("0");
      expect(validation.parentId).toContain("fields");
    });

    test("combines templates with switches", () => {
      const root = createRootContext("dynamic-list");
      const template = createTemplateContext(root, 0);
      const switchCtx = createSwitchContext(
        { parentId: template.parentId, branch: template.branch },
        0,
        true,
      );

      expect(switchCtx.parentId).toBe("dynamic-list-_index_");
      expect(switchCtx.branch).toEqual({
        type: "switch",
        index: 0,
        kind: "dynamic",
      });
    });

    test("handles deeply nested templates", () => {
      const root = createRootContext("nested");
      const t1 = createTemplateContext(root, 0);
      const t2 = createTemplateContext(
        { parentId: t1.parentId, branch: t1.branch },
        1,
      );
      const t3 = createTemplateContext(
        { parentId: t2.parentId, branch: t2.branch },
        2,
      );

      expect(t3.parentId).toContain("_index_");
      expect(t3.parentId).toContain("_index1_");
      expect(t3.branch).toEqual({ type: "template", depth: 2 });
    });
  });
});
