import { describe, test, expect, beforeEach } from "vitest";
import { text, collection, action } from "../../mocks/generated";
import { resetGlobalIdSet } from "../";
import { binding as b } from "../../tagged-template";

describe("FluentPartial - Constructor with TaggedTemplateValue", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("text() accepts TaggedTemplateValue in constructor for value property", () => {
    const textAsset = text({ value: b`foo.bar` }).build({ parentId: "view-1" });

    expect(textAsset).toMatchObject({
      id: "view-1-text",
      type: "text",
      value: "{{foo.bar}}",
    });
  });

  test("text() accepts TaggedTemplateValue in constructor for id property", () => {
    const textAsset = text({ id: b`dynamicId` })
      .withValue("Hello")
      .build();

    expect(textAsset).toMatchObject({
      id: "{{dynamicId}}",
      type: "text",
      value: "Hello",
    });
  });

  test("action() accepts nested objects with TaggedTemplateValue in constructor", () => {
    // Using beacon which accepts string, not role which has a union type
    const actionAsset = action({
      value: "submit",
      metaData: { beacon: b`data.beacon` },
    }).build({ parentId: "view-1" });

    expect(actionAsset).toMatchObject({
      id: "view-1-action-submit",
      type: "action",
      value: "submit",
      metaData: { beacon: "{{data.beacon}}" },
    });
  });

  test("collection() accepts FluentBuilder in constructor for label property", () => {
    const collectionAsset = collection({
      label: text().withValue("Title"),
    }).build({ parentId: "view-1" });

    expect(collectionAsset).toMatchObject({
      id: "view-1-collection",
      type: "collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Title",
        },
      },
    });
  });

  test("collection() accepts array of FluentBuilders in constructor for values property", () => {
    const collectionAsset = collection({
      values: [text().withValue("Item 1"), text().withValue("Item 2")],
    }).build({ parentId: "view-1" });

    expect(collectionAsset).toMatchObject({
      id: "view-1-collection",
      type: "collection",
      values: [
        {
          asset: {
            id: "view-1-collection-values-0-text",
            type: "text",
            value: "Item 1",
          },
        },
        {
          asset: {
            id: "view-1-collection-values-1-text",
            type: "text",
            value: "Item 2",
          },
        },
      ],
    });
  });
});

describe("ConditionalValue - if/ifElse with Array<AssetWrapper>", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("if() accepts array of builders for Array<AssetWrapper> property (values)", () => {
    const hasValues = true;

    const collectionAsset = collection()
      .withLabel(text().withValue("List"))
      .if(() => hasValues, "values", [
        text().withValue("Item 1"),
        text().withValue("Item 2"),
        text().withValue("Item 3"),
      ])
      .build({ parentId: "view-1" });

    expect(collectionAsset.values).toHaveLength(3);
    expect(collectionAsset.values?.[0]?.asset).toMatchObject({
      type: "text",
      value: "Item 1",
    });
    expect(collectionAsset.values?.[2]?.asset).toMatchObject({
      type: "text",
      value: "Item 3",
    });
  });

  test("ifElse() accepts arrays of builders for Array<AssetWrapper> property (actions)", () => {
    const showPrimary = false;

    const collectionAsset = collection()
      .withLabel(text().withValue("Actions"))
      .ifElse(
        () => showPrimary,
        "actions",
        [action().withValue("save").withLabel(text().withValue("Save"))],
        [
          action().withValue("edit").withLabel(text().withValue("Edit")),
          action().withValue("delete").withLabel(text().withValue("Delete")),
        ],
      )
      .build({ parentId: "view-1" });

    expect(collectionAsset.actions).toHaveLength(2);
    expect(collectionAsset.actions?.[0]?.asset).toMatchObject({
      type: "action",
      value: "edit",
    });
    expect(collectionAsset.actions?.[1]?.asset).toMatchObject({
      type: "action",
      value: "delete",
    });
  });

  test("if() with false predicate does not set array property", () => {
    const hasValues = false;

    const collectionAsset = collection()
      .withLabel(text().withValue("List"))
      .if(() => hasValues, "values", [
        text().withValue("Item 1"),
        text().withValue("Item 2"),
      ])
      .build({ parentId: "view-1" });

    expect(collectionAsset.values).toBeUndefined();
  });

  test("if() accepts function returning array of builders", () => {
    const getItems = () => [
      text().withValue("Dynamic 1"),
      text().withValue("Dynamic 2"),
    ];

    const collectionAsset = collection()
      .if(() => true, "values", getItems)
      .build({ parentId: "view-1" });

    expect(collectionAsset.values).toHaveLength(2);
    expect(collectionAsset.values?.[0]?.asset).toMatchObject({
      type: "text",
      value: "Dynamic 1",
    });
  });
});
