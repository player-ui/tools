import { test, expect } from "vitest";
import { binding as b } from "../../tagged-template";
import type { ChoiceItem } from "../types/choice";
import { choiceItem, text } from "../builder";

test("choice item with basic properties", () => {
  const expected: ChoiceItem = {
    id: "parent-choice-item",
    value: "option1",
  };

  const builder = choiceItem().withValue("option1");

  expect(builder({ parentId: "parent-choice-item" })).toStrictEqual(expected);
});

test("choice item with label", () => {
  const expected: ChoiceItem = {
    id: "parent-choice-item",
    value: "option2",
    label: {
      asset: {
        id: "parent-choice-item-label",
        type: "text",
        value: "Second Option",
      },
    },
  };

  const builder = choiceItem()
    .withValue("option2")
    .withLabel(text().withValue("Second Option"));

  expect(builder({ parentId: "parent-choice-item" })).toStrictEqual(expected);
});

test("choice item with binding value", () => {
  const expected: ChoiceItem = {
    id: "parent-choice-item",
    value: "{{user.selectedValue}}",
  };

  const builder = choiceItem().withValue(b`user.selectedValue`);

  expect(builder({ parentId: "parent-choice-item" })).toStrictEqual(expected);
});

test("choice item with custom id", () => {
  const expected: ChoiceItem = {
    id: "custom-choice-item",
    value: "custom-value",
  };

  const builder = choiceItem()
    .withId("custom-choice-item")
    .withValue("custom-value");

  expect(builder({ parentId: "parent-choice-item" })).toStrictEqual(expected);
});

test("choice item with label and binding value", () => {
  const expected: ChoiceItem = {
    id: "parent-choice-item",
    value: "{{options.selected}}",
    label: {
      asset: {
        id: "parent-choice-item-label",
        type: "text",
        value: "{{options.displayName}}",
      },
    },
  };

  const builder = choiceItem()
    .withValue(b`options.selected`)
    .withLabel(text().withValue(b`options.displayName`));

  expect(builder({ parentId: "parent-choice-item" })).toStrictEqual(expected);
});

test("choice item with all properties", () => {
  const expected: ChoiceItem = {
    id: "complete-choice-item",
    value: "complete-value",
    label: {
      asset: {
        id: "complete-choice-item-label",
        type: "text",
        value: "Complete Option",
      },
    },
  };

  const builder = choiceItem()
    .withId("complete-choice-item")
    .withValue("complete-value")
    .withLabel(text().withValue("Complete Option"));

  expect(builder({ parentId: "parent-choice-item" })).toStrictEqual(expected);
});
