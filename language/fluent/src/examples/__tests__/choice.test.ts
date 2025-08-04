import { test, expect } from "vitest";
import { binding as b } from "../../tagged-template";
import type { ChoiceAsset } from "../types/choice";
import { choice, text, choiceItem } from "../builder";

test("choice with basic properties", () => {
  const expected: ChoiceAsset = {
    id: "parent-choice",
    type: "choice",
    binding: "{{user.selection}}",
  };

  const builder = choice().withBinding(b`user.selection`);

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});

test("choice with title", () => {
  const expected: ChoiceAsset = {
    id: "parent-choice",
    type: "choice",
    title: {
      asset: {
        id: "parent-choice-title",
        type: "text",
        value: "Select an option",
      },
    },
  };

  const builder = choice().withTitle(text().withValue("Select an option"));

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});

test("choice with note", () => {
  const expected: ChoiceAsset = {
    id: "parent-choice",
    type: "choice",
    note: {
      asset: {
        id: "parent-choice-note",
        type: "text",
        value: "Please choose one option",
      },
    },
  };

  const builder = choice().withNote(
    text().withValue("Please choose one option"),
  );

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});

test("choice with items", () => {
  const expected: ChoiceAsset = {
    id: "parent-choice",
    type: "choice",
    items: [
      {
        id: "parent-choice-items-0",
        value: "option1",
        label: {
          asset: {
            id: "parent-choice-items-0-label",
            type: "text",
            value: "First Option",
          },
        },
      },
      {
        id: "parent-choice-items-1",
        value: "option2",
        label: {
          asset: {
            id: "parent-choice-items-1-label",
            type: "text",
            value: "Second Option",
          },
        },
      },
    ],
  };

  const builder = choice().withItems([
    choiceItem()
      .withValue("option1")
      .withLabel(text().withValue("First Option")),
    choiceItem()
      .withValue("option2")
      .withLabel(text().withValue("Second Option")),
  ]);

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});

test("choice with metadata beacon", () => {
  const expected: ChoiceAsset = {
    id: "parent-choice",
    type: "choice",
    binding: "{{user.preference}}",
    metaData: {
      beacon: "choice_selected",
    },
  };

  const builder = choice()
    .withBinding(b`user.preference`)
    .withMetaDataBeacon("choice_selected");

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});

test("choice with complete metadata", () => {
  const expected: ChoiceAsset = {
    id: "parent-choice",
    type: "choice",
    binding: "{{user.settings}}",
    metaData: {
      beacon: "settings_changed",
    },
  };

  const builder = choice()
    .withBinding(b`user.settings`)
    .withMetaData({
      beacon: "settings_changed",
    });

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});

test("choice with custom id", () => {
  const expected: ChoiceAsset = {
    id: "custom-choice-id",
    type: "choice",
    binding: "{{form.choice}}",
  };

  const builder = choice()
    .withId("custom-choice-id")
    .withBinding(b`form.choice`);

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});

test("choice with all properties", () => {
  const expected: ChoiceAsset = {
    id: "complete-choice",
    type: "choice",
    title: {
      asset: {
        id: "complete-choice-title",
        type: "text",
        value: "Choose your preference",
      },
    },
    note: {
      asset: {
        id: "complete-choice-note",
        type: "text",
        value: "This selection affects your experience",
      },
    },
    binding: "{{user.experience}}",
    items: [
      {
        id: "complete-choice-items-0",
        value: "basic",
        label: {
          asset: {
            id: "complete-choice-items-0-label",
            type: "text",
            value: "Basic Experience",
          },
        },
      },
      {
        id: "complete-choice-items-1",
        value: "advanced",
        label: {
          asset: {
            id: "complete-choice-items-1-label",
            type: "text",
            value: "Advanced Experience",
          },
        },
      },
    ],
    metaData: {
      beacon: "experience_selected",
    },
  };

  const builder = choice()
    .withId("complete-choice")
    .withTitle(text().withValue("Choose your preference"))
    .withNote(text().withValue("This selection affects your experience"))
    .withBinding(b`user.experience`)
    .withItems([
      choiceItem()
        .withValue("basic")
        .withLabel(text().withValue("Basic Experience")),
      choiceItem()
        .withValue("advanced")
        .withLabel(text().withValue("Advanced Experience")),
    ])
    .withMetaDataBeacon("experience_selected");

  expect(builder({ parentId: "parent-choice" })).toStrictEqual(expected);
});
