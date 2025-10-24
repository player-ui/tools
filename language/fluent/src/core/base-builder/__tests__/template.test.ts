import { describe, test, expect, beforeEach } from "vitest";
import type { Template, Asset } from "@player-ui/types";
import { template, isTemplate, TEMPLATE_MARKER } from "../../template";
import {
  type BaseBuildContext,
  type SlotBranch,
  resetGlobalIdSet,
} from "../index";
import { text } from "../../mocks";
import { binding as b } from "../../tagged-template";

// Mock BaseBuildContext
const mockParentCtx: BaseBuildContext = {
  parentId: "parent-1",
  branch: {
    type: "slot",
    name: "test",
  } as SlotBranch,
};

describe("template integration with base-builder", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("create a basic template configuration", () => {
    const result = template({
      data: "list.of.names",
      output: "values",
      value: text().withValue(b`list.of.names._index_`),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "list.of.names",
      output: "values",
      value: {
        asset: {
          id: "parent-1-test-_index_-text",
          type: "text",
          value: "{{list.of.names._index_}}",
        },
      },
    };

    expect(result).toEqual(expected);
  });

  test("create a template with tagged template binding", () => {
    const result = template({
      data: b`list.of.names`,
      output: "values",
      value: text().withValue(b`list.of.names._index_`),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "{{list.of.names}}",
      output: "values",
      value: {
        asset: {
          id: "parent-1-test-_index_-text",
          type: "text",
          value: "{{list.of.names._index_}}",
        },
      },
    };

    expect(result).toEqual(expected);
  });

  test("include dynamic flag when specified", () => {
    const result = template({
      data: "list.of.names",
      output: "values",
      dynamic: true,
      value: text().withValue(b`list.of.names._index_`),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "list.of.names",
      output: "values",
      dynamic: true,
      value: {
        asset: {
          id: "parent-1-test-_index_-text",
          type: "text",
          value: "{{list.of.names._index_}}",
        },
      },
    };

    expect(result).toEqual(expected);
  });

  test("not include dynamic flag when it is false", () => {
    const result = template({
      data: "list.of.names",
      output: "values",
      dynamic: false,
      value: text().withValue(b`list.of.names._index_`),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "list.of.names",
      output: "values",
      value: {
        asset: {
          id: "parent-1-test-_index_-text",
          type: "text",
          value: "{{list.of.names._index_}}",
        },
      },
    };

    expect(result).toEqual(expected);
    expect(result).not.toHaveProperty("dynamic");
  });

  test("pass the correct parent context to the value function", () => {
    let capturedParentCtx: BaseBuildContext | null = null;

    const valueWithCapture = (parentCtx: BaseBuildContext): Asset<"text"> => {
      capturedParentCtx = parentCtx;
      return {
        id: "test",
        type: "text",
        value: "test",
      };
    };

    template({
      data: "list.of.names",
      output: "values",
      value: valueWithCapture,
    })(mockParentCtx);

    expect(capturedParentCtx).toEqual({
      parentId: "parent-1-test",
      branch: {
        type: "template",
        depth: 0,
      },
    });
  });

  // Simulation of a multiple templates scenario (we test the output structure, not runtime behavior)
  test("support the structure for multiple templates with the same output property", () => {
    const template1 = template({
      data: "list.of.names",
      output: "values",
      value: text().withValue(b`list.of.names._index_`),
    })(mockParentCtx);

    const template2 = template({
      data: "list.of.other-names",
      output: "values",
      value: text().withValue(b`list.of.other-names._index_`),
    })(mockParentCtx);

    expect(template1.output).toEqual(template2.output);
    expect(template1.output).toBe("values");
  });

  // Test complex nested asset structures
  test("handle complex nested asset structures", () => {
    interface CollectionAsset extends Asset<"collection"> {
      items: Array<{ asset: Asset<"text"> }>;
    }

    const collectionAsset = (): CollectionAsset => ({
      id: "collection-_index_",
      type: "collection",
      items: [
        {
          asset: {
            id: "item-_index_-0",
            type: "text",
            value: "{{list.of.names._index_.first}}",
          },
        },
        {
          asset: {
            id: "item-_index_-1",
            type: "text",
            value: "{{list.of.names._index_.last}}",
          },
        },
      ],
    });

    const result = template({
      data: "list.of.names",
      output: "collections",
      value: collectionAsset,
    })(mockParentCtx);

    const expected: Template<{ asset: CollectionAsset }> = {
      data: "list.of.names",
      output: "collections",
      value: {
        asset: {
          id: "collection-_index_",
          type: "collection",
          items: [
            {
              asset: {
                id: "item-_index_-0",
                type: "text",
                value: "{{list.of.names._index_.first}}",
              },
            },
            {
              asset: {
                id: "item-_index_-1",
                type: "text",
                value: "{{list.of.names._index_.last}}",
              },
            },
          ],
        },
      },
    };

    expect(result).toEqual(expected);
  });

  // Test the structure for dynamic template functionality
  test("create a dynamic template that updates when data changes", () => {
    const result = template({
      data: "list.of.names",
      output: "values",
      dynamic: true,
      value: text().withValue(b`list.of.names._index_`),
    })(mockParentCtx);

    expect(result.dynamic).toBe(true);
  });
});

describe("isTemplate type guard", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("should return true for template functions", () => {
    const templateFn = template({
      data: "list.of.names",
      output: "values",
      value: text().withValue(b`list.of.names._index_`),
    });

    expect(isTemplate(templateFn)).toBe(true);
  });

  test("should return false for non-template functions", () => {
    const regularFunction = () => ({});
    const arrowFunction = () => "test";
    const objectWithFunction = { fn: () => {} };

    expect(isTemplate(regularFunction)).toBe(false);
    expect(isTemplate(arrowFunction)).toBe(false);
    expect(isTemplate(objectWithFunction.fn)).toBe(false);
  });

  test("should return false for non-functions", () => {
    const string = "not a function";
    const number = 42;
    const object = { type: "test" };
    const nullValue = null;
    const undefinedValue = undefined;

    expect(isTemplate(string)).toBe(false);
    expect(isTemplate(number)).toBe(false);
    expect(isTemplate(object)).toBe(false);
    expect(isTemplate(nullValue)).toBe(false);
    expect(isTemplate(undefinedValue)).toBe(false);
  });

  test("should have TEMPLATE_MARKER symbol on template functions", () => {
    const templateFn = template({
      data: "list.of.names",
      output: "values",
      value: text().withValue(b`list.of.names._index_`),
    });

    expect(TEMPLATE_MARKER in templateFn).toBe(true);
    expect(
      (templateFn as unknown as { [TEMPLATE_MARKER]: unknown })[
        TEMPLATE_MARKER
      ],
    ).toBe(true);
  });

  test("should not have TEMPLATE_MARKER symbol on regular functions", () => {
    const regularFunction = () => ({});

    expect(TEMPLATE_MARKER in regularFunction).toBe(false);
  });

  test("should work with template functions that have been called", () => {
    const templateFn = template({
      data: "list.of.names",
      output: "values",
      value: text().withValue(b`list.of.names._index_`),
    });

    // Call the template function
    templateFn(mockParentCtx);

    // The original function should still be identifiable as a template
    expect(isTemplate(templateFn)).toBe(true);
    expect(TEMPLATE_MARKER in templateFn).toBe(true);
  });
});

describe("template with optional output", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("should infer output from slot context", () => {
    const contextWithSlot: BaseBuildContext = {
      parentId: "parent-1",
      branch: {
        type: "slot",
        name: "values-0", // This should infer "values" as the output
      },
    };

    const templateFn = template({
      data: b`list.of.names`,
      // No output provided - should be inferred
      value: text().withValue(b`list.of.names._index_`),
    });

    const result = templateFn(contextWithSlot);

    expect(result.output).toBe("values");
    expect(result.data).toBe("{{list.of.names}}");
  });

  test("should throw error when output cannot be inferred", () => {
    const contextWithoutSlot: BaseBuildContext = {
      parentId: "parent-1",
      branch: {
        type: "template",
        depth: 0,
      },
    };

    const templateFn = template({
      data: b`list.of.names`,
      // No output provided and context doesn't allow inference
      value: text().withValue(b`list.of.names._index_`),
    });

    expect(() => templateFn(contextWithoutSlot)).toThrow(
      "Template output must be provided or inferrable from context",
    );
  });

  test("should use explicit output when provided", () => {
    const contextWithSlot: BaseBuildContext = {
      parentId: "parent-1",
      branch: {
        type: "slot",
        name: "values-0",
      },
    };

    const templateFn = template({
      data: b`list.of.names`,
      output: "customOutput", // Explicit output should override inference
      value: text().withValue(b`list.of.names._index_`),
    });

    const result = templateFn(contextWithSlot);

    expect(result.output).toBe("customOutput");
  });
});

describe("template context creation", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("should create template context with depth 0", () => {
    const context: BaseBuildContext = {
      parentId: "parent",
    };

    const templateFn = template({
      data: "items",
      output: "values",
      value: (ctx: BaseBuildContext) => {
        // Verify the context has template branch
        expect(ctx.branch).toEqual({ type: "template", depth: 0 });
        expect(ctx.parentId).toBe("parent");

        return {
          id: "test",
          type: "text",
          value: "test",
        };
      },
    });

    templateFn(context);
  });

  test("should generate proper template IDs with _index_ placeholder", () => {
    const context: BaseBuildContext = {
      parentId: "parent",
    };

    const result = template({
      data: "items",
      output: "values",
      value: text({ value: "test" }),
    })(context);

    expect(result.value.asset.id).toBe("parent-_index_-text");
  });

  test("should support nested template depth tracking", () => {
    const context: BaseBuildContext = {
      parentId: "parent",
    };

    // First level template
    const level1Result = template({
      data: "items",
      output: "values",
      value: text({ value: "test" }),
    })(context);

    expect(level1Result.value.asset.id).toBe("parent-_index_-text");

    // Simulate nested template (depth 1)
    const nestedContext: BaseBuildContext = {
      parentId: "parent-item",
      branch: { type: "template", depth: 1 },
    };

    const nestedAsset = text({ value: "nested" }).build(nestedContext);

    expect(nestedAsset.id).toBe("parent-item-_index1_-text");
  });
});
