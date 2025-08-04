import { test, expect, describe } from "vitest";
import {
  safeToString,
  safeToBoolean,
  safeToNumber,
  safeToArray,
  safeToObject,
  safeFromMixedType,
  hasTaggedTemplateValues,
} from "../tagged-template-handling";
import { TAGGED_TEMPLATE_MARKER, isTaggedTemplateValue } from "../../types";

/**
 * Creates a mock TaggedTemplateValue for testing
 */
function createMockTaggedTemplate<T = unknown>(
  value: string,
  toStringResult?: string,
): {
  [TAGGED_TEMPLATE_MARKER]: true;
  _phantomType?: T;
  toValue(): string;
  toRefString(): string;
  toString(): string;
} {
  return {
    [TAGGED_TEMPLATE_MARKER]: true,
    _phantomType: undefined,
    toValue: () => value,
    toRefString: () => `{{${value}}}`,
    toString: () => toStringResult ?? `{{${value}}}`,
  };
}

describe("safeToString", () => {
  test("converts regular strings", () => {
    expect(safeToString("hello")).toBe("hello");
    expect(safeToString("")).toBe("");
  });

  test("converts numbers to strings", () => {
    expect(safeToString(42)).toBe("42");
    expect(safeToString(0)).toBe("0");
    expect(safeToString(-123.45)).toBe("-123.45");
  });

  test("converts boolean values to strings", () => {
    expect(safeToString(true)).toBe("true");
    expect(safeToString(false)).toBe("false");
  });

  test("converts null and undefined to strings", () => {
    expect(safeToString(null)).toBe("null");
    expect(safeToString(undefined)).toBe("undefined");
  });

  test("converts TaggedTemplateValue using toString method", () => {
    const tagged = createMockTaggedTemplate("user.name", "John Doe");
    expect(safeToString(tagged)).toBe("John Doe");
  });

  test("handles objects by converting to string representation", () => {
    const obj = { key: "value" };
    expect(safeToString(obj)).toBe("[object Object]");
  });

  test("handles arrays by converting to string representation", () => {
    expect(safeToString([1, 2, 3])).toBe("1,2,3");
    expect(safeToString([])).toBe("");
  });
});

describe("safeToBoolean", () => {
  test("preserves boolean values", () => {
    expect(safeToBoolean(true)).toBe(true);
    expect(safeToBoolean(false)).toBe(false);
  });

  test("converts truthy values to true", () => {
    expect(safeToBoolean("hello")).toBe(true);
    expect(safeToBoolean(1)).toBe(true);
    expect(safeToBoolean({})).toBe(true);
    expect(safeToBoolean([])).toBe(true);
  });

  test("converts falsy values to false", () => {
    expect(safeToBoolean("")).toBe(false);
    expect(safeToBoolean(0)).toBe(false);
    expect(safeToBoolean(null)).toBe(false);
    expect(safeToBoolean(undefined)).toBe(false);
    expect(safeToBoolean(NaN)).toBe(false);
  });

  test('converts TaggedTemplateValue to true only when toString equals "true"', () => {
    const trueTagged = createMockTaggedTemplate("user.isActive", "true");
    const falseTagged = createMockTaggedTemplate("user.isInactive", "false");
    const otherTagged = createMockTaggedTemplate("user.name", "John");

    expect(safeToBoolean(trueTagged)).toBe(true);
    expect(safeToBoolean(falseTagged)).toBe(false);
    expect(safeToBoolean(otherTagged)).toBe(false);
  });
});

describe("safeToNumber", () => {
  test("preserves number values", () => {
    expect(safeToNumber(42)).toBe(42);
    expect(safeToNumber(0)).toBe(0);
    expect(safeToNumber(-123.45)).toBe(-123.45);
    expect(safeToNumber(Infinity)).toBe(Infinity);
    expect(safeToNumber(-Infinity)).toBe(-Infinity);
  });

  test("converts numeric strings to numbers", () => {
    expect(safeToNumber("42")).toBe(42);
    expect(safeToNumber("0")).toBe(0);
    expect(safeToNumber("-123.45")).toBe(-123.45);
    expect(safeToNumber("3.14159")).toBe(3.14159);
  });

  test("converts boolean values to numbers", () => {
    expect(safeToNumber(true)).toBe(1);
    expect(safeToNumber(false)).toBe(0);
  });

  test("returns NaN for invalid number strings", () => {
    expect(safeToNumber("invalid")).toBeNaN();
    expect(safeToNumber("hello")).toBeNaN();
    expect(safeToNumber("")).toBe(0); // Empty string converts to 0
    expect(safeToNumber("  ")).toBe(0); // Whitespace converts to 0
  });

  test("converts null and undefined", () => {
    expect(safeToNumber(null)).toBe(0);
    expect(safeToNumber(undefined)).toBeNaN();
  });

  test("converts TaggedTemplateValue by first calling toString", () => {
    const numericTagged = createMockTaggedTemplate("user.age", "25");
    const invalidTagged = createMockTaggedTemplate("user.name", "John");

    expect(safeToNumber(numericTagged)).toBe(25);
    expect(safeToNumber(invalidTagged)).toBeNaN();
  });

  test("preserves NaN values", () => {
    expect(safeToNumber(NaN)).toBeNaN();
  });
});

describe("safeToArray", () => {
  test("preserves arrays with primitive values", () => {
    const arr = [1, "hello", true, null];
    expect(safeToArray(arr)).toEqual([1, "hello", true, null]);
  });

  test("wraps non-array values in array", () => {
    expect(safeToArray("hello")).toEqual(["hello"]);
    expect(safeToArray(42)).toEqual([42]);
    expect(safeToArray(true)).toEqual([true]);
    expect(safeToArray(null)).toEqual([null]);
  });

  test("converts TaggedTemplateValue to array with string value", () => {
    const tagged = createMockTaggedTemplate("user.name", "John");
    expect(safeToArray(tagged)).toEqual(["John"]);
  });

  test("processes arrays containing TaggedTemplateValues", () => {
    const tagged1 = createMockTaggedTemplate("user.name", "John");
    const tagged2 = createMockTaggedTemplate("user.age", "25");
    const arr = [tagged1, "static", tagged2, 42];

    expect(safeToArray(arr)).toEqual(["John", "static", "25", 42]);
  });

  test("handles nested arrays recursively", () => {
    const tagged = createMockTaggedTemplate("item", "value");
    const nestedArr = [1, [2, tagged, [3, "deep"]], 4];

    expect(safeToArray(nestedArr)).toEqual([1, [2, "value", [3, "deep"]], 4]);
  });

  test("handles objects within arrays", () => {
    const tagged = createMockTaggedTemplate("user.name", "John");
    const arr = [
      { name: tagged, age: 25 },
      "static",
      { nested: { value: tagged } },
    ];

    const result = safeToArray(arr);
    expect(result).toEqual([
      { name: "John", age: 25 },
      "static",
      { nested: { value: "John" } },
    ]);
  });

  test("throws error when maximum recursion depth exceeded", () => {
    expect(() => {
      safeToArray([], 101); // Exceeds MAX_RECURSION_DEPTH
    }).toThrow("Maximum recursion depth (100) exceeded in safeToArray");
  });

  test("handles empty arrays", () => {
    expect(safeToArray([])).toEqual([]);
  });
});

describe("safeToObject", () => {
  test("preserves objects with primitive values", () => {
    const obj = { name: "John", age: 25, active: true };
    expect(safeToObject(obj)).toEqual({ name: "John", age: 25, active: true });
  });

  test("converts TaggedTemplateValues in object properties", () => {
    const nameTagged = createMockTaggedTemplate("user.name", "John");
    const ageTagged = createMockTaggedTemplate("user.age", "25");
    const obj = {
      name: nameTagged,
      age: ageTagged,
      static: "value",
    };

    expect(safeToObject(obj)).toEqual({
      name: "John",
      age: "25",
      static: "value",
    });
  });

  test("handles nested objects recursively", () => {
    const tagged = createMockTaggedTemplate("deep.value", "result");
    const nested = {
      level1: {
        level2: {
          data: tagged,
          other: "static",
        },
        simple: "value",
      },
      top: tagged,
    };

    expect(safeToObject(nested)).toEqual({
      level1: {
        level2: {
          data: "result",
          other: "static",
        },
        simple: "value",
      },
      top: "result",
    });
  });

  test("handles arrays within objects", () => {
    const tagged1 = createMockTaggedTemplate("item1", "value1");
    const tagged2 = createMockTaggedTemplate("item2", "value2");
    const obj = {
      items: [tagged1, "static", tagged2],
      nested: {
        array: [1, tagged1, { prop: tagged2 }],
      },
    };

    expect(safeToObject(obj)).toEqual({
      items: ["value1", "static", "value2"],
      nested: {
        array: [1, "value1", { prop: "value2" }],
      },
    });
  });

  test("returns non-objects as-is", () => {
    expect(safeToObject(null as unknown as Record<string, unknown>)).toBe(null);
    expect(safeToObject(undefined as unknown as Record<string, unknown>)).toBe(
      undefined,
    );
    expect(safeToObject("string" as unknown as Record<string, unknown>)).toBe(
      "string",
    );
    expect(safeToObject(42 as unknown as Record<string, unknown>)).toBe(42);
    expect(
      safeToObject([1, 2, 3] as unknown as Record<string, unknown>),
    ).toEqual([1, 2, 3]);
  });

  test("throws error when maximum recursion depth exceeded", () => {
    expect(() => {
      safeToObject({}, 101); // Exceeds MAX_RECURSION_DEPTH
    }).toThrow("Maximum recursion depth (100) exceeded in safeToObject");
  });

  test("handles empty objects", () => {
    expect(safeToObject({})).toEqual({});
  });
});

describe("safeFromMixedType", () => {
  test("handles TaggedTemplateValue directly", () => {
    const tagged = createMockTaggedTemplate("user.name", "John");
    expect(safeFromMixedType(tagged)).toBe("John");
  });

  test("handles primitive values", () => {
    expect(safeFromMixedType("string")).toBe("string");
    expect(safeFromMixedType(42)).toBe(42);
    expect(safeFromMixedType(true)).toBe(true);
    expect(safeFromMixedType(null)).toBe(null);
    expect(safeFromMixedType(undefined)).toBe(undefined);
  });

  test("handles objects by calling safeToObject", () => {
    const tagged = createMockTaggedTemplate("user.name", "John");
    const obj = { name: tagged, age: 25 };

    expect(safeFromMixedType(obj)).toEqual({ name: "John", age: 25 });
  });

  test("handles arrays by calling safeToArray", () => {
    const tagged = createMockTaggedTemplate("item", "value");
    const arr = [tagged, "static", 42];

    expect(safeFromMixedType(arr)).toEqual(["value", "static", 42]);
  });

  test("handles complex mixed structures", () => {
    const nameTagged = createMockTaggedTemplate("user.name", "John");
    const ageTagged = createMockTaggedTemplate("user.age", "25");
    const itemTagged = createMockTaggedTemplate("item.id", "item123");

    const complex = {
      user: {
        profile: { name: nameTagged },
        metadata: { age: ageTagged },
      },
      items: [itemTagged, "static", { id: itemTagged, name: "Product" }],
      settings: {
        theme: "dark",
        notifications: true,
      },
    };

    const expected = {
      user: {
        profile: { name: "John" },
        metadata: { age: "25" },
      },
      items: ["item123", "static", { id: "item123", name: "Product" }],
      settings: {
        theme: "dark",
        notifications: true,
      },
    };

    expect(safeFromMixedType(complex)).toEqual(expected);
  });

  test("throws error when maximum recursion depth exceeded", () => {
    expect(() => {
      safeFromMixedType({}, 101); // Exceeds MAX_RECURSION_DEPTH
    }).toThrow("Maximum recursion depth (100) exceeded in safeFromMixedType");
  });
});

describe("hasTaggedTemplateValues", () => {
  test("returns false for primitive values", () => {
    expect(hasTaggedTemplateValues("string")).toBe(false);
    expect(hasTaggedTemplateValues(42)).toBe(false);
    expect(hasTaggedTemplateValues(true)).toBe(false);
    expect(hasTaggedTemplateValues(null)).toBe(false);
    expect(hasTaggedTemplateValues(undefined)).toBe(false);
  });

  test("returns true for TaggedTemplateValue", () => {
    const tagged = createMockTaggedTemplate("user.name", "John");
    expect(hasTaggedTemplateValues(tagged)).toBe(true);
  });

  test("returns false for plain objects without TaggedTemplateValues", () => {
    const obj = {
      name: "John",
      age: 25,
      settings: {
        theme: "dark",
        notifications: true,
      },
    };
    expect(hasTaggedTemplateValues(obj)).toBe(false);
  });

  test("returns true for objects containing TaggedTemplateValues", () => {
    const tagged = createMockTaggedTemplate("user.name", "John");
    const obj = {
      name: tagged,
      age: 25,
    };
    expect(hasTaggedTemplateValues(obj)).toBe(true);
  });

  test("returns true for nested objects with TaggedTemplateValues", () => {
    const tagged = createMockTaggedTemplate("deep.value", "result");
    const nested = {
      level1: {
        level2: {
          data: tagged,
        },
      },
    };
    expect(hasTaggedTemplateValues(nested)).toBe(true);
  });

  test("returns false for arrays without TaggedTemplateValues", () => {
    const arr = [1, "hello", true, { name: "John" }];
    expect(hasTaggedTemplateValues(arr)).toBe(false);
  });

  test("returns true for arrays containing TaggedTemplateValues", () => {
    const tagged = createMockTaggedTemplate("item", "value");
    const arr = [1, tagged, "hello"];
    expect(hasTaggedTemplateValues(arr)).toBe(true);
  });

  test("returns true for nested arrays with TaggedTemplateValues", () => {
    const tagged = createMockTaggedTemplate("item", "value");
    const nested = [1, [2, [tagged]]];
    expect(hasTaggedTemplateValues(nested)).toBe(true);
  });

  test("returns false when maximum recursion depth exceeded", () => {
    // This should return false when depth exceeds limit to prevent infinite recursion
    expect(hasTaggedTemplateValues({}, 101)).toBe(false);
  });

  test("handles complex mixed structures", () => {
    const tagged = createMockTaggedTemplate("user.name", "John");
    const complex = {
      user: { name: "John" },
      items: [1, 2, 3],
      settings: { theme: "dark" },
    };
    expect(hasTaggedTemplateValues(complex)).toBe(false);

    const complexWithTagged = {
      user: { name: tagged },
      items: [1, 2, 3],
      settings: { theme: "dark" },
    };
    expect(hasTaggedTemplateValues(complexWithTagged)).toBe(true);
  });

  test("handles empty structures", () => {
    expect(hasTaggedTemplateValues({})).toBe(false);
    expect(hasTaggedTemplateValues([])).toBe(false);
  });
});

describe("Edge cases and error handling", () => {
  test("safeToString handles objects with custom toString", () => {
    const customObj = {
      toString: () => "custom string",
    };
    expect(safeToString(customObj)).toBe("custom string");
  });

  test("safeToNumber handles Infinity and -Infinity", () => {
    expect(safeToNumber(Infinity)).toBe(Infinity);
    expect(safeToNumber(-Infinity)).toBe(-Infinity);
    expect(safeToNumber("Infinity")).toBe(Infinity);
    expect(safeToNumber("-Infinity")).toBe(-Infinity);
  });

  test("recursion depth protection works correctly", () => {
    // Test that recursion protection kicks in at the right depth
    const createDeepNested = (depth: number): Record<string, unknown> => {
      if (depth === 0) return { value: "deep" };
      return { nested: createDeepNested(depth - 1) };
    };

    const veryDeep = createDeepNested(150); // Deeper than MAX_RECURSION_DEPTH

    // These should throw due to recursion depth
    expect(() => safeToObject(veryDeep)).toThrow("Maximum recursion depth");
    expect(() => safeToArray([veryDeep])).toThrow("Maximum recursion depth");
    expect(() => safeFromMixedType(veryDeep)).toThrow(
      "Maximum recursion depth",
    );
  });

  test("validates isTaggedTemplateValue type guard correctly", () => {
    const tagged = createMockTaggedTemplate("test", "value");
    const regular = { someProperty: "value" };

    expect(isTaggedTemplateValue(tagged)).toBe(true);
    expect(isTaggedTemplateValue(regular)).toBe(false);
    expect(isTaggedTemplateValue(null)).toBe(false);
    expect(isTaggedTemplateValue(undefined)).toBe(false);
    expect(isTaggedTemplateValue("string")).toBe(false);
    expect(isTaggedTemplateValue(42)).toBe(false);
  });

  test("handles arrays with mixed types correctly", () => {
    const tagged = createMockTaggedTemplate("item", "value");
    const mixed = [
      tagged,
      null,
      undefined,
      0,
      "",
      false,
      {},
      [],
      { nested: tagged },
    ];

    const result = safeToArray(mixed);
    expect(result[0]).toBe("value"); // Tagged converted to string
    expect(result[1]).toBe(null);
    expect(result[2]).toBe(undefined);
    expect(result[3]).toBe(0);
    expect(result[4]).toBe("");
    expect(result[5]).toBe(false);
    expect(result[6]).toEqual({});
    expect(result[7]).toEqual([]);
    expect(result[8]).toEqual({ nested: "value" });
  });
});
