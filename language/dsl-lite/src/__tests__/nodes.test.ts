/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test, expect, beforeEach } from "vitest";
import {
  createObjectNode,
  createArrayNode,
  createPropertyNode,
  createValueNode,
  toJSON,
  insertNode,
  removeNode,
  createElement,
} from "../nodes";
import {
  type ObjectASTNode,
  type PropertyASTNode,
  type JsonType,
} from "../types";
import { binding as b } from "../tagged-templates";

describe("Node creation functions", () => {
  test("createObjectNode creates an object node", () => {
    // Without props
    const emptyNode = createObjectNode();
    expect(emptyNode).toEqual({
      kind: "obj",
      props: new Map(),
      parent: null,
      children: [],
    });

    // With props
    const props = new Map([["key", "value"]]);
    const nodeWithProps = createObjectNode(props);
    expect(nodeWithProps).toEqual({
      kind: "obj",
      props,
      parent: null,
      children: [],
    });
  });

  test("createArrayNode creates an array node", () => {
    // Without props
    const emptyNode = createArrayNode();
    expect(emptyNode).toEqual({
      kind: "array",
      props: new Map(),
      parent: null,
      children: [],
    });

    // With props
    const props = new Map([["items", [1, 2, 3]]]);
    const nodeWithProps = createArrayNode(props);
    expect(nodeWithProps).toEqual({
      kind: "array",
      props,
      parent: null,
      children: [],
    });
  });

  test("createPropertyNode creates a property node", () => {
    // Without value
    const nodeWithoutValue = createPropertyNode("test");
    expect(nodeWithoutValue).toEqual({
      kind: "property",
      name: "test",
      value: undefined,
      parent: null,
      children: [],
      props: new Map(),
    });

    // With value
    const nodeWithValue = createPropertyNode("test", "value");
    expect(nodeWithValue).toEqual({
      kind: "property",
      name: "test",
      value: "value",
      parent: null,
      children: [],
      props: new Map(),
    });
  });

  test("createValueNode creates a value node", () => {
    // Without value
    const nodeWithoutValue = createValueNode();
    expect(nodeWithoutValue).toEqual({
      kind: "value",
      value: undefined,
      parent: null,
      children: [],
      props: new Map(),
    });

    // With value
    const nodeWithValue = createValueNode("test");
    expect(nodeWithValue).toEqual({
      kind: "value",
      value: "test",
      parent: null,
      children: [],
      props: new Map(),
    });
  });
});

describe("createElement function", () => {
  test("createElement creates nodes of different types", () => {
    expect(createElement("obj")).toEqual(createObjectNode());
    expect(createElement("array")).toEqual(createArrayNode());

    const propertyNode = createElement("property") as PropertyASTNode;
    expect(propertyNode).toEqual(createPropertyNode(""));

    expect(createElement("value")).toEqual(createValueNode());

    expect(() => createElement("invalid")).toThrow(/Unsupported JSX tag/);
  });
});

describe("Node manipulation functions", () => {
  let parent: ObjectASTNode;
  let child: PropertyASTNode;

  beforeEach(() => {
    parent = createObjectNode();
    child = createPropertyNode("test");
  });

  test("insertNode adds a child node to the parent and sets parent reference", () => {
    insertNode(parent, child);
    expect(parent.children).toEqual([child]);
    expect(child.parent).toBe(parent);
  });

  test("removeNode removes a child node from the parent and clears parent reference", () => {
    insertNode(parent, child);
    removeNode(parent, child);
    expect(parent.children).toEqual([]);
    expect(child.parent).toBeNull();

    // Test removing a child that's not in the parent
    const anotherChild = createPropertyNode("another");
    removeNode(parent, anotherChild);
    expect(parent.children).toEqual([]);
    expect(anotherChild.parent).toBeNull();
  });
});

describe("toJSON function", () => {
  test("converts value and property nodes to JSON", () => {
    // Simple value node
    expect(toJSON(createValueNode(42))).toBe(42);

    // Property node with direct value
    expect(toJSON(createPropertyNode("test", "value"))).toBe("value");

    // Property node with child
    const propNode = createPropertyNode("test");
    insertNode(propNode, createValueNode("child value"));
    expect(toJSON(propNode)).toBe("child value");
  });

  test("converts array nodes to JSON", () => {
    // Empty array
    expect(toJSON(createArrayNode())).toEqual([]);

    // Array with items prop
    const propsArray = new Map([["items", [1, 2, 3]]]);
    expect(toJSON(createArrayNode(propsArray))).toEqual([1, 2, 3]);

    // Array with children
    const arrayNode = createArrayNode();
    insertNode(arrayNode, createValueNode(1));
    insertNode(arrayNode, createValueNode(2));
    expect(toJSON(arrayNode)).toEqual([1, 2]);
  });

  test("converts object nodes to JSON", () => {
    // Empty object
    expect(toJSON(createObjectNode())).toEqual({});

    // Object with props
    const propsObj = new Map<string, JsonType>([
      ["key1", "value1"],
      ["key2", 42],
    ]);
    expect(toJSON(createObjectNode(propsObj))).toEqual({
      key1: "value1",
      key2: 42,
    });
  });

  // Object with property children
  const objNode = createObjectNode();
  insertNode(objNode, createPropertyNode("name", "Alice"));
  insertNode(objNode, createPropertyNode("age", 30));
  expect(toJSON(objNode)).toEqual({ name: "Alice", age: 30 });
});

test("handles tagged template values", () => {
  const template = b`template`;
  expect(toJSON(createValueNode(template))).toBe("{{template}}");
});

test("handles nested objects and arrays", () => {
  const objNode = createObjectNode();
  const arrayProp = createPropertyNode("items");
  const arrayNode = createArrayNode();

  insertNode(objNode, arrayProp);
  insertNode(arrayProp, arrayNode);

  insertNode(arrayNode, createValueNode(1));
  insertNode(arrayNode, createValueNode(2));

  const nestedObj = createObjectNode();
  insertNode(arrayNode, nestedObj);
  insertNode(nestedObj, createPropertyNode("name", "nested"));

  expect(toJSON(objNode)).toEqual({
    items: [1, 2, { name: "nested" }],
  });
});

test("prioritizes object and array children over value children", () => {
  const propNode = createPropertyNode("test");
  insertNode(propNode, createValueNode("value child"));
  insertNode(propNode, createObjectNode(new Map([["key", "value"]])));

  expect(toJSON(propNode)).toEqual({ key: "value" });
});

describe("Circular reference handling", () => {
  test("maintains circular references in objects and arrays", () => {
    // Object with circular reference
    const circularObj: Record<string, any> = {};
    circularObj.self = circularObj;
    const objResult = toJSON(createValueNode(circularObj)) as Record<
      string,
      any
    >;
    expect(objResult.self).toBe(objResult);

    // Array with circular reference
    const circularArray: any[] = [];
    circularArray.push(circularArray);
    const arrayResult = toJSON(createValueNode(circularArray)) as any[];
    expect(arrayResult[0]).toBe(arrayResult);

    // Complex nested structure
    const parent: Record<string, any> = { name: "parent" };
    const child = { name: "child", parent };
    parent.child = child;
    const complexResult = toJSON(createValueNode(parent)) as Record<
      string,
      any
    >;
    expect(complexResult).toEqual({
      name: "parent",
      child: {
        name: "child",
        parent: complexResult,
      },
    });
  });
});
