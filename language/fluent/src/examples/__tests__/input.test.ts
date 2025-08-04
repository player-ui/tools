import { test, expect, beforeEach } from "vitest";
import { binding as b } from "../../tagged-template";
import type { InputAsset } from "../types/input";
import { input, text } from "../builder";
import { globalIdRegistry } from "../../id-generator";

beforeEach(() => {
  // Reset the global registry before each test
  globalIdRegistry.reset();
});

test("input with basic binding", () => {
  const expected: InputAsset = {
    id: "parent-input",
    type: "input",
    binding: "{{user.name}}",
  };

  const builder = input().withBinding(b`user.name`);

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});

test("input with string binding", () => {
  const expected: InputAsset = {
    id: "parent-input",
    type: "input",
    binding: "user.email",
  };

  const builder = input().withBinding("user.email");

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});

test("input with label", () => {
  const expected: InputAsset = {
    id: "parent-input",
    type: "input",
    binding: "{{user.firstName}}",
    label: {
      asset: {
        id: "parent-input-label",
        type: "text",
        value: "First Name",
      },
    },
  };

  const builder = input()
    .withBinding(b`user.firstName`)
    .withLabel(text().withValue("First Name"));

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});

test("input with note", () => {
  const expected: InputAsset = {
    id: "parent-input",
    type: "input",
    binding: "{{user.password}}",
    note: {
      asset: {
        id: "parent-input-note",
        type: "text",
        value: "Must be at least 8 characters",
      },
    },
  };

  const builder = input()
    .withBinding(b`user.password`)
    .withNote(text().withValue("Must be at least 8 characters"));

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});

test("input with metadata beacon", () => {
  const expected: InputAsset = {
    id: "parent-input",
    type: "input",
    binding: "{{form.searchTerm}}",
    metaData: {
      beacon: "search_input_changed",
    },
  };

  const builder = input()
    .withBinding(b`form.searchTerm`)
    .withMetaDataBeacon("search_input_changed");

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});

test("input with complete metadata", () => {
  const expected: InputAsset = {
    id: "parent-input",
    type: "input",
    binding: "{{user.preferences}}",
    metaData: {
      beacon: "preferences_updated",
    },
  };

  const builder = input()
    .withBinding(b`user.preferences`)
    .withMetaData({
      beacon: "preferences_updated",
    });

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});

test("input with custom id", () => {
  const expected: InputAsset = {
    id: "custom-input-id",
    type: "input",
    binding: "{{form.customField}}",
  };

  const builder = input()
    .withId("custom-input-id")
    .withBinding(b`form.customField`);

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});

test("input with all properties", () => {
  const expected: InputAsset = {
    id: "complete-input",
    type: "input",
    binding: "{{user.profile.bio}}",
    label: {
      asset: {
        id: "complete-input-label",
        type: "text",
        value: "Biography",
      },
    },
    note: {
      asset: {
        id: "complete-input-note",
        type: "text",
        value: "Tell us about yourself (optional)",
      },
    },
    metaData: {
      beacon: "bio_updated",
    },
  };

  const builder = input()
    .withId("complete-input")
    .withBinding(b`user.profile.bio`)
    .withLabel(text().withValue("Biography"))
    .withNote(text().withValue("Tell us about yourself (optional)"))
    .withMetaDataBeacon("bio_updated");

  expect(builder({ parentId: "parent-input" })).toStrictEqual(expected);
});
