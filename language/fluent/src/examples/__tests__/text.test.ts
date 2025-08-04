import { test, expect } from "vitest";
import { binding as b } from "../../tagged-template";
import type { TextAsset } from "../types/text";
import { text } from "../builder";

test("text with basic value", () => {
  const expected: TextAsset = {
    id: "parent-text",
    type: "text",
    value: "Hello World",
  };

  const builder = text().withValue("Hello World");

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with binding value", () => {
  const expected: TextAsset = {
    id: "parent-text",
    type: "text",
    value: "{{user.name}}",
  };

  const builder = text().withValue(b`user.name`);

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with modifiers", () => {
  const expected: TextAsset = {
    id: "parent-text",
    type: "text",
    value: "Important Message",
    modifiers: [
      { type: "tag", name: "important" },
      { type: "style", name: "bold" },
    ],
  };

  const builder = text()
    .withValue("Important Message")
    .withModifiers([
      { type: "tag", name: "important" },
      { type: "style", name: "bold" },
    ]);

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with single modifier", () => {
  const expected: TextAsset = {
    id: "parent-text",
    type: "text",
    value: "Highlighted text",
    modifiers: [{ type: "highlight", value: true }],
  };

  const builder = text()
    .withValue("Highlighted text")
    .withModifiers([{ type: "highlight", value: true }]);

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with custom id", () => {
  const expected: TextAsset = {
    id: "custom-text-id",
    type: "text",
    value: "Custom text content",
  };

  const builder = text()
    .withId("custom-text-id")
    .withValue("Custom text content");

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with empty value", () => {
  const expected: TextAsset = {
    id: "parent-text",
    type: "text",
    value: "",
  };

  const builder = text().withValue("");

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with complex binding", () => {
  const expected: TextAsset = {
    id: "parent-text",
    type: "text",
    value: "{{user.profile.displayName}}",
  };

  const builder = text().withValue(b`user.profile.displayName`);

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with all properties", () => {
  const expected: TextAsset = {
    id: "complete-text",
    type: "text",
    value: "{{messages.welcome}}",
    modifiers: [
      { type: "tag", name: "greeting" },
      { type: "style", name: "large" },
      { type: "color", value: "primary" },
    ],
  };

  const builder = text()
    .withId("complete-text")
    .withValue(b`messages.welcome`)
    .withModifiers([
      { type: "tag", name: "greeting" },
      { type: "style", name: "large" },
      { type: "color", value: "primary" },
    ]);

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});

test("text with numeric and boolean modifiers", () => {
  const expected: TextAsset = {
    id: "parent-text",
    type: "text",
    value: "Styled content",
    modifiers: [
      { type: "fontSize", value: 16 },
      { type: "bold", value: true },
      { type: "italic", value: false },
    ],
  };

  const builder = text()
    .withValue("Styled content")
    .withModifiers([
      { type: "fontSize", value: 16 },
      { type: "bold", value: true },
      { type: "italic", value: false },
    ]);

  expect(builder({ parentId: "parent-text" })).toStrictEqual(expected);
});
