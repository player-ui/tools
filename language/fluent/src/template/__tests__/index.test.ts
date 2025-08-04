import { describe, test, expect } from "vitest";
import type { Template, Asset } from "@player-ui/types";
import { template, addTemplate } from "../index";
import type { ParentCtx, SlotBranch } from "../../types";
import { isTemplateFunction, TEMPLATE_FUNCTION_MARKER } from "../../types";
import { text } from "../../examples";
import { binding as b } from "../../tagged-template";

// Mock ParentCtx
const mockParentCtx: ParentCtx = {
  parentId: "parent-1",
  branch: {
    type: "slot",
    name: "test",
  } as SlotBranch,
};

describe("template", () => {
  test("create a basic template configuration", () => {
    const result = template({
      data: "list.of.names",
      output: "values",
      value: text({ value: b`list.of.names._index_` }),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "list.of.names",
      output: "values",
      value: {
        asset: {
          id: "parent-1-_index_",
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
      value: text({ value: b`list.of.names._index_` }),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "{{list.of.names}}",
      output: "values",
      value: {
        asset: {
          id: "parent-1-_index_",
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
      value: text({ value: b`list.of.names._index_` }),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "list.of.names",
      output: "values",
      dynamic: true,
      value: {
        asset: {
          id: "parent-1-_index_",
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
      value: text({ value: b`list.of.names._index_` }),
    })(mockParentCtx);

    const expected: Template<{ asset: Asset<"text"> }> = {
      data: "list.of.names",
      output: "values",
      value: {
        asset: {
          id: "parent-1-_index_",
          type: "text",
          value: "{{list.of.names._index_}}",
        },
      },
    };

    expect(result).toEqual(expected);
    expect(result).not.toHaveProperty("dynamic");
  });

  test("pass the correct parent context to the value function", () => {
    let capturedParentCtx: ParentCtx | null = null;

    const valueWithCapture = (parentCtx: ParentCtx): Asset<"text"> => {
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
      parentId: "parent-1",
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
      value: text({ value: b`list.of.names._index_` }),
    })(mockParentCtx);

    const template2 = template({
      data: "list.of.other-names",
      output: "values",
      value: text({ value: b`list.of.other-names._index_` }),
    })(mockParentCtx);

    expect(template1.output).toEqual(template2.output);
    expect(template1.output).toBe("values");
  });

  // Test complex nested asset structures
  test("handle complex nested asset structures", () => {
    interface CollectionAsset extends Asset<"collection"> {
      items: Array<{ asset: Asset<"text"> }>;
    }

    const collectionAsset = (_parentCtx: ParentCtx): CollectionAsset => ({
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
      value: text({ value: b`list.of.names._index_` }),
    })(mockParentCtx);

    expect(result.dynamic).toBe(true);
  });
});

describe("isTemplateFunction type guard", () => {
  test("should return true for template functions", () => {
    const templateFn = template({
      data: "list.of.names",
      output: "values",
      value: text({ value: b`list.of.names._index_` }),
    });

    expect(isTemplateFunction(templateFn)).toBe(true);
  });

  test("should return false for non-template functions", () => {
    const regularFunction = () => ({});
    const arrowFunction = () => "test";
    const objectWithFunction = { fn: () => {} };

    expect(isTemplateFunction(regularFunction)).toBe(false);
    expect(isTemplateFunction(arrowFunction)).toBe(false);
    expect(isTemplateFunction(objectWithFunction.fn)).toBe(false);
  });

  test("should return false for non-functions", () => {
    const string = "not a function";
    const number = 42;
    const object = { type: "test" };
    const nullValue = null;
    const undefinedValue = undefined;

    expect(isTemplateFunction(string)).toBe(false);
    expect(isTemplateFunction(number)).toBe(false);
    expect(isTemplateFunction(object)).toBe(false);
    expect(isTemplateFunction(nullValue)).toBe(false);
    expect(isTemplateFunction(undefinedValue)).toBe(false);
  });

  test("should have TEMPLATE_FUNCTION_MARKER symbol on template functions", () => {
    const templateFn = template({
      data: "list.of.names",
      output: "values",
      value: text({ value: b`list.of.names._index_` }),
    });

    expect(TEMPLATE_FUNCTION_MARKER in templateFn).toBe(true);
    expect(
      (templateFn as unknown as { [TEMPLATE_FUNCTION_MARKER]: unknown })[
        TEMPLATE_FUNCTION_MARKER
      ],
    ).toBe(true);
  });

  test("should not have TEMPLATE_FUNCTION_MARKER symbol on regular functions", () => {
    const regularFunction = () => ({});

    expect(TEMPLATE_FUNCTION_MARKER in regularFunction).toBe(false);
  });

  test("should work with template functions that have been called", () => {
    const templateFn = template({
      data: "list.of.names",
      output: "values",
      value: text({ value: b`list.of.names._index_` }),
    });

    // Call the template function
    templateFn(mockParentCtx);

    // The original function should still be identifiable as a template
    expect(isTemplateFunction(templateFn)).toBe(true);
    expect(TEMPLATE_FUNCTION_MARKER in templateFn).toBe(true);
  });
});

describe("addTemplate", () => {
  test("adds a template to an asset builder function", () => {
    // Example asset builder
    const builder = (ctx: ParentCtx): Asset<"group"> => ({
      id: ctx.parentId ? `${ctx.parentId}-group` : "group",
      type: "group",
      label: "Group Label",
    });

    // Example template
    const templateFn = template({
      data: "items",
      output: "values",
      value: (ctx) => ({
        id: ctx.parentId ? `${ctx.parentId}-item` : "item",
        type: "item" as const,
        value: "Item value",
      }),
    });

    // Add template to builder
    const enhancedBuilder = addTemplate(builder, templateFn);

    // Call the enhanced builder
    const result = enhancedBuilder(mockParentCtx);

    // Check the result
    expect(result).toEqual({
      id: "parent-1-group",
      type: "group",
      label: "Group Label",
      template: [
        {
          data: "items",
          output: "values",
          value: {
            asset: {
              id: "parent-1-item",
              type: "item",
              value: "Item value",
            },
          },
        },
      ],
    });
  });

  test("adds multiple templates to an asset builder", () => {
    // Example asset builder
    const builder = (ctx: ParentCtx): Asset<"group"> => ({
      id: ctx.parentId ? `${ctx.parentId}-group` : "group",
      type: "group",
      label: "Group Label",
    });

    // First template
    const templateFn1 = template({
      data: "items",
      output: "values",
      value: (ctx) => ({
        id: ctx.parentId ? `${ctx.parentId}-item1` : "item1",
        type: "item" as const,
        value: "Item 1",
      }),
    });

    // Second template
    const templateFn2 = template({
      data: "otherItems",
      output: "values",
      value: (ctx) => ({
        id: ctx.parentId ? `${ctx.parentId}-item2` : "item2",
        type: "item" as const,
        value: "Item 2",
      }),
    });

    // Add multiple templates
    const enhancedBuilder1 = addTemplate(builder, templateFn1);
    const enhancedBuilder2 = addTemplate(enhancedBuilder1, templateFn2);

    // Call the enhanced builder
    const result = enhancedBuilder2(mockParentCtx);

    // Check the result has both templates
    expect(result.template?.length).toBe(2);
    expect(result.template?.[0].data).toBe("items");
    expect(result.template?.[1].data).toBe("otherItems");
  });

  test("works with text component builders", () => {
    // Create a text component with a template
    const textBuilder = text().withValue("Hello World");

    const templateFn = template({
      data: "names",
      output: "values",
      value: (ctx) => ({
        id: ctx.parentId ? `${ctx.parentId}-dynamic-text` : "dynamic-text",
        type: "text" as const,
        value: "{{names._index_}}",
      }),
    });

    const enhancedBuilder = addTemplate(textBuilder, templateFn);
    const result = enhancedBuilder(mockParentCtx);

    expect(result.type).toBe("text");
    expect(result.value).toBe("Hello World");
    expect(result.template?.[0].data).toBe("names");
    expect(result.template?.[0].output).toBe("values");
  });
});
