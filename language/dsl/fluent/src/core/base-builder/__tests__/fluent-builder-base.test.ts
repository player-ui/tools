import { describe, test, expect, beforeEach } from "vitest";
import type { Asset } from "@player-ui/types";
import type { TextAsset } from "../../mocks/types/text";
import {
  action,
  text,
  input,
  collection,
  choice,
  choiceItem,
} from "../../mocks/generated";
import { resetGlobalIdSet } from "../";
import { binding as b, expression as e } from "../../tagged-template";
import { template } from "../../template";
import { Collection } from "../../mocks/types/collection";
import { InputAsset } from "../../mocks/types/input";
import { ActionAsset } from "../../mocks/types/action";

describe("FluentBuilderBase - Basic Asset Creation", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("creates a simple text asset with auto-generated ID", () => {
    const textAsset = text()
      .withValue("Hello World")
      .build({ parentId: "view-1" });

    expect(textAsset).toMatchObject({
      id: "view-1-text",
      type: "text",
      value: "Hello World",
    });
  });

  test("creates an asset with explicit ID", () => {
    const textAsset = text()
      .withValue("Hello World")
      .withId("custom-id")
      .build({ parentId: "view-1" });

    expect(textAsset.id).toBe("custom-id");
  });

  test("creates an action asset with metadata", () => {
    const actionAsset = action()
      .withValue("next")
      .withLabel(text().withValue("Continue"))
      .withMetaData({
        role: "primary",
        size: "large",
      })
      .build({ parentId: "view-1" });

    expect(actionAsset).toMatchObject({
      id: "view-1-action-next",
      type: "action",
      value: "next",
      metaData: {
        role: "primary",
        size: "large",
      },
    });
  });

  test("creates an input asset with binding", () => {
    const inputAsset = input()
      .withBinding(b`user.firstName`)
      .withLabel(text().withValue("First Name"))
      .withPlaceholder("Enter your first name")
      .build({ parentId: "view-1" });

    expect(inputAsset).toMatchObject({
      id: "view-1-input-firstName",
      type: "input",
      binding: "user.firstName", // binding property gets raw value without {{}}
      placeholder: "Enter your first name",
    });
  });

  test("generates unique IDs for multiple assets of same type", () => {
    const context = { parentId: "view-1" };

    const text1 = text().withValue("First").build(context);
    const text2 = text().withValue("Second").build(context);
    const text3 = text().withValue("Third").build(context);

    expect(text1.id).toBe("view-1-text");
    expect(text2.id).toBe("view-1-text-1");
    expect(text3.id).toBe("view-1-text-2");
  });
});

describe("FluentBuilderBase - Nested Assets with ID Hierarchy", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("creates nested assets with proper ID hierarchy", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Options"))
      .withValues([
        text().withValue("Option 1"),
        text().withValue("Option 2"),
        text().withValue("Option 3"),
      ])
      .build({ parentId: "view-1" });

    expect(collectionAsset.id).toBe("view-1-collection");

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Options",
        },
      },
      type: "collection",
      values: [
        {
          asset: {
            id: "view-1-collection-values-0-text",
            type: "text",
            value: "Option 1",
          },
        },
        {
          asset: {
            id: "view-1-collection-values-1-text",
            type: "text",
            value: "Option 2",
          },
        },
        {
          asset: {
            id: "view-1-collection-values-2-text",
            type: "text",
            value: "Option 3",
          },
        },
      ],
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("creates deeply nested asset structure", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Actions"))
      .withActions([
        action().withValue("submit").withLabel(text().withValue("Submit")),
        action().withValue("cancel").withLabel(text().withValue("Cancel")),
      ])
      .build({ parentId: "view-1" });

    const expected: Collection = {
      actions: [
        {
          asset: {
            id: "view-1-collection-actions-0-action-submit",
            label: {
              asset: {
                id: "view-1-collection-actions-0-action-submit-label-text",
                type: "text",
                value: "Submit",
              },
            },
            type: "action",
            value: "submit",
          },
        },
        {
          asset: {
            id: "view-1-collection-actions-1-action-cancel",
            label: {
              asset: {
                id: "view-1-collection-actions-1-action-cancel-label-text",
                type: "text",
                value: "Cancel",
              },
            },
            type: "action",
            value: "cancel",
          },
        },
      ],
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Actions",
        },
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("handles mixed arrays with builders and plain objects", () => {
    const collectionAsset = collection()
      .withValues([
        text().withValue("Built with builder"),
        { id: "manual-1", type: "text", value: "Manual object" } as TextAsset,
        text().withValue("Another builder"),
      ])
      .build({ parentId: "view-1" });

    const expected: Collection["values"] = [
      {
        asset: {
          id: "view-1-collection-values-0-text",
          type: "text",
          value: "Built with builder",
        },
      },
      {
        asset: {
          id: "manual-1",
          type: "text",
          value: "Manual object",
        },
      },
      {
        asset: {
          id: "view-1-collection-values-2-text",
          type: "text",
          value: "Another builder",
        },
      },
    ];

    expect(collectionAsset.values).toMatchObject(expected);
  });
});

describe("FluentBuilderBase - Conditional Methods (if, ifElse)", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("conditionally sets property using if() when predicate is true", () => {
    const showPlaceholder = true;

    const inputAsset = input()
      .withBinding(b`user.email`)
      .withLabel(text().withValue("Email"))
      .if(() => showPlaceholder, "placeholder", "Enter your email address")
      .build({ parentId: "view-1" });

    const expected: InputAsset = {
      binding: "user.email",
      id: "view-1-input-email",
      label: {
        asset: {
          id: "view-1-input-email-label-text",
          type: "text",
          value: "Email",
        },
      },
      placeholder: "Enter your email address",
      type: "input",
    };

    expect(inputAsset).toMatchObject(expected);
  });

  test("does not set property using if() when predicate is false", () => {
    const showPlaceholder = false;

    const inputAsset = input()
      .withBinding(b`user.email`)
      .withLabel(text().withValue("Email"))
      .if(() => showPlaceholder, "placeholder", "Enter your email address")
      .build({ parentId: "view-1" });

    const expected: InputAsset = {
      binding: "user.email",
      id: "view-1-input-email",
      label: {
        asset: {
          id: "view-1-input-email-label-text",
          type: "text",
          value: "Email",
        },
      },
      type: "input",
    };

    expect(inputAsset).toMatchObject(expected);
  });

  test("conditionally sets property using ifElse() - true case", () => {
    const isPrimary = true;

    const actionAsset = action()
      .withLabel(text().withValue("Submit"))
      .ifElse(() => isPrimary, "value", "submit", "cancel")
      .ifElse(
        () => isPrimary,
        "metaData",
        { role: "primary", size: "large" },
        { role: "secondary", size: "medium" },
      )
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      id: "view-1-action-submit",
      label: {
        asset: {
          id: "view-1-action-submit-label-text",
          type: "text",
          value: "Submit",
        },
      },
      metaData: {
        role: "primary",
        size: "large",
      },
      type: "action",
      value: "submit",
    };

    expect(actionAsset).toMatchObject(expected);
  });

  test("conditionally sets property using ifElse() - false case", () => {
    const isPrimary = false;

    const actionAsset = action()
      .withLabel(text().withValue("Cancel"))
      .ifElse(() => isPrimary, "value", "submit", "cancel")
      .ifElse(
        () => isPrimary,
        "metaData",
        { role: "primary", size: "large" },
        { role: "secondary", size: "medium" },
      )
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      id: "view-1-action-cancel",
      label: {
        asset: {
          id: "view-1-action-cancel-label-text",
          type: "text",
          value: "Cancel",
        },
      },
      metaData: {
        role: "secondary",
        size: "medium",
      },
      type: "action",
      value: "cancel",
    };

    expect(actionAsset).toMatchObject(expected);
  });

  test("uses if() with simple value properties", () => {
    const includeAccessibility = true;

    const actionAsset = action()
      .withValue("next")
      .withLabel(text().withValue("Continue"))
      .if(
        () => includeAccessibility,
        "accessibility",
        "Click to continue to the next step",
      )
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      accessibility: "Click to continue to the next step",
      id: "view-1-action-next",
      label: {
        asset: {
          id: "view-1-action-next-label-text",
          type: "text",
          value: "Continue",
        },
      },
      type: "action",
      value: "next",
    };

    expect(actionAsset).toMatchObject(expected);
  });

  test("chains multiple if() calls", () => {
    const hasPlaceholder = true;
    const hasAccessibility = false;

    const actionAsset = action()
      .withValue("submit")
      .withLabel(text().withValue("Submit"))
      .if(() => hasPlaceholder, "metaData", { role: "primary" })
      .if(() => hasAccessibility, "accessibility", "Submit button")
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      id: "view-1-action-submit",
      label: {
        asset: {
          id: "view-1-action-submit-label-text",
          type: "text",
          value: "Submit",
        },
      },
      metaData: {
        role: "primary",
      },
      type: "action",
      value: "submit",
    };

    expect(actionAsset).toMatchObject(expected);
  });

  test("uses predicate that accesses builder state", () => {
    const actionAsset = action()
      .withValue("next")
      .withLabel(text().withValue("Continue"))
      .if((builder) => builder.has("value"), "metaData", { role: "primary" })
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      id: "view-1-action-next",
      label: {
        asset: {
          id: "view-1-action-next-label-text",
          type: "text",
          value: "Continue",
        },
      },
      metaData: {
        role: "primary",
      },
      type: "action",
      value: "next",
    };

    expect(actionAsset).toMatchObject(expected);
  });

  test("uses if() with nested builder for AssetWrapper properties", () => {
    const includeLabel = true;

    const actionAsset = action()
      .withValue("submit")
      .if(() => includeLabel, "label", text().withValue("Submit"))
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      id: "view-1-action-submit",
      label: {
        asset: {
          id: "view-1-action-submit-label-text",
          type: "text",
          value: "Submit",
        },
      },
      type: "action",
      value: "submit",
    };

    expect(actionAsset).toMatchObject(expected);
  });

  test("uses ifElse() with nested builders for AssetWrapper properties", () => {
    const isActive = true;

    const actionAsset = action()
      .withValue("toggle")
      .ifElse(
        () => isActive,
        "label",
        text().withValue("Deactivate"),
        text().withValue("Activate"),
      )
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      id: "view-1-action-toggle",
      label: {
        asset: {
          id: "view-1-action-toggle-label-text",
          type: "text",
          value: "Deactivate",
        },
      },
      type: "action",
      value: "toggle",
    };

    expect(actionAsset).toMatchObject(expected);
  });

  test("uses if() with array of builders for AssetWrapper properties", () => {
    const hasValues = true;

    const collectionAsset = collection()
      .withLabel(text().withValue("List"))
      .if(() => hasValues, "values", [
        text().withValue("Item 1"),
        text().withValue("Item 2"),
        text().withValue("Item 3"),
      ])
      .build({ parentId: "view-1" });

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "List",
        },
      },
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
        {
          asset: {
            id: "view-1-collection-values-2-text",
            type: "text",
            value: "Item 3",
          },
        },
      ],
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("uses ifElse() with arrays of builders", () => {
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

    const expected: Collection = {
      actions: [
        {
          asset: {
            id: "view-1-collection-actions-0-action-edit",
            label: {
              asset: {
                id: "view-1-collection-actions-0-action-edit-label-text",
                type: "text",
                value: "Edit",
              },
            },
            type: "action",
            value: "edit",
          },
        },
        {
          asset: {
            id: "view-1-collection-actions-1-action-delete",
            label: {
              asset: {
                id: "view-1-collection-actions-1-action-delete-label-text",
                type: "text",
                value: "Delete",
              },
            },
            type: "action",
            value: "delete",
          },
        },
      ],
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Actions",
        },
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("uses if() with function that returns a builder", () => {
    const useCustomLabel = true;

    const actionAsset = action()
      .withValue("submit")
      .if(
        () => useCustomLabel,
        "label",
        () => text().withValue("Custom Submit"),
      )
      .build({ parentId: "view-1" });

    const expected: ActionAsset = {
      id: "view-1-action-submit",
      label: {
        asset: {
          id: "view-1-action-submit-label-text",
          type: "text",
          value: "Custom Submit",
        },
      },
      type: "action",
      value: "submit",
    };

    expect(actionAsset).toMatchObject(expected);
  });
});

describe("FluentBuilderBase - Template Integration", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("creates a collection with template for dynamic values", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Users"))
      .template(
        template({
          data: b`users`,
          output: "values",
          value: text().withValue(b`users._index_.name`),
        }),
      )
      .build({ parentId: "view-1" });

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Users",
        },
      },
      template: [
        {
          data: "{{users}}",
          output: "values",
          value: {
            asset: {
              id: "view-1-_index_-text",
              type: "text",
              value: "{{users._index_.name}}",
            },
          },
        },
      ],
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("creates a dynamic template", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Items"))
      .template(
        template({
          data: b`items`,
          output: "values",
          dynamic: true,
          value: text().withValue(b`items._index_.label`),
        }),
      )
      .build({ parentId: "view-1" });

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Items",
        },
      },
      template: [
        {
          data: "{{items}}",
          dynamic: true,
          output: "values",
          value: {
            asset: {
              id: "view-1-_index_-text",
              type: "text",
              value: "{{items._index_.label}}",
            },
          },
        },
      ],
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("creates multiple templates on same asset", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Mixed"))
      .template(
        template({
          data: b`primaryItems`,
          output: "values",
          value: text().withValue(b`primaryItems._index_`),
        }),
      )
      .template(
        template({
          data: b`secondaryItems`,
          output: "values",
          value: text().withValue(b`secondaryItems._index_`),
        }),
      )
      .build({ parentId: "view-1" });

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Mixed",
        },
      },
      template: [
        {
          data: "{{primaryItems}}",
          output: "values",
          value: {
            asset: {
              id: "view-1-_index_-text",
              type: "text",
              value: "{{primaryItems._index_}}",
            },
          },
        },
        {
          data: "{{secondaryItems}}",
          output: "values",
          value: {
            asset: {
              id: "view-1-1-_index_-text",
              type: "text",
              value: "{{secondaryItems._index_}}",
            },
          },
        },
      ],
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("creates template with complex nested asset", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Actions"))
      .template(
        template({
          data: b`actionList`,
          output: "values",
          value: action()
            .withValue(b`actionList._index_.transition`)
            .withLabel(text().withValue(b`actionList._index_.label`)),
        }),
      )
      .build({ parentId: "view-1" });

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Actions",
        },
      },
      template: [
        {
          data: "{{actionList}}",
          output: "values",
          value: {
            asset: {
              id: "view-1-_index_-action-transition",
              label: {
                asset: {
                  id: "view-1-_index_-action-transition-label-text",
                  type: "text",
                  value: "{{actionList._index_.label}}",
                },
              },
              type: "action",
              value: "{{actionList._index_.transition}}",
            },
          },
        },
      ],
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });
});

describe("FluentBuilderBase - Switch Integration", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("creates a static switch for asset property", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Title"))
      .switch(["label"], {
        cases: [
          {
            case: e`user.lang === 'es'`,
            asset: text().withValue("Título"),
          },
          {
            case: e`user.lang === 'fr'`,
            asset: text().withValue("Titre"),
          },
          {
            case: true,
            asset: text().withValue("Title"),
          },
        ],
      })
      .build({ parentId: "view-1" });

    const expected = {
      id: "view-1-collection",
      label: {
        staticSwitch: [
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-0-text",
              type: "text",
              value: "Título",
            },
            case: "@[user.lang === 'es']@",
          },
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-1-text",
              type: "text",
              value: "Titre",
            },
            case: "@[user.lang === 'fr']@",
          },
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-2-text",
              type: "text",
              value: "Title",
            },
            case: true,
          },
        ],
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("creates a dynamic switch", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Status"))
      .switch(["label"], {
        cases: [
          {
            case: e`status === 'active'`,
            asset: text().withValue("Active"),
          },
          {
            case: true,
            asset: text().withValue("Inactive"),
          },
        ],
        isDynamic: true,
      })
      .build({ parentId: "view-1" });

    const expected = {
      id: "view-1-collection",
      label: {
        dynamicSwitch: [
          {
            asset: {
              id: "view-1-collection-label-dynamicSwitch-0-text",
              type: "text",
              value: "Active",
            },
            case: "@[status === 'active']@",
          },
          {
            asset: {
              id: "view-1-collection-label-dynamicSwitch-1-text",
              type: "text",
              value: "Inactive",
            },
            case: true,
          },
        ],
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("creates multiple switches on same asset", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Label"))
      .withAdditionalInfo(text().withValue("Info"))
      .switch(["label"], {
        cases: [
          { case: e`lang === 'es'`, asset: text().withValue("Etiqueta") },
          { case: true, asset: text().withValue("Label") },
        ],
      })
      .switch(["additionalInfo"], {
        cases: [
          { case: e`lang === 'es'`, asset: text().withValue("Información") },
          { case: true, asset: text().withValue("Information") },
        ],
      })
      .build({ parentId: "view-1" });

    const expected = {
      additionalInfo: {
        staticSwitch: [
          {
            asset: {
              id: "view-1-collection-additionalInfo-staticSwitch-2-text",
              type: "text",
              value: "Información",
            },
            case: "@[lang === 'es']@",
          },
          {
            asset: {
              id: "view-1-collection-additionalInfo-staticSwitch-3-text",
              type: "text",
              value: "Information",
            },
            case: true,
          },
        ],
      },
      id: "view-1-collection",
      label: {
        staticSwitch: [
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-0-text",
              type: "text",
              value: "Etiqueta",
            },
            case: "@[lang === 'es']@",
          },
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-1-text",
              type: "text",
              value: "Label",
            },
            case: true,
          },
        ],
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("creates switch with complex nested assets", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Actions"))
      .switch(["actions"], {
        cases: [
          {
            case: e`user.canEdit`,
            asset: action()
              .withValue("edit")
              .withLabel(text().withValue("Edit")),
          },
          {
            case: true,
            asset: action()
              .withValue("view")
              .withLabel(text().withValue("View")),
          },
        ],
      })
      .build({ parentId: "view-1" });

    const expected = {
      actions: [
        {
          staticSwitch: [
            {
              asset: {
                id: "view-1-collection-actions-staticSwitch-0-action-edit",
                label: {
                  asset: {
                    id: "view-1-collection-actions-staticSwitch-0-action-edit-label-text",
                    type: "text",
                    value: "Edit",
                  },
                },
                type: "action",
                value: "edit",
              },
              case: "@[user.canEdit]@",
            },
            {
              asset: {
                id: "view-1-collection-actions-staticSwitch-1-action-view",
                label: {
                  asset: {
                    id: "view-1-collection-actions-staticSwitch-1-action-view-label-text",
                    type: "text",
                    value: "View",
                  },
                },
                type: "action",
                value: "view",
              },
              case: true,
            },
          ],
        },
      ],
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Actions",
        },
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("preserves explicit IDs in switch cases", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Label"))
      .switch(["label"], {
        cases: [
          {
            case: true,
            asset: text().withValue("Custom").withId("my-custom-id"),
          },
        ],
      })
      .build({ parentId: "view-1" });

    const expected = {
      id: "view-1-collection",
      label: {
        staticSwitch: [
          {
            asset: {
              id: "my-custom-id",
              type: "text",
              value: "Custom",
            },
            case: true,
          },
        ],
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });
});

describe("FluentBuilderBase - Complex Real-World Scenarios", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("creates a complete form view with conditional validation", () => {
    const requiresValidation = true;

    const formCollection = collection()
      .withLabel(text().withValue("User Registration"))
      .withValues([
        input()
          .withBinding(b`user.firstName`)
          .withLabel(text().withValue("First Name"))
          .withPlaceholder("Enter first name"),
        input()
          .withBinding(b`user.lastName`)
          .withLabel(text().withValue("Last Name"))
          .withPlaceholder("Enter last name"),
        input()
          .withBinding(b`user.email`)
          .withLabel(text().withValue("Email"))
          .withPlaceholder("Enter email"),
      ])
      .withActions([
        action()
          .withValue("submit")
          .withLabel(text().withValue("Register"))
          .withMetaData({ role: "primary", size: "large" })
          .if(() => requiresValidation, "validate", [
            "{{user.firstName}}",
            "{{user.lastName}}",
            "{{user.email}}",
          ]),
        action()
          .withValue("cancel")
          .withLabel(text().withValue("Cancel"))
          .withMetaData({ role: "secondary" }),
      ])
      .build({ parentId: "registration-view" });

    const expected: Collection = {
      actions: [
        {
          asset: {
            id: "registration-view-collection-actions-0-action-submit",
            label: {
              asset: {
                id: "registration-view-collection-actions-0-action-submit-label-text",
                type: "text",
                value: "Register",
              },
            },
            metaData: {
              role: "primary",
              size: "large",
            },
            type: "action",
            validate: [
              "{{user.firstName}}",
              "{{user.lastName}}",
              "{{user.email}}",
            ],
            value: "submit",
          },
        },
        {
          asset: {
            id: "registration-view-collection-actions-1-action-cancel",
            label: {
              asset: {
                id: "registration-view-collection-actions-1-action-cancel-label-text",
                type: "text",
                value: "Cancel",
              },
            },
            metaData: {
              role: "secondary",
            },
            type: "action",
            value: "cancel",
          },
        },
      ],
      id: "registration-view-collection",
      label: {
        asset: {
          id: "registration-view-collection-label-text",
          type: "text",
          value: "User Registration",
        },
      },
      type: "collection",
      values: [
        {
          asset: {
            binding: "user.firstName",
            id: "registration-view-collection-values-0-input-firstName",
            label: {
              asset: {
                id: "registration-view-collection-values-0-input-firstName-label-text",
                type: "text",
                value: "First Name",
              },
            },
            placeholder: "Enter first name",
            type: "input",
          },
        },
        {
          asset: {
            binding: "user.lastName",
            id: "registration-view-collection-values-1-input-lastName",
            label: {
              asset: {
                id: "registration-view-collection-values-1-input-lastName-label-text",
                type: "text",
                value: "Last Name",
              },
            },
            placeholder: "Enter last name",
            type: "input",
          },
        },
        {
          asset: {
            binding: "user.email",
            id: "registration-view-collection-values-2-input-email",
            label: {
              asset: {
                id: "registration-view-collection-values-2-input-email-label-text",
                type: "text",
                value: "Email",
              },
            },
            placeholder: "Enter email",
            type: "input",
          },
        },
      ],
    };

    expect(formCollection).toMatchObject(expected);
  });

  test("creates a dynamic list with template and internationalization switch", () => {
    const listCollection = collection()
      .switch(["label"], {
        cases: [
          {
            case: e`user.locale === 'es'`,
            asset: text().withValue("Lista de Usuarios"),
          },
          {
            case: e`user.locale === 'fr'`,
            asset: text().withValue("Liste des Utilisateurs"),
          },
          {
            case: true,
            asset: text().withValue("User List"),
          },
        ],
      })
      .template(
        template({
          data: b`users`,
          output: "values",
          dynamic: true,
          value: collection()
            .withLabel(text().withValue(b`users._index_.name`))
            .withValues([
              text().withValue(b`users._index_.email`),
              text().withValue(b`users._index_.role`),
            ]),
        }),
      )
      .build({ parentId: "user-list-view" });

    const expected = {
      id: "user-list-view-collection",
      label: {
        staticSwitch: [
          {
            asset: {
              id: "user-list-view-collection-label-staticSwitch-0-text",
              type: "text",
              value: "Lista de Usuarios",
            },
            case: "@[user.locale === 'es']@",
          },
          {
            asset: {
              id: "user-list-view-collection-label-staticSwitch-1-text",
              type: "text",
              value: "Liste des Utilisateurs",
            },
            case: "@[user.locale === 'fr']@",
          },
          {
            asset: {
              id: "user-list-view-collection-label-staticSwitch-2-text",
              type: "text",
              value: "User List",
            },
            case: true,
          },
        ],
      },
      template: [
        {
          data: "{{users}}",
          dynamic: true,
          output: "values",
          value: {
            asset: {
              id: "user-list-view-_index_-collection",
              label: {
                asset: {
                  id: "user-list-view-_index_-collection-label-text",
                  type: "text",
                  value: "{{users._index_.name}}",
                },
              },
              type: "collection",
              values: [
                {
                  asset: {
                    id: "user-list-view-_index_-collection-values-0-text",
                    type: "text",
                    value: "{{users._index_.email}}",
                  },
                },
                {
                  asset: {
                    id: "user-list-view-_index_-collection-values-1-text",
                    type: "text",
                    value: "{{users._index_.role}}",
                  },
                },
              ],
            },
          },
        },
      ],
      type: "collection",
    };

    expect(listCollection).toMatchObject(expected);
  });

  test("creates a wizard-style multi-step form with conditional actions", () => {
    const currentStep = 2;
    const totalSteps = 3;

    const stepCollection = collection()
      .withLabel(text().withValue(`Step ${currentStep} of ${totalSteps}`))
      .withValues([
        input()
          .withBinding(b`wizard.step${currentStep}.field1`)
          .withLabel(text().withValue("Field 1")),
        input()
          .withBinding(b`wizard.step${currentStep}.field2`)
          .withLabel(text().withValue("Field 2")),
      ])
      .withActions([
        action()
          .withValue("back")
          .withLabel(text().withValue("Back"))
          .withMetaData({ role: "back" })
          .if(() => currentStep > 1, "metaData", {
            role: "back",
            disabled: false,
          }),
        action()
          .ifElse(() => currentStep < totalSteps, "value", "next", "submit")
          .withLabel(
            currentStep < totalSteps
              ? text().withValue("Next")
              : text().withValue("Submit"),
          )
          .withMetaData({ role: "primary" }),
      ])
      .build({ parentId: "wizard-view" });

    const expected: Collection = {
      actions: [
        {
          asset: {
            id: "wizard-view-collection-actions-0-action-back",
            label: {
              asset: {
                id: "wizard-view-collection-actions-0-action-back-label-text",
                type: "text",
                value: "Back",
              },
            },
            metaData: {
              disabled: false,
              role: "back",
            },
            type: "action",
            value: "back",
          },
        },
        {
          asset: {
            id: "wizard-view-collection-actions-1-action-next",
            label: {
              asset: {
                id: "wizard-view-collection-actions-1-action-next-label-text",
                type: "text",
                value: "Next",
              },
            },
            metaData: {
              role: "primary",
            },
            type: "action",
            value: "next",
          },
        },
      ],
      id: "wizard-view-collection",
      label: {
        asset: {
          id: "wizard-view-collection-label-text",
          type: "text",
          value: "Step 2 of 3",
        },
      },
      type: "collection",
      values: [
        {
          asset: {
            binding: "wizard.step2.field1",
            id: "wizard-view-collection-values-0-input-field1",
            label: {
              asset: {
                id: "wizard-view-collection-values-0-input-field1-label-text",
                type: "text",
                value: "Field 1",
              },
            },
            type: "input",
          },
        },
        {
          asset: {
            binding: "wizard.step2.field2",
            id: "wizard-view-collection-values-1-input-field2",
            label: {
              asset: {
                id: "wizard-view-collection-values-1-input-field2-label-text",
                type: "text",
                value: "Field 2",
              },
            },
            type: "input",
          },
        },
      ],
    };

    expect(stepCollection).toMatchObject(expected);
  });

  test("creates a complex nested structure with all features combined", () => {
    const userRole = "admin";

    const collectionAsset = collection()
      // Conditional label based on user role
      .withLabel(
        userRole === "admin"
          ? text().withValue("Admin Dashboard")
          : text().withValue("User Dashboard"),
      )
      // Main content with template
      .template(
        template({
          data: b`sections`,
          output: "values",
          value: collection()
            .withLabel(text().withValue(b`sections._index_.title`))
            .withValues([text().withValue(b`sections._index_.description`)]),
        }),
      )
      // Actions with switch for internationalization
      .withActions([
        action()
          .withValue("save")
          .switch(["label"], {
            cases: [
              { case: e`lang === 'es'`, asset: text().withValue("Guardar") },
              {
                case: e`lang === 'fr'`,
                asset: text().withValue("Enregistrer"),
              },
              { case: true, asset: text().withValue("Save") },
            ],
          })
          .withMetaData({ role: "primary" }),
      ])
      .build({ parentId: "wizard-view" });

    const expected = {
      actions: [
        {
          asset: {
            id: "wizard-view-collection-actions-0-action-save",
            label: {
              staticSwitch: [
                {
                  asset: {
                    id: "wizard-view-collection-actions-0-action-save-label-staticSwitch-0-text",
                    type: "text",
                    value: "Guardar",
                  },
                  case: "@[lang === 'es']@",
                },
                {
                  asset: {
                    id: "wizard-view-collection-actions-0-action-save-label-staticSwitch-1-text",
                    type: "text",
                    value: "Enregistrer",
                  },
                  case: "@[lang === 'fr']@",
                },
                {
                  asset: {
                    id: "wizard-view-collection-actions-0-action-save-label-staticSwitch-2-text",
                    type: "text",
                    value: "Save",
                  },
                  case: true,
                },
              ],
            },
            metaData: {
              role: "primary",
            },
            type: "action",
            value: "save",
          },
        },
      ],
      id: "wizard-view-collection",
      label: {
        asset: {
          id: "wizard-view-collection-label-text",
          type: "text",
          value: "Admin Dashboard",
        },
      },
      template: [
        {
          data: "{{sections}}",
          output: "values",
          value: {
            asset: {
              id: "wizard-view-_index_-collection",
              label: {
                asset: {
                  id: "wizard-view-_index_-collection-label-text",
                  type: "text",
                  value: "{{sections._index_.title}}",
                },
              },
              type: "collection",
              values: [
                {
                  asset: {
                    id: "wizard-view-_index_-collection-values-0-text",
                    type: "text",
                    value: "{{sections._index_.description}}",
                  },
                },
              ],
            },
          },
        },
      ],
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });
});

describe("FluentBuilderBase - Type Compliance", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("generated assets comply with Asset interface", () => {
    const assets: Asset[] = [
      text().withValue("Test").build({ parentId: "view-1" }),
      input()
        .withBinding(b`test`)
        .withLabel(text().withValue("Test"))
        .build({ parentId: "view-1" }),
      action()
        .withValue("test")
        .withLabel(text().withValue("Test"))
        .build({ parentId: "view-1" }),
      collection()
        .withLabel(text().withValue("Test"))
        .build({ parentId: "view-1" }),
    ];

    const expected: Asset[] = [
      {
        id: "view-1-text",
        type: "text",
        value: "Test",
      },
      {
        binding: "test",
        id: "view-1-input-test",
        label: {
          asset: {
            id: "view-1-input-test-label-text",
            type: "text",
            value: "Test",
          },
        },
        type: "input",
      },
      {
        id: "view-1-action-test",
        label: {
          asset: {
            id: "view-1-action-test-label-text",
            type: "text",
            value: "Test",
          },
        },
        type: "action",
        value: "test",
      },
      {
        id: "view-1-collection",
        label: {
          asset: {
            id: "view-1-collection-label-text",
            type: "text",
            value: "Test",
          },
        },
        type: "collection",
      },
    ];

    expect(assets).toMatchObject(expected);
  });

  test("asset wrappers comply with AssetWrapper interface", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Test"))
      .build({ parentId: "view-1" });

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Test",
        },
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("switches comply with AssetWrapper interface", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Original"))
      .switch(["label"], {
        cases: [
          { case: e`test === 1`, asset: text().withValue("Case 1") },
          { case: true, asset: text().withValue("Default") },
        ],
      })
      .build({ parentId: "view-1" });

    const expected = {
      id: "view-1-collection",
      label: {
        staticSwitch: [
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-0-text",
              type: "text",
              value: "Case 1",
            },
            case: "@[test === 1]@",
          },
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-1-text",
              type: "text",
              value: "Default",
            },
            case: true,
          },
        ],
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("templates comply with Template interface", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Test"))
      .template(
        template({
          data: b`items`,
          output: "values",
          value: text().withValue(b`items._index_.name`),
        }),
      )
      .build({ parentId: "view-1" });

    const expected: Collection = {
      id: "view-1-collection",
      label: {
        asset: {
          id: "view-1-collection-label-text",
          type: "text",
          value: "Test",
        },
      },
      template: [
        {
          data: "{{items}}",
          output: "values",
          value: {
            asset: {
              id: "view-1-_index_-text",
              type: "text",
              value: "{{items._index_.name}}",
            },
          },
        },
      ],
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });

  test("bindings comply with Binding type", () => {
    const inputAsset = input()
      .withBinding(b`user.email`)
      .withLabel(text().withValue("Email"))
      .build({ parentId: "view-1" });

    const expected: InputAsset = {
      binding: "user.email",
      id: "view-1-input-email",
      label: {
        asset: {
          id: "view-1-input-email-label-text",
          type: "text",
          value: "Email",
        },
      },
      type: "input",
    };

    expect(inputAsset).toMatchObject(expected);
  });

  test("expressions comply with Expression type", () => {
    const collectionAsset = collection()
      .withLabel(text().withValue("Test"))
      .switch(["label"], {
        cases: [
          { case: e`status === 'active'`, asset: text().withValue("Active") },
          {
            case: e`status === 'inactive'`,
            asset: text().withValue("Inactive"),
          },
          { case: true, asset: text().withValue("Unknown") },
        ],
      })
      .build({ parentId: "view-1" });

    const expected = {
      id: "view-1-collection",
      label: {
        staticSwitch: [
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-0-text",
              type: "text",
              value: "Active",
            },
            case: "@[status === 'active']@",
          },
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-1-text",
              type: "text",
              value: "Inactive",
            },
            case: "@[status === 'inactive']@",
          },
          {
            asset: {
              id: "view-1-collection-label-staticSwitch-2-text",
              type: "text",
              value: "Unknown",
            },
            case: true,
          },
        ],
      },
      type: "collection",
    };

    expect(collectionAsset).toMatchObject(expected);
  });
});

describe("FluentBuilderBase - Builder Utilities", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("has() method correctly detects set properties", () => {
    const textBuilder = text().withValue("Hello");

    expect(textBuilder.has("value")).toBe(true);
    expect(textBuilder.has("id")).toBe(false);
  });

  test("peek() method returns static values", () => {
    const textBuilder = text().withValue("Hello");

    expect(textBuilder.peek("value")).toBe("Hello");
    expect(textBuilder.peek("id")).toBeUndefined();
  });

  test("peek() returns undefined for builder values", () => {
    const actionBuilder = action()
      .withValue("next")
      .withLabel(text().withValue("Continue"));

    expect(actionBuilder.peek("value")).toBe("next");
    expect(actionBuilder.peek("label")).toBeUndefined(); // It's a builder/wrapper
  });

  test("unset() removes properties", () => {
    const textBuilder = text().withValue("Hello").withId("custom-id");

    expect(textBuilder.has("id")).toBe(true);
    textBuilder.unset("id");
    expect(textBuilder.has("id")).toBe(false);

    const result = textBuilder.build({ parentId: "view-1" });
    expect(result.id).toBe("view-1-text"); // ID is auto-generated
  });

  test("clear() removes all properties", () => {
    const textBuilder = text().withValue("Hello").withId("custom-id");

    expect(textBuilder.has("value")).toBe(true);
    expect(textBuilder.has("id")).toBe(true);

    textBuilder.clear();

    expect(textBuilder.has("value")).toBe(false);
    expect(textBuilder.has("id")).toBe(false);
  });

  test("clone() creates independent copy", () => {
    const original = text().withValue("Original");
    const cloned = original.clone();

    cloned.withValue("Cloned");

    const originalResult = original.build({ parentId: "view-1" });
    const clonedResult = cloned.build({ parentId: "view-1" });

    expect(originalResult.value).toBe("Original");
    expect(clonedResult.value).toBe("Cloned");
  });

  test("builder can be reused with different contexts", () => {
    const textBuilder = text().withValue("Reusable");

    const result1 = textBuilder.build({ parentId: "view-1" });
    const result2 = textBuilder.build({ parentId: "view-2" });

    expect(result1.id).toBe("view-1-text");
    expect(result2.id).toBe("view-2-text");
    expect(result1.value).toBe("Reusable");
    expect(result2.value).toBe("Reusable");
  });
});

describe("FluentBuilderBase - Nested Objects ID Generation", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("generates deterministic IDs for ChoiceItem in array based on parent slot and index", () => {
    const choiceAsset = choice()
      .withBinding(b`user.favoriteColor`)
      .withLabel(text().withValue("Choose your favorite color"))
      .withChoices([
        choiceItem().withValue("red").withLabel(text().withValue("Red")),
        choiceItem().withValue("blue").withLabel(text().withValue("Blue")),
        choiceItem().withValue("green").withLabel(text().withValue("Green")),
      ])
      .build({ parentId: "view-1" });

    // Verify the choice asset itself has correct ID
    expect(choiceAsset.id).toBe("view-1-choice-favoriteColor");
    expect(choiceAsset.type).toBe("choice");

    // Verify the choices array exists
    expect(choiceAsset.choices).toBeDefined();

    if (choiceAsset.choices && Array.isArray(choiceAsset.choices)) {
      expect(choiceAsset.choices).toHaveLength(3);

      // First choice item
      const firstChoice = choiceAsset.choices[0];
      if (firstChoice && typeof firstChoice === "object") {
        // ChoiceItem should have an ID following pattern: parent-slot-index-item
        expect(firstChoice.id).toBe(
          "view-1-choice-favoriteColor-choices-0-item",
        );
        expect(firstChoice.value).toBe("red");

        // Verify nested label in first choice
        if ("label" in firstChoice && firstChoice.label) {
          const labelWrapper = firstChoice.label;
          if (
            typeof labelWrapper === "object" &&
            "asset" in labelWrapper &&
            labelWrapper.asset &&
            typeof labelWrapper.asset === "object"
          ) {
            const labelAsset = labelWrapper.asset;
            expect(labelAsset).toHaveProperty("type", "text");
            expect(labelAsset).toHaveProperty(
              "id",
              "view-1-choice-favoriteColor-choices-0-item-label-text",
            );
          }
        }
      }

      // Second choice item
      const secondChoice = choiceAsset.choices[1];
      if (secondChoice && typeof secondChoice === "object") {
        expect(secondChoice.id).toBe(
          "view-1-choice-favoriteColor-choices-1-item",
        );
        expect(secondChoice.value).toBe("blue");
      }

      // Third choice item
      const thirdChoice = choiceAsset.choices[2];
      if (thirdChoice && typeof thirdChoice === "object") {
        expect(thirdChoice.id).toBe(
          "view-1-choice-favoriteColor-choices-2-item",
        );
        expect(thirdChoice.value).toBe("green");
      }

      // Verify all IDs are unique
      const ids = [firstChoice?.id, secondChoice?.id, thirdChoice?.id].filter(
        (id): id is string => typeof id === "string",
      );
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    }
  });

  test("generates proper IDs for deeply nested assets within ChoiceItem", () => {
    const choiceAsset = choice()
      .withBinding(b`user.plan`)
      .withLabel(text().withValue("Select a plan"))
      .withChoices([
        choiceItem()
          .withValue("basic")
          .withLabel(text().withValue("Basic Plan"))
          .withDescription(text().withValue("$10/month"))
          .withHelp(text().withValue("Best for individuals")),
        choiceItem()
          .withValue("pro")
          .withLabel(text().withValue("Pro Plan"))
          .withDescription(text().withValue("$25/month"))
          .withHelp(text().withValue("Best for teams"))
          .withFooter(text().withValue("Most popular")),
      ])
      .build({ parentId: "form-1" });

    expect(choiceAsset.id).toBe("form-1-choice-plan");

    if (choiceAsset.choices && Array.isArray(choiceAsset.choices)) {
      const firstChoice = choiceAsset.choices[0];
      if (firstChoice && typeof firstChoice === "object") {
        expect(firstChoice.id).toBe("form-1-choice-plan-choices-0-item");

        // Check label
        if ("label" in firstChoice && firstChoice.label) {
          const labelWrapper = firstChoice.label;
          if (
            typeof labelWrapper === "object" &&
            "asset" in labelWrapper &&
            labelWrapper.asset &&
            typeof labelWrapper.asset === "object"
          ) {
            expect(labelWrapper.asset).toHaveProperty("type", "text");
            expect(labelWrapper.asset).toHaveProperty(
              "id",
              "form-1-choice-plan-choices-0-item-label-text",
            );
          }
        }

        // Check description
        if ("description" in firstChoice && firstChoice.description) {
          const descWrapper = firstChoice.description;
          if (
            typeof descWrapper === "object" &&
            "asset" in descWrapper &&
            descWrapper.asset &&
            typeof descWrapper.asset === "object"
          ) {
            expect(descWrapper.asset).toHaveProperty("type", "text");
            expect(descWrapper.asset).toHaveProperty(
              "id",
              "form-1-choice-plan-choices-0-item-description-text",
            );
          }
        }

        // Check help
        if ("help" in firstChoice && firstChoice.help) {
          const helpWrapper = firstChoice.help;
          if (
            typeof helpWrapper === "object" &&
            "asset" in helpWrapper &&
            helpWrapper.asset &&
            typeof helpWrapper.asset === "object"
          ) {
            expect(helpWrapper.asset).toHaveProperty("type", "text");
            expect(helpWrapper.asset).toHaveProperty(
              "id",
              "form-1-choice-plan-choices-0-item-help-text",
            );
          }
        }
      }

      const secondChoice = choiceAsset.choices[1];
      if (secondChoice && typeof secondChoice === "object") {
        expect(secondChoice.id).toBe("form-1-choice-plan-choices-1-item");

        // Check footer (only on pro plan)
        if ("footer" in secondChoice && secondChoice.footer) {
          const footerWrapper = secondChoice.footer;
          if (
            typeof footerWrapper === "object" &&
            "asset" in footerWrapper &&
            footerWrapper.asset &&
            typeof footerWrapper.asset === "object"
          ) {
            expect(footerWrapper.asset).toHaveProperty("type", "text");
            expect(footerWrapper.asset).toHaveProperty(
              "id",
              "form-1-choice-plan-choices-1-item-footer-text",
            );
          }
        }
      }
    }
  });

  test("handles explicit IDs on ChoiceItem without overriding", () => {
    const choiceAsset = choice()
      .withBinding(b`user.answer`)
      .withChoices([
        choiceItem()
          .withId("custom-yes")
          .withValue("yes")
          .withLabel(text().withValue("Yes")),
        choiceItem()
          .withId("custom-no")
          .withValue("no")
          .withLabel(text().withValue("No")),
      ])
      .build({ parentId: "question-1" });

    if (choiceAsset.choices && Array.isArray(choiceAsset.choices)) {
      expect(choiceAsset.choices).toHaveLength(2);

      const firstChoice = choiceAsset.choices[0];
      if (firstChoice && typeof firstChoice === "object") {
        expect(firstChoice.id).toBe("custom-yes");
      }

      const secondChoice = choiceAsset.choices[1];
      if (secondChoice && typeof secondChoice === "object") {
        expect(secondChoice.id).toBe("custom-no");
      }
    }
  });

  test("generates unique IDs for mixed explicit and auto-generated ChoiceItems", () => {
    const choiceAsset = choice()
      .withBinding(b`user.rating`)
      .withChoices([
        choiceItem().withValue("1").withLabel(text().withValue("Poor")),
        choiceItem()
          .withId("rating-good")
          .withValue("2")
          .withLabel(text().withValue("Good")),
        choiceItem().withValue("3").withLabel(text().withValue("Excellent")),
      ])
      .build({ parentId: "survey-1" });

    expect(choiceAsset.id).toBe("survey-1-choice-rating");

    if (choiceAsset.choices && Array.isArray(choiceAsset.choices)) {
      const firstChoice = choiceAsset.choices[0];
      const secondChoice = choiceAsset.choices[1];
      const thirdChoice = choiceAsset.choices[2];

      if (
        firstChoice &&
        typeof firstChoice === "object" &&
        secondChoice &&
        typeof secondChoice === "object" &&
        thirdChoice &&
        typeof thirdChoice === "object"
      ) {
        // First should have auto-generated ID
        expect(firstChoice.id).toBe("survey-1-choice-rating-choices-0-item");

        // Second one should have explicit ID
        expect(secondChoice.id).toBe("rating-good");

        // Third should have auto-generated ID
        expect(thirdChoice.id).toBe("survey-1-choice-rating-choices-2-item");

        // Collect all IDs
        const allIds = [firstChoice.id, secondChoice.id, thirdChoice.id];

        // Verify all are non-empty
        allIds.forEach((id) => {
          expect(id).toBeDefined();
          expect(id).not.toBe("");
        });

        // Verify all are unique
        const uniqueIds = new Set(allIds);
        expect(uniqueIds.size).toBe(3);
      }
    }
  });

  test("generates consistent IDs for ChoiceItem arrays across multiple builds", () => {
    const choiceBuilder = choice()
      .withBinding(b`user.preference`)
      .withChoices([
        choiceItem().withValue("opt1").withLabel(text().withValue("Option 1")),
        choiceItem().withValue("opt2").withLabel(text().withValue("Option 2")),
      ]);

    resetGlobalIdSet();
    const firstBuild = choiceBuilder.build({ parentId: "view-1" });

    resetGlobalIdSet();
    const secondBuild = choiceBuilder.build({ parentId: "view-1" });

    // IDs should be deterministic across builds with same context
    expect(firstBuild.id).toBe(secondBuild.id);

    if (
      firstBuild.choices &&
      Array.isArray(firstBuild.choices) &&
      secondBuild.choices &&
      Array.isArray(secondBuild.choices)
    ) {
      const firstChoices = firstBuild.choices;
      const secondChoices = secondBuild.choices;

      expect(firstChoices).toHaveLength(secondChoices.length);

      for (let i = 0; i < firstChoices.length; i++) {
        const first = firstChoices[i];
        const second = secondChoices[i];
        if (
          first &&
          typeof first === "object" &&
          second &&
          typeof second === "object"
        ) {
          expect(first.id).toBe(second.id);
        }
      }
    }
  });

  test("preserves ChoiceItem structure without type field", () => {
    const choiceAsset = choice()
      .withBinding(b`user.choice`)
      .withChoices([
        choiceItem()
          .withValue("a")
          .withLabel(text().withValue("A"))
          .withAutomationId("automation-a"),
      ])
      .build({ parentId: "test-1" });

    if (choiceAsset.choices && Array.isArray(choiceAsset.choices)) {
      const item = choiceAsset.choices[0];
      if (item && typeof item === "object") {
        // ChoiceItem should NOT have a type field
        expect("type" in item).toBe(false);

        // But should have all other expected fields
        expect(item.id).toBeDefined();
        expect(item.value).toBe("a");
        expect(item.automationId).toBe("automation-a");
        expect(item.label).toBeDefined();
      }
    }
  });
});

describe("FluentBuilderBase - Conditional Edge Cases", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("if() evaluates predicate during if() call", () => {
    let predicateEvaluationCount = 0;

    const builder = action()
      .withValue("test")
      .if(
        () => {
          predicateEvaluationCount++;
          return true;
        },
        "metaData",
        { role: "primary" },
      );

    // Predicate is evaluated during the if() call (not lazily during build)
    expect(predicateEvaluationCount).toBe(1);

    // Building should not re-evaluate the predicate
    const previousCount = predicateEvaluationCount;
    builder.build({ parentId: "test" });
    expect(predicateEvaluationCount).toBe(previousCount);
  });

  test("if() handles value that is undefined", () => {
    const includeMetaData = true;

    const actionAsset = action()
      .withValue("test")
      .if(() => includeMetaData, "metaData", undefined)
      .build({ parentId: "view-1" });

    // When value is undefined, property should not be set
    expect(actionAsset.metaData).toBeUndefined();
  });

  test("ifElse() evaluates predicate only once", () => {
    let predicateEvaluationCount = 0;

    const actionAsset = action()
      .withValue("test")
      .ifElse(
        () => {
          predicateEvaluationCount++;
          return predicateEvaluationCount > 0;
        },
        "metaData",
        { role: "primary" },
        { role: "secondary" },
      )
      .build({ parentId: "view-1" });

    // Predicate should be evaluated exactly once
    expect(predicateEvaluationCount).toBe(1);
    expect(actionAsset.metaData).toEqual({ role: "primary" });
  });

  test("ifElse() handles both values being functions", () => {
    const isPrimary = true;

    const actionAsset = action()
      .withValue("test")
      .ifElse(
        () => isPrimary,
        "label",
        () => text().withValue("Primary Label"),
        () => text().withValue("Secondary Label"),
      )
      .build({ parentId: "view-1" });

    expect(actionAsset.label?.asset.value).toBe("Primary Label");
  });

  test("ifElse() evaluates only the chosen value function", () => {
    let primaryFnCalled = false;
    let secondaryFnCalled = false;

    const isPrimary = true;

    const actionAsset = action()
      .withValue("test")
      .ifElse(
        () => isPrimary,
        "label",
        () => {
          primaryFnCalled = true;
          return text().withValue("Primary");
        },
        () => {
          secondaryFnCalled = true;
          return text().withValue("Secondary");
        },
      )
      .build({ parentId: "view-1" });

    // Only the chosen value function should be called
    expect(primaryFnCalled).toBe(true);
    expect(secondaryFnCalled).toBe(false);
    expect(actionAsset.label?.asset.value).toBe("Primary");
  });

  test("if() works with complex predicate accessing builder state", () => {
    const actionAsset = action()
      .withValue("submit")
      .if(
        (builder) => {
          const currentValue = builder.peek("value");
          return currentValue === "submit";
        },
        "metaData",
        { role: "primary" },
      )
      .build({ parentId: "view-1" });

    expect(actionAsset.metaData).toEqual({ role: "primary" });
  });

  test("if() does not set property when predicate returns false with builder", () => {
    const actionAsset = action()
      .withValue("cancel")
      .if(
        (builder) => {
          const currentValue = builder.peek("value");
          return currentValue === "submit";
        },
        "metaData",
        { role: "primary" },
      )
      .build({ parentId: "view-1" });

    expect(actionAsset.metaData).toBeUndefined();
  });

  test("multiple if() calls are all evaluated", () => {
    const conditions = {
      first: true,
      second: false,
      third: true,
    };

    const actionAsset = action()
      .withValue("test")
      .if(() => conditions.first, "metaData", { role: "primary" })
      .if(() => conditions.second, "accessibility", "Accessible button")
      .build({ parentId: "view-1" });

    expect(actionAsset.metaData).toEqual({ role: "primary" });
    expect(actionAsset.accessibility).toBeUndefined();
  });

  test("if() with false predicate does not affect subsequent with calls", () => {
    const actionAsset = action()
      .if(() => false, "value", "shouldNotAppear")
      .withValue("actualValue")
      .withLabel(text().withValue("Label"))
      .build({ parentId: "view-1" });

    expect(actionAsset.value).toBe("actualValue");
    expect(actionAsset.label?.asset.value).toBe("Label");
  });
});
