import { test, expect, describe } from "vitest";
import { setAtPath } from "../set-at-path";

describe("setAtPath", () => {
  test("sets value at root level object property", () => {
    const obj = { name: "John", age: 25 };
    const result = setAtPath(obj, ["name"], "Jane");

    expect(result).toEqual({ name: "Jane", age: 25 });
  });

  test("sets value at nested object property", () => {
    const obj = {
      user: {
        profile: { name: "John", email: "john@example.com" },
        settings: { theme: "light" },
      },
    };
    const result = setAtPath(obj, ["user", "profile", "name"], "Jane");

    expect(result).toEqual({
      user: {
        profile: { name: "Jane", email: "john@example.com" },
        settings: { theme: "light" },
      },
    });
  });

  test("sets value at array index", () => {
    const obj = {
      items: [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
      ],
    };
    const result = setAtPath(obj, ["items", 1], {
      id: 2,
      name: "Updated Item",
    });

    expect(result).toEqual({
      items: [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Updated Item" },
        { id: 3, name: "Item 3" },
      ],
    });
  });

  test("sets nested property in array element", () => {
    const obj = {
      users: [
        { name: "John", age: 25 },
        { name: "Jane", age: 30 },
      ],
    };
    const result = setAtPath(obj, ["users", 0, "name"], "Johnny");

    expect(result).toEqual({
      users: [
        { name: "Johnny", age: 25 },
        { name: "Jane", age: 30 },
      ],
    });
  });

  test("creates missing intermediate objects", () => {
    const obj = { existing: "value" };
    const result = setAtPath(obj, ["new", "nested", "property"], "created");

    expect(result).toEqual({
      existing: "value",
      new: {
        nested: {
          property: "created",
        },
      },
    });
  });

  test("creates missing intermediate arrays", () => {
    const obj = { existing: "value" };
    const result = setAtPath(obj, ["items", 0, "name"], "First Item");

    expect(result).toEqual({
      existing: "value",
      items: [{ name: "First Item" }],
    });
  });

  test("handles mixed object and array traversal", () => {
    const obj = {
      data: {
        users: [{ profile: { name: "John" } }, { profile: { name: "Jane" } }],
      },
    };
    const result = setAtPath(
      obj,
      ["data", "users", 1, "profile", "name"],
      "Janet",
    );

    expect(result).toEqual({
      data: {
        users: [{ profile: { name: "John" } }, { profile: { name: "Janet" } }],
      },
    });
  });

  test("replaces entire object when path is empty", () => {
    const obj = { name: "John", age: 25 };
    const newValue = { id: 1, title: "New Object" };
    const result = setAtPath(obj, [], newValue);

    expect(result).toEqual(newValue);
  });

  test("handles complex nested structures", () => {
    const obj = {
      level1: {
        level2: {
          items: [{ data: { value: "original" } }, { data: { value: "keep" } }],
          settings: { theme: "light" },
        },
      },
    };
    const result = setAtPath(
      obj,
      ["level1", "level2", "items", 0, "data", "value"],
      "updated",
    );

    expect(result).toEqual({
      level1: {
        level2: {
          items: [{ data: { value: "updated" } }, { data: { value: "keep" } }],
          settings: { theme: "light" },
        },
      },
    });
  });

  test("preserves array structure when setting array elements", () => {
    const obj = {
      matrix: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9],
      ],
    };
    const result = setAtPath(obj, ["matrix", 1, 1], 99);

    expect(result).toEqual({
      matrix: [
        [1, 2, 3],
        [4, 99, 6],
        [7, 8, 9],
      ],
    });
  });

  test("handles setting values at deep array indices", () => {
    const obj = {
      deep: [[[{ value: "original" }]]],
    };
    const result = setAtPath(obj, ["deep", 0, 0, 0, "value"], "deeply nested");

    expect(result).toEqual({
      deep: [[[{ value: "deeply nested" }]]],
    });
  });

  test("handles setting values with different types", () => {
    const obj = { data: "string" };

    // Set number
    let result = setAtPath(obj, ["data"], 42);
    expect(result).toEqual({ data: 42 });

    // Set boolean
    result = setAtPath(obj, ["data"], true);
    expect(result).toEqual({ data: true });

    // Set null
    result = setAtPath(obj, ["data"], null);
    expect(result).toEqual({ data: null });

    // Set object
    result = setAtPath(obj, ["data"], { nested: "value" });
    expect(result).toEqual({ data: { nested: "value" } });

    // Set array
    result = setAtPath(obj, ["data"], [1, 2, 3]);
    expect(result).toEqual({ data: [1, 2, 3] });
  });

  test("handles edge cases with empty objects and arrays", () => {
    const emptyObj = {};
    const result1 = setAtPath(emptyObj, ["new", "property"], "value");
    expect(result1).toEqual({ new: { property: "value" } });

    const objWithEmptyArray = { items: [] };
    const result2 = setAtPath(objWithEmptyArray, ["items", 0], "first item");
    expect(result2).toEqual({ items: ["first item"] });

    const objWithEmptyObject = { config: {} };
    const result3 = setAtPath(
      objWithEmptyObject,
      ["config", "setting"],
      "enabled",
    );
    expect(result3).toEqual({ config: { setting: "enabled" } });
  });

  test("maintains immutability at all levels", () => {
    const original = {
      level1: {
        level2: {
          items: [{ name: "Item 1" }, { name: "Item 2" }],
        },
      },
    };

    const result = setAtPath(
      original,
      ["level1", "level2", "items", 0, "name"],
      "Updated Item",
    );

    // Verify original is unchanged
    expect(original).toEqual({
      level1: {
        level2: {
          items: [{ name: "Item 1" }, { name: "Item 2" }],
        },
      },
    });

    // Verify result is new object
    expect(result).not.toBe(original);
  });
});
