import { describe, test, expect } from "vitest";
import {
  binding,
  expression,
  isTaggedTemplateValue,
  TaggedTemplateValueSymbol,
  type TaggedTemplateValue,
} from "../index";

describe("Tagged Templates Module", () => {
  describe("binding function", () => {
    test("creates a simple binding template", () => {
      const result = binding`foo`;
      expect(result.toString()).toBe("{{foo}}");
      expect(result.toValue()).toBe("foo");
    });

    test("interpolates string values", () => {
      const value = "bar";
      const result = binding`foo.${value}`;
      expect(result.toString()).toBe("{{foo.bar}}");
      expect(result.toValue()).toBe("foo.bar");
    });

    test("replaces _index_ placeholders with unique identifiers", () => {
      const result = binding`items._index_.value`;
      expect(result.toString()).toBe("{{items._index_.value}}");
      expect(result.toValue()).toBe("items._index_.value");
    });

    test("handles multiple _index_ placeholders", () => {
      const result = binding`items._index_.values._index_`;
      expect(result.toString()).toBe("{{items._index_.values._index1_}}");
      expect(result.toValue()).toBe("items._index_.values._index1_");
    });

    test("processes _index_ in interpolated strings", () => {
      const indexStr = "_index_";
      const result = binding`items.${indexStr}.value`;
      expect(result.toString()).toBe("{{items._index_.value}}");
      expect(result.toValue()).toBe("items._index_.value");
    });

    test("handles nested binding templates", () => {
      const inner = binding`bar`;
      const result = binding`foo.${inner}`;
      expect(result.toString()).toBe("{{foo.{{bar}}}}");
      expect(result.toValue()).toBe("foo.{{bar}}");
    });

    test("handles nested expression templates", () => {
      const result = binding`foo.bar`;
      const expr = expression`getValue(${result})`;
      expect(expr.toString()).toBe("@[getValue({{foo.bar}})]@");
      expect(expr.toValue()).toBe("getValue({{foo.bar}})");
    });

    test("formats correctly in different contexts", () => {
      const templ = binding`foo`;
      expect(templ.toString()).toBe("{{foo}}");
      expect(templ.toRefString()).toBe("{{foo}}");
      expect(templ.toRefString({ nestedContext: "binding" })).toBe("foo");
      expect(templ.toValue()).toBe("foo");
    });

    test("converts non-string, non-template values to strings", () => {
      const num = 42;
      const bool = true;
      const result = binding`value: ${num}, isActive: ${bool}`;
      expect(result.toString()).toBe("{{value: 42, isActive: true}}");
      expect(result.toValue()).toBe("value: 42, isActive: true");
    });
  });

  describe("expression function", () => {
    test("creates a simple expression template", () => {
      const result = expression`getValue()`;
      expect(result.toString()).toBe("@[getValue()]@");
      expect(result.toValue()).toBe("getValue()");
    });

    test("interpolates string values", () => {
      const methodName = "getValue";
      const result = expression`${methodName}()`;
      expect(result.toString()).toBe("@[getValue()]@");
      expect(result.toValue()).toBe("getValue()");
    });

    test("handles nested expression templates", () => {
      const inner = expression`getInner()`;
      const result = expression`getOuter(${inner})`;
      expect(result.toString()).toBe("@[getOuter(getInner())]@");
      expect(result.toValue()).toBe("getOuter(getInner())");
    });

    test("handles nested binding templates", () => {
      const bind = binding`foo.bar`;
      const result = expression`getValue(${bind})`;
      expect(result.toString()).toBe("@[getValue({{foo.bar}})]@");
      expect(result.toValue()).toBe("getValue({{foo.bar}})");
    });

    test("formats correctly in different contexts", () => {
      const templ = expression`getValue()`;
      expect(templ.toString()).toBe("@[getValue()]@");
      expect(templ.toRefString()).toBe("@[getValue()]@");
      expect(templ.toRefString({ nestedContext: "binding" })).toBe(
        "`getValue()`",
      );
      expect(templ.toRefString({ nestedContext: "expression" })).toBe(
        "getValue()",
      );
      expect(templ.toValue()).toBe("getValue()");
    });

    test("throws error for unbalanced parentheses (too many closing)", () => {
      expect(() => expression`getValue())`).toThrow(/Unexpected \)/);
    });

    test("throws error for unbalanced parentheses (missing closing)", () => {
      expect(() => expression`getValue(`).toThrow(/Expected \)/);
    });

    test("converts non-string, non-template values to strings", () => {
      const num = 42;
      const bool = true;
      const result = expression`getValue(${num}, ${bool})`;
      expect(result.toString()).toBe("@[getValue(42, true)]@");
      expect(result.toValue()).toBe("getValue(42, true)");
    });
  });

  describe("isTaggedTemplateValue function", () => {
    test("returns true for binding templates", () => {
      const templ = binding`foo`;
      expect(isTaggedTemplateValue(templ)).toBe(true);
    });

    test("returns true for expression templates", () => {
      const templ = expression`getValue()`;
      expect(isTaggedTemplateValue(templ)).toBe(true);
    });

    test("returns false for non-template values", () => {
      expect(isTaggedTemplateValue("string")).toBe(false);
      expect(isTaggedTemplateValue(123)).toBe(false);
      expect(isTaggedTemplateValue({})).toBe(false);
      expect(isTaggedTemplateValue(null)).toBe(false);
      expect(isTaggedTemplateValue(undefined)).toBe(false);
    });

    test("returns false for objects without the symbol", () => {
      const fakeTemplate = {
        toValue: () => "value",
        toRefString: () => "ref",
        toString: () => "string",
      };
      expect(isTaggedTemplateValue(fakeTemplate)).toBe(false);
    });

    test("returns true for manually created tagged template values", () => {
      const manual: TaggedTemplateValue = {
        [TaggedTemplateValueSymbol]: true,
        toValue: () => "value",
        toRefString: () => "ref",
        toString: () => "string",
      };
      expect(isTaggedTemplateValue(manual)).toBe(true);
    });
  });

  describe("Complex scenarios", () => {
    test("handles complex nested templates", () => {
      const inner1 = binding`foo._index_`;
      const inner2 = expression`getBar()`;
      const result = binding`complex.${inner1}.with.${inner2}`;
      expect(result.toString()).toBe(
        "{{complex.{{foo._index_}}.with.`getBar()`}}",
      );
    });

    test("correctly handles deeply nested templates", () => {
      const level3 = binding`value._index_`;
      const level2 = expression`getItem(${level3})`;
      const level1 = binding`items.${level2}`;

      expect(level1.toString()).toBe("{{items.`getItem({{value._index_}})`}}");
    });
  });
});
