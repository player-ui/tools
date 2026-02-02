import { describe, test, expect, beforeEach } from "vitest";
import { action } from "../../mocks/generated";
import { binding as b, expression as e } from "../../tagged-template";
import { resetGlobalIdSet } from "../index";

/**
 * Test suite for value extraction with TaggedTemplateValue
 * Ensures that arrays and objects with TaggedTemplateValue are properly extracted
 * without being stringified to [object Object] or flattened
 */

describe("Value Extraction - TaggedTemplateValue Handling", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("preserves array structure with TaggedTemplateValue elements", () => {
    const asset = action()
      .withExp([
        e`conditional(isEmpty({{forms.test}}), setDataVal('forms.test', ''), 'false')`,
        e`conditional(isEmpty({{forms.other}}), setDataVal('forms.other', ''), 'false')`,
      ])
      .build({ parentId: "view-1" });

    expect(asset.exp).toBeInstanceOf(Array);
    expect(asset.exp).toHaveLength(2);
    // Expressions should preserve @[]@ syntax
    expect(asset.exp?.[0]).toBe(
      "@[conditional(isEmpty({{forms.test}}), setDataVal('forms.test', ''), 'false')]@",
    );
    expect(asset.exp?.[1]).toBe(
      "@[conditional(isEmpty({{forms.other}}), setDataVal('forms.other', ''), 'false')]@",
    );
  });

  test("preserves array structure with mixed TaggedTemplateValue and strings", () => {
    const asset = action()
      .withExp([
        "static string",
        e`conditional(isEmpty({{forms.test}}), setDataVal('forms.test', ''), 'false')`,
      ])
      .build({ parentId: "view-1" });

    expect(asset.exp).toBeInstanceOf(Array);
    expect(asset.exp).toHaveLength(2);
    expect(asset.exp?.[0]).toBe("static string");
    // Expression should preserve @[]@ syntax
    expect(asset.exp?.[1]).toBe(
      "@[conditional(isEmpty({{forms.test}}), setDataVal('forms.test', ''), 'false')]@",
    );
  });

  test("extracts object with TaggedTemplateValue properties correctly", () => {
    const asset = action()
      .withConfirmation({
        message: b`forms.confirmMessage`,
        affirmativeLabel: b`forms.yesLabel`,
        negativeLabel: "Cancel",
      })
      .build({ parentId: "view-1" });

    // Bindings should preserve {{}} syntax
    expect(asset.confirmation).toEqual({
      message: "{{forms.confirmMessage}}",
      affirmativeLabel: "{{forms.yesLabel}}",
      negativeLabel: "Cancel",
    });

    // Ensure it's not stringified to [object Object]
    expect(typeof asset.confirmation).toBe("object");
    expect(asset.confirmation).not.toBe("[object Object]");
  });

  test("handles nested arrays in objects with TaggedTemplateValue", () => {
    // Simulate a complex structure with nested arrays
    const asset = action()
      .withAdditionalProperties({
        listeners: {
          "dataChange.forms.test": [
            e`conditional(isEmpty({{forms.test}}), setDataVal('forms.test', ''), 'false')`,
          ],
          "dataChange.forms.other": [
            e`setDataVal('forms.other', 'value1')`,
            e`setDataVal('forms.other2', 'value2')`,
          ],
        },
      })
      .build({ parentId: "view-1" });

    // Check listeners object exists and is not stringified
    expect(asset.listeners).toBeDefined();
    expect(typeof asset.listeners).toBe("object");
    expect(asset.listeners).not.toBe("[object Object]");

    // Check nested arrays are preserved with expression syntax
    const listeners = asset.listeners as Record<string, string[]>;
    expect(Array.isArray(listeners["dataChange.forms.test"])).toBe(true);
    expect(listeners["dataChange.forms.test"]).toHaveLength(1);
    expect(listeners["dataChange.forms.test"][0]).toBe(
      "@[conditional(isEmpty({{forms.test}}), setDataVal('forms.test', ''), 'false')]@",
    );

    expect(Array.isArray(listeners["dataChange.forms.other"])).toBe(true);
    expect(listeners["dataChange.forms.other"]).toHaveLength(2);
    expect(listeners["dataChange.forms.other"][0]).toBe(
      "@[setDataVal('forms.other', 'value1')]@",
    );
    expect(listeners["dataChange.forms.other"][1]).toBe(
      "@[setDataVal('forms.other2', 'value2')]@",
    );
  });

  test("handles nested objects with TaggedTemplateValue in arrays", () => {
    // Simulate modifiers array with objects
    const asset = action()
      .withAdditionalProperties({
        modifiers: [
          { type: "tag", value: b`forms.tagValue` },
          { type: "style", value: "important" },
        ],
      })
      .build({ parentId: "view-1" });

    expect(asset.modifiers).toBeDefined();
    expect(Array.isArray(asset.modifiers)).toBe(true);

    const modifiers = asset.modifiers as Array<{ type: string; value: string }>;
    expect(modifiers).toHaveLength(2);

    // First modifier should have extracted TaggedTemplateValue with binding syntax
    expect(modifiers[0]).toEqual({ type: "tag", value: "{{forms.tagValue}}" });
    expect(modifiers[0]).not.toBe("[object Object]");

    // Second modifier should be unchanged
    expect(modifiers[1]).toEqual({ type: "style", value: "important" });
    expect(modifiers[1]).not.toBe("[object Object]");
  });

  test("handles empty metadata object correctly", () => {
    const asset = action().withMetaData({}).build({ parentId: "view-1" });

    expect(asset.metaData).toEqual({});
    expect(asset.metaData).not.toBe("[object Object]");
  });

  test("handles metadata object with plain values correctly", () => {
    const asset = action()
      .withMetaData({
        role: "primary",
        size: "large",
      })
      .build({ parentId: "view-1" });

    expect(asset.metaData).toEqual({
      role: "primary",
      size: "large",
    });
    expect(asset.metaData).not.toBe("[object Object]");
  });

  test("deeply nested structures with TaggedTemplateValue", () => {
    const asset = action()
      .withAdditionalProperties({
        config: {
          validation: {
            rules: [
              e`conditional(isEmpty({{forms.field1}}), 'required', 'valid')`,
              e`conditional(isEmpty({{forms.field2}}), 'required', 'valid')`,
            ],
            messages: {
              error: b`forms.errorMessage`,
              warning: "Please check your input",
            },
          },
        },
      })
      .build({ parentId: "view-1" });

    const config = asset.config as {
      validation: {
        rules: string[];
        messages: { error: string; warning: string };
      };
    };

    // Check deeply nested arrays with expression syntax
    expect(Array.isArray(config.validation.rules)).toBe(true);
    expect(config.validation.rules).toHaveLength(2);
    expect(config.validation.rules[0]).toBe(
      "@[conditional(isEmpty({{forms.field1}}), 'required', 'valid')]@",
    );

    // Check deeply nested objects with binding syntax
    expect(config.validation.messages).toEqual({
      error: "{{forms.errorMessage}}",
      warning: "Please check your input",
    });
    expect(config.validation.messages).not.toBe("[object Object]");
  });
});
