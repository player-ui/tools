import { describe, test, expect, beforeEach, vi } from "vitest";
import type { BaseBuildContext } from "../types";
import { StorageKeys } from "../types";
import { AuxiliaryStorage } from "../storage/auxiliary-storage";
import { resolveTemplates } from "../resolution/steps/templates";

describe("resolveTemplates", () => {
  let auxiliaryStorage: AuxiliaryStorage;

  beforeEach(() => {
    auxiliaryStorage = new AuxiliaryStorage();
    vi.clearAllMocks();
  });

  test("returns early when no templates in storage", () => {
    const result: Record<string, unknown> = { existingValue: "test" };
    const context: BaseBuildContext = { parentId: "parent" };

    resolveTemplates(auxiliaryStorage, result, context);

    expect(result).toEqual({ existingValue: "test" });
    expect(result.template).toBeUndefined();
  });

  test("returns early when empty templates array in storage", () => {
    auxiliaryStorage.set(StorageKeys.TEMPLATES, []);

    const result: Record<string, unknown> = { existingValue: "test" };
    const context: BaseBuildContext = { parentId: "parent" };

    resolveTemplates(auxiliaryStorage, result, context);

    expect(result).toEqual({ existingValue: "test" });
    expect(result.template).toBeUndefined();
  });

  test("warns in non-production when templates exist but no context", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const templateFn = vi.fn(() => ({
      data: "list.items",
      output: "values",
      value: { asset: { id: "test", type: "text" } },
    }));

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [templateFn]);

    const result: Record<string, unknown> = {};

    resolveTemplates(auxiliaryStorage, result, undefined);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("template(s) exist but no context provided"),
    );
    expect(templateFn).not.toHaveBeenCalled();
    expect(result.template).toBeUndefined();

    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  test("does not warn in production when no context", () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const templateFn = vi.fn(() => ({
      data: "list.items",
      output: "values",
      value: { asset: { id: "test", type: "text" } },
    }));

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [templateFn]);

    const result: Record<string, unknown> = {};

    resolveTemplates(auxiliaryStorage, result, undefined);

    expect(warnSpy).not.toHaveBeenCalled();
    expect(templateFn).not.toHaveBeenCalled();

    warnSpy.mockRestore();
    process.env.NODE_ENV = originalEnv;
  });

  test("calls each template function with context", () => {
    const templateFn1 = vi.fn((ctx: BaseBuildContext) => ({
      data: "list.items",
      output: "values",
      value: { asset: { id: `${ctx.parentId}-template1`, type: "text" } },
    }));

    const templateFn2 = vi.fn((ctx: BaseBuildContext) => ({
      data: "list.other",
      output: "others",
      value: { asset: { id: `${ctx.parentId}-template2`, type: "text" } },
    }));

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [templateFn1, templateFn2]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveTemplates(auxiliaryStorage, result, context);

    expect(templateFn1).toHaveBeenCalledWith(context);
    expect(templateFn2).toHaveBeenCalledWith(context);
  });

  test("adds resolved templates to result.template array", () => {
    const template1 = {
      data: "list.items",
      output: "values",
      value: { asset: { id: "test1", type: "text" } },
    };

    const template2 = {
      data: "list.other",
      output: "others",
      value: { asset: { id: "test2", type: "text" } },
    };

    const templateFn1 = vi.fn(() => template1);
    const templateFn2 = vi.fn(() => template2);

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [templateFn1, templateFn2]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveTemplates(auxiliaryStorage, result, context);

    expect(result.template).toEqual([template1, template2]);
  });

  test("handles multiple templates in correct order", () => {
    const callOrder: number[] = [];

    const templateFn1 = vi.fn(() => {
      callOrder.push(1);
      return { data: "first", output: "first", value: {} };
    });

    const templateFn2 = vi.fn(() => {
      callOrder.push(2);
      return { data: "second", output: "second", value: {} };
    });

    const templateFn3 = vi.fn(() => {
      callOrder.push(3);
      return { data: "third", output: "third", value: {} };
    });

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [
      templateFn1,
      templateFn2,
      templateFn3,
    ]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveTemplates(auxiliaryStorage, result, context);

    expect(callOrder).toEqual([1, 2, 3]);
    expect(result.template).toHaveLength(3);

    const templates = result.template as Array<{ data: string }>;
    expect(templates[0].data).toBe("first");
    expect(templates[1].data).toBe("second");
    expect(templates[2].data).toBe("third");
  });

  test("preserves existing result properties", () => {
    const templateFn = vi.fn(() => ({
      data: "list.items",
      output: "values",
      value: { asset: { id: "test", type: "text" } },
    }));

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [templateFn]);

    const result: Record<string, unknown> = {
      id: "existing-id",
      type: "existing-type",
      customProp: { nested: "value" },
    };
    const context: BaseBuildContext = { parentId: "parent" };

    resolveTemplates(auxiliaryStorage, result, context);

    expect(result.id).toBe("existing-id");
    expect(result.type).toBe("existing-type");
    expect(result.customProp).toEqual({ nested: "value" });
    expect(result.template).toBeDefined();
  });

  test("handles template function that returns dynamic content", () => {
    const templateFn = vi.fn((ctx: BaseBuildContext) => ({
      data: `data.for.${ctx.parentId}`,
      output: "dynamic",
      dynamic: true,
      value: {
        asset: {
          id: `${ctx.parentId}-_index_-text`,
          type: "text",
          value: `{{data.for.${ctx.parentId}._index_}}`,
        },
      },
    }));

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [templateFn]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "list" };

    resolveTemplates(auxiliaryStorage, result, context);

    const templates = result.template as Array<{
      data: string;
      output: string;
      dynamic: boolean;
      value: { asset: { id: string; value: string } };
    }>;

    expect(templates).toHaveLength(1);
    expect(templates[0].data).toBe("data.for.list");
    expect(templates[0].dynamic).toBe(true);
    expect(templates[0].value.asset.id).toBe("list-_index_-text");
  });

  test("handles single template", () => {
    const template = {
      data: "items",
      output: "values",
      value: { asset: { id: "item", type: "text" } },
    };

    const templateFn = vi.fn(() => template);

    auxiliaryStorage.set(StorageKeys.TEMPLATES, [templateFn]);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveTemplates(auxiliaryStorage, result, context);

    expect(result.template).toEqual([template]);
    expect((result.template as unknown[]).length).toBe(1);
  });
});
