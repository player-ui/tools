import { test, expect } from "vitest";
import { binding as b, expression as e } from "../../tagged-template";
import type { ActionAsset } from "../types/action";
import { action, text } from "../builder";

test("action with basic properties", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "next",
  };

  const builder = action().withValue("next");

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with label", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "submit",
    label: {
      asset: {
        id: "parent-action-label",
        type: "text",
        value: "Submit Form",
      },
    },
  };

  const builder = action()
    .withValue("submit")
    .withLabel(text().withValue("Submit Form"));

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with expression", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "continue",
    exp: "@[showModal()]@",
  };

  const builder = action()
    .withValue("continue")
    .withExp(e`showModal()`);

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with accessibility", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "save",
    accessibility: "Save the current form data",
  };

  const builder = action()
    .withValue("save")
    .withAccessibility("Save the current form data");

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with metadata beacon", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "track",
    metaData: {
      beacon: "user_clicked_track",
    },
  };

  const builder = action()
    .withValue("track")
    .withMetaDataBeacon("user_clicked_track");

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with metadata skip validation", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "skip",
    metaData: {
      skipValidation: true,
    },
  };

  const builder = action().withValue("skip").withMetaDataSkipValidation(true);

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with metadata role", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "primary",
    metaData: {
      role: "primary",
    },
  };

  const builder = action().withValue("primary").withMetaDataRole("primary");

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with complete metadata", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "complete",
    metaData: {
      beacon: "completion_event",
      skipValidation: false,
      role: "secondary",
    },
  };

  const builder = action().withValue("complete").withMetaData({
    beacon: "completion_event",
    skipValidation: false,
    role: "secondary",
  });

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with custom id", () => {
  const expected: ActionAsset = {
    id: "custom-action-id",
    type: "action",
    value: "custom",
  };

  const builder = action().withId("custom-action-id").withValue("custom");

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with binding in expression", () => {
  const expected: ActionAsset = {
    id: "parent-action",
    type: "action",
    value: "dynamic",
    exp: "@[canProceed({{user}})]@",
  };

  const builder = action()
    .withValue("dynamic")
    .withExp(e`canProceed(${b`user`})`);

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});

test("action with all properties", () => {
  const expected: ActionAsset = {
    id: "complete-action",
    type: "action",
    value: "finalize",
    label: {
      asset: {
        id: "complete-action-label",
        type: "text",
        value: "Finalize Process",
      },
    },
    exp: "@[validateAndProceed()]@",
    accessibility: "Complete the process and proceed to next step",
    metaData: {
      beacon: "process_finalized",
      skipValidation: false,
      role: "primary",
    },
  };

  const builder = action()
    .withId("complete-action")
    .withValue("finalize")
    .withLabel(text().withValue("Finalize Process"))
    .withExp(e`validateAndProceed()`)
    .withAccessibility("Complete the process and proceed to next step")
    .withMetaData({
      beacon: "process_finalized",
      skipValidation: false,
      role: "primary",
    });

  expect(builder({ parentId: "parent-action" })).toStrictEqual(expected);
});
