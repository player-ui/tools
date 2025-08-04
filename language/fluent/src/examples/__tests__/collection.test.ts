import { test, expect, beforeEach } from "vitest";
import { template } from "../../template";
import { binding as b } from "../../tagged-template";
import type { CollectionAsset } from "../types/collection";
import { text, collection, input, action } from "../builder";
import { globalIdRegistry } from "../../id-generator";

beforeEach(() => {
  // Reset the global registry before each test
  globalIdRegistry.reset();
});

test("collection with template", () => {
  const t = template({
    data: b`list.of.items`,
    output: "values",
    value: text().withValue(b`list.of.items._index_.name`),
  });

  const expected: CollectionAsset = {
    id: "parent-topic",
    type: "collection",
    template: [
      {
        data: "{{list.of.items}}",
        output: "values",
        value: {
          asset: {
            id: "parent-topic-_index_",
            type: "text",
            value: "{{list.of.items._index_.name}}",
          },
        },
      },
    ],
  };

  const builder = collection().withTemplate(t);

  expect(builder({ parentId: "parent-topic" })).toStrictEqual(expected);
});

test("collection with basic structure", () => {
  const expected: CollectionAsset = {
    id: "parent-collection",
    type: "collection",
  };

  const builder = collection();

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});

test("collection with label", () => {
  const expected: CollectionAsset = {
    id: "parent-collection",
    type: "collection",
    label: {
      asset: {
        id: "parent-collection-label",
        type: "text",
        value: "Collection Title",
      },
    },
  };

  const builder = collection().withLabel(text().withValue("Collection Title"));

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});

test("collection with values", () => {
  const expected: CollectionAsset = {
    id: "parent-collection",
    type: "collection",
    values: [
      {
        asset: {
          id: "parent-collection-values-0",
          type: "text",
          value: "First Item",
        },
      },
      {
        asset: {
          id: "parent-collection-values-1",
          type: "text",
          value: "Second Item",
        },
      },
    ],
  };

  const builder = collection().withValues([
    text().withValue("First Item"),
    text().withValue("Second Item"),
  ]);

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});

test("collection with mixed value types", () => {
  const expected: CollectionAsset = {
    id: "parent-collection",
    type: "collection",
    values: [
      {
        asset: {
          id: "parent-collection-values-0",
          type: "text",
          value: "Text Item",
        },
      },
      {
        asset: {
          id: "parent-collection-values-1",
          type: "input",
          binding: "{{user.name}}",
        },
      },
      {
        asset: {
          id: "parent-collection-values-2",
          type: "action",
          value: "submit",
          label: {
            asset: {
              id: "parent-collection-values-2-label",
              type: "text",
              value: "Submit",
            },
          },
        },
      },
    ],
  };

  const builder = collection().withValues([
    text().withValue("Text Item"),
    input().withBinding(b`user.name`),
    action().withValue("submit").withLabel(text().withValue("Submit")),
  ]);

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});

test("collection with custom id", () => {
  const expected: CollectionAsset = {
    id: "custom-collection-id",
    type: "collection",
    label: {
      asset: {
        id: "custom-collection-id-label",
        type: "text",
        value: "Custom Collection",
      },
    },
  };

  const builder = collection()
    .withId("custom-collection-id")
    .withLabel(text().withValue("Custom Collection"));

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});

test("collection with label and values", () => {
  const expected: CollectionAsset = {
    id: "parent-collection",
    type: "collection",
    label: {
      asset: {
        id: "parent-collection-label",
        type: "text",
        value: "User Information",
      },
    },
    values: [
      {
        asset: {
          id: "parent-collection-values-0",
          type: "input",
          binding: "{{user.firstName}}",
          label: {
            asset: {
              id: "parent-collection-values-0-label",
              type: "text",
              value: "First Name",
            },
          },
        },
      },
      {
        asset: {
          id: "parent-collection-values-1",
          type: "input",
          binding: "{{user.lastName}}",
          label: {
            asset: {
              id: "parent-collection-values-1-label",
              type: "text",
              value: "Last Name",
            },
          },
        },
      },
    ],
  };

  const builder = collection()
    .withLabel(text().withValue("User Information"))
    .withValues([
      input()
        .withBinding(b`user.firstName`)
        .withLabel(text().withValue("First Name")),
      input()
        .withBinding(b`user.lastName`)
        .withLabel(text().withValue("Last Name")),
    ]);

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});

test("collection with multiple templates", () => {
  const template1 = template({
    data: b`items.list1`,
    output: "values",
    value: text().withValue(b`items.list1._index_.name`),
  });

  const template2 = template({
    data: b`items.list2`,
    output: "values",
    value: input().withBinding(b`items.list2._index_.value`),
  });

  const expected: CollectionAsset = {
    id: "parent-collection",
    type: "collection",
    template: [
      {
        data: "{{items.list1}}",
        output: "values",
        value: {
          asset: {
            id: "parent-collection-_index_",
            type: "text",
            value: "{{items.list1._index_.name}}",
          },
        },
      },
      {
        data: "{{items.list2}}",
        output: "values",
        value: {
          asset: {
            id: "parent-collection-_index_",
            type: "input",
            binding: "{{items.list2._index_.value}}",
          },
        },
      },
    ],
  };

  const builder = collection().withTemplate(template1).withTemplate(template2);

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});

test("collection with all properties", () => {
  const t = template({
    data: b`dynamicItems`,
    output: "values",
    value: text().withValue(b`dynamicItems._index_.displayName`),
  });

  const expected: CollectionAsset = {
    id: "complete-collection",
    type: "collection",
    label: {
      asset: {
        id: "complete-collection-label",
        type: "text",
        value: "Complete Collection Example",
      },
    },
    values: [
      {
        asset: {
          id: "complete-collection-values-0",
          type: "text",
          value: "Static Item 1",
        },
      },
      {
        asset: {
          id: "complete-collection-values-1",
          type: "text",
          value: "Static Item 2",
        },
      },
    ],
    template: [
      {
        data: "{{dynamicItems}}",
        output: "values",
        value: {
          asset: {
            id: "complete-collection-_index_",
            type: "text",
            value: "{{dynamicItems._index_.displayName}}",
          },
        },
      },
    ],
  };

  const builder = collection()
    .withId("complete-collection")
    .withLabel(text().withValue("Complete Collection Example"))
    .withValues([
      text().withValue("Static Item 1"),
      text().withValue("Static Item 2"),
    ])
    .withTemplate(t);

  expect(builder({ parentId: "parent-collection" })).toStrictEqual(expected);
});
