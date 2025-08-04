import { test, expect } from "vitest";
import type { InfoAsset } from "../types/info";
import { info, text, action } from "../builder";

test("info with basic structure", () => {
  const expected: InfoAsset = {
    id: "parent-info",
    type: "info",
  };

  const builder = info();

  expect(builder({ parentId: "parent-info" })).toStrictEqual(expected);
});

test("info with title", () => {
  const expected: InfoAsset = {
    id: "parent-info",
    type: "info",
    title: {
      asset: {
        id: "parent-info-title",
        type: "text",
        value: "Welcome",
      },
    },
  };

  const builder = info().withTitle(text().withValue("Welcome"));

  expect(builder({ parentId: "parent-info" })).toStrictEqual(expected);
});

test("info with subtitle", () => {
  const expected: InfoAsset = {
    id: "parent-info",
    type: "info",
    subTitle: {
      asset: {
        id: "parent-info-subTitle",
        type: "text",
        value: "Getting Started",
      },
    },
  };

  const builder = info().withSubTitle(text().withValue("Getting Started"));

  expect(builder({ parentId: "parent-info" })).toStrictEqual(expected);
});

test("info with primary info", () => {
  const expected: InfoAsset = {
    id: "parent-info",
    type: "info",
    primaryInfo: {
      asset: {
        id: "parent-info-primaryInfo",
        type: "text",
        value: "This is the main content of the info view.",
      },
    },
  };

  const builder = info().withPrimaryInfo(
    text().withValue("This is the main content of the info view."),
  );

  expect(builder({ parentId: "parent-info" })).toStrictEqual(expected);
});

test("info with actions", () => {
  const expected: InfoAsset = {
    id: "parent-info",
    type: "info",
    actions: [
      {
        asset: {
          id: "parent-info-actions-0",
          type: "action",
          value: "continue",
          label: {
            asset: {
              id: "parent-info-actions-0-label",
              type: "text",
              value: "Continue",
            },
          },
        },
      },
      {
        asset: {
          id: "parent-info-actions-1",
          type: "action",
          value: "back",
          label: {
            asset: {
              id: "parent-info-actions-1-label",
              type: "text",
              value: "Go Back",
            },
          },
        },
      },
    ],
  };

  const builder = info().withActions([
    action().withValue("continue").withLabel(text().withValue("Continue")),
    action().withValue("back").withLabel(text().withValue("Go Back")),
  ]);

  expect(builder({ parentId: "parent-info" })).toStrictEqual(expected);
});

test("info with custom id", () => {
  const expected: InfoAsset = {
    id: "custom-info-id",
    type: "info",
    title: {
      asset: {
        id: "custom-info-id-title",
        type: "text",
        value: "Custom Info",
      },
    },
  };

  const builder = info()
    .withId("custom-info-id")
    .withTitle(text().withValue("Custom Info"));

  expect(builder({ parentId: "parent-info" })).toStrictEqual(expected);
});

test("info with all properties", () => {
  const expected: InfoAsset = {
    id: "complete-info",
    type: "info",
    title: {
      asset: {
        id: "complete-info-title",
        type: "text",
        value: "Complete Information",
      },
    },
    subTitle: {
      asset: {
        id: "complete-info-subTitle",
        type: "text",
        value: "All the details you need",
      },
    },
    primaryInfo: {
      asset: {
        id: "complete-info-primaryInfo",
        type: "text",
        value: "This info view contains all possible properties configured.",
      },
    },
    actions: [
      {
        asset: {
          id: "complete-info-actions-0",
          type: "action",
          value: "proceed",
          label: {
            asset: {
              id: "complete-info-actions-0-label",
              type: "text",
              value: "Proceed",
            },
          },
        },
      },
      {
        asset: {
          id: "complete-info-actions-1",
          type: "action",
          value: "cancel",
          label: {
            asset: {
              id: "complete-info-actions-1-label",
              type: "text",
              value: "Cancel",
            },
          },
        },
      },
    ],
  };

  const builder = info()
    .withId("complete-info")
    .withTitle(text().withValue("Complete Information"))
    .withSubTitle(text().withValue("All the details you need"))
    .withPrimaryInfo(
      text().withValue(
        "This info view contains all possible properties configured.",
      ),
    )
    .withActions([
      action().withValue("proceed").withLabel(text().withValue("Proceed")),
      action().withValue("cancel").withLabel(text().withValue("Cancel")),
    ]);

  expect(builder({ parentId: "parent-info" })).toStrictEqual(expected);
});
