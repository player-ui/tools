import { describe, test, expect, beforeEach } from "vitest";
import { switch_, withSwitch } from "../index";
import type { Asset, AssetWrapperOrSwitch } from "@player-ui/types";
import { text, collection } from "../../examples";
import { expression } from "../../tagged-template";
import { globalIdRegistry } from "../../id-generator";

describe("Switch", () => {
  beforeEach(() => {
    // Reset the global registry before each test
    globalIdRegistry.reset();
  });

  test("create a static switch by default", () => {
    const cases = [{ case: true, asset: text().withValue("Hello") }];
    const result = switch_({ cases })({ parentId: "parent" });

    const expected: AssetWrapperOrSwitch = {
      staticSwitch: [
        {
          case: true,
          asset: { value: "Hello", type: "text", id: "parent-staticSwitch-0" },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  test("create a dynamic switch when isDynamic is true", () => {
    const cases = [{ case: true, asset: text().withValue("Hello") }];
    const result = switch_({ cases, isDynamic: true })({ parentId: "parent" });

    const expected: AssetWrapperOrSwitch = {
      dynamicSwitch: [
        {
          case: true,
          asset: { value: "Hello", type: "text", id: "parent-dynamicSwitch-0" },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  test("convert string case expressions to strings", () => {
    const cases = [{ case: "foo == true", asset: text().withValue("Hello") }];
    const result = switch_({ cases })({ parentId: "parent" });

    const expected: AssetWrapperOrSwitch = {
      staticSwitch: [
        {
          case: "foo == true",
          asset: { value: "Hello", type: "text", id: "parent-staticSwitch-0" },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  test("handle TaggedTemplateValue case expressions", () => {
    const templateValue = expression`foo == true`;
    const cases = [{ case: templateValue, asset: text().withValue("Hello") }];
    const result = switch_({ cases })({ parentId: "parent" });

    const expected: AssetWrapperOrSwitch = {
      staticSwitch: [
        {
          case: "@[foo == true]@",
          asset: { value: "Hello", type: "text", id: "parent-staticSwitch-0" },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  test("preserve ids for assets with ids", () => {
    const assetWithId = text().withId("custom-id").withValue("Hello");
    const result = switch_({
      cases: [{ case: true, asset: assetWithId }],
    })({ parentId: "parent" });

    const expected: AssetWrapperOrSwitch = {
      staticSwitch: [
        {
          case: true,
          asset: { value: "Hello", type: "text", id: "custom-id" },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  test("handle multiple cases", () => {
    const firstAsset = text().withValue("First");
    const secondAsset = text().withValue("Second");
    const defaultAsset = text().withValue("Default");

    const result = switch_({
      cases: [
        { case: '{{name.first}} == "John"', asset: firstAsset },
        { case: '{{name.first}} == "Jane"', asset: secondAsset },
        { case: true, asset: defaultAsset },
      ],
    })({ parentId: "parent" });

    const expected: AssetWrapperOrSwitch = {
      staticSwitch: [
        {
          case: '{{name.first}} == "John"',
          asset: { value: "First", type: "text", id: "parent-staticSwitch-0" },
        },
        {
          case: '{{name.first}} == "Jane"',
          asset: { value: "Second", type: "text", id: "parent-staticSwitch-1" },
        },
        {
          case: true,
          asset: {
            value: "Default",
            type: "text",
            id: "parent-staticSwitch-2",
          },
        },
      ],
    };

    expect(result).toEqual(expected);
  });

  describe("withSwitch", () => {
    test("builder without switch returns original asset", () => {
      const textBuilder = text().withValue("Hello World");
      const switchableBuilder = withSwitch(textBuilder);

      const result = switchableBuilder({ parentId: "parent" });

      const expected: Asset = {
        id: "parent",
        type: "text",
        value: "Hello World",
      };

      expect(result).toEqual(expected);
    });

    test("can replace a specific array element with a switch", () => {
      const originalCollection = collection().withValues([
        text().withValue("Item 1"),
        text().withValue("Item 2"), // This will be replaced
        text().withValue("Item 3"),
      ]);

      const collectionWithSwitch = withSwitch(originalCollection).switch({
        path: ["values", 1], // Replace the second item (index 1)
        switch: {
          cases: [
            {
              case: expression`user.isAdmin`,
              asset: text().withValue("Admin Item"),
            },
            { case: true, asset: text().withValue("Default Item") },
          ],
        },
      });

      const result = collectionWithSwitch({ parentId: "test" });

      const expected: Asset = {
        id: "test",
        type: "collection",
        values: [
          {
            asset: {
              id: "test-values-0",
              type: "text",
              value: "Item 1",
            },
          },
          {
            staticSwitch: [
              {
                case: "@[user.isAdmin]@",
                asset: {
                  value: "Admin Item",
                  type: "text",
                  id: "test-staticSwitch-0",
                },
              },
              {
                case: true,
                asset: {
                  value: "Default Item",
                  type: "text",
                  id: "test-staticSwitch-1",
                },
              },
            ],
          },
          {
            asset: {
              id: "test-values-2",
              type: "text",
              value: "Item 3",
            },
          },
        ],
      };

      expect(result).toEqual(expected);
    });

    test("can add multiple switches at different paths", () => {
      const originalCollection = collection().withValues([
        text().withValue("Item 1"),
        text().withValue("Item 2"),
        text().withValue("Item 3"),
      ]);

      const collectionWithSwitches = withSwitch(originalCollection)
        .switch({
          path: ["values", 0], // Replace first item
          switch: {
            cases: [
              {
                case: expression`showSpecial`,
                asset: text().withValue("Special First"),
              },
              { case: true, asset: text().withValue("Regular First") },
            ],
          },
        })
        .switch({
          path: ["values", 2], // Replace third item
          switch: {
            cases: [
              {
                case: expression`user.isPremium`,
                asset: text().withValue("Premium Last"),
              },
              { case: true, asset: text().withValue("Standard Last") },
            ],
          },
        });

      const result = collectionWithSwitches({ parentId: "test" });

      const expected: Asset = {
        id: "test",
        type: "collection",
        values: [
          {
            staticSwitch: [
              {
                case: "@[showSpecial]@",
                asset: {
                  value: "Special First",
                  type: "text",
                  id: "test-staticSwitch-0",
                },
              },
              {
                case: true,
                asset: {
                  value: "Regular First",
                  type: "text",
                  id: "test-staticSwitch-1",
                },
              },
            ],
          },
          {
            asset: {
              id: "test-values-1",
              type: "text",
              value: "Item 2",
            },
          },
          {
            staticSwitch: [
              {
                case: "@[user.isPremium]@",
                asset: {
                  value: "Premium Last",
                  type: "text",
                  id: "test-staticSwitch-2",
                },
              },
              {
                case: true,
                asset: {
                  value: "Standard Last",
                  type: "text",
                  id: "test-staticSwitch-3",
                },
              },
            ],
          },
        ],
      };

      expect(result).toEqual(expected);
    });

    test("maintains fluent API and can be chained with other builder methods", () => {
      // This demonstrates that withSwitch preserves the builder pattern
      const textBuilder = text().withValue("Original");

      const switchableBuilder = withSwitch(textBuilder).switch({
        path: ["value"], // Replace the value property
        switch: {
          cases: [
            {
              case: expression`user.lang === 'es'`,
              asset: text().withValue("Hola"),
            },
            { case: true, asset: text().withValue("Hello") },
          ],
        },
      });

      const result = switchableBuilder({ parentId: "test" });

      const expected: Asset = {
        id: "test",
        type: "text",
        value: {
          staticSwitch: [
            {
              case: "@[user.lang === 'es']@",
              asset: {
                value: "Hola",
                type: "text",
                id: "test-staticSwitch-0",
              },
            },
            {
              case: true,
              asset: {
                value: "Hello",
                type: "text",
                id: "test-staticSwitch-1",
              },
            },
          ],
        },
      };

      expect(result).toEqual(expected);
    });

    test("can use nested paths with multiple keys", () => {
      // Create a more complex nested structure for testing
      const complexBuilder = () => ({
        id: "complex",
        type: "custom" as const,
        config: {
          section: {
            items: [{ name: "Item 1" }, { name: "Item 2" }],
          },
        },
      });

      const builderWithSwitch = withSwitch(complexBuilder).switch({
        path: ["config", "section", "items", 0], // Navigate to deeply nested array element
        switch: {
          cases: [
            {
              case: expression`feature.enabled`,
              asset: text().withValue("Enhanced Item"),
            },
            { case: true, asset: text().withValue("Basic Item") },
          ],
        },
      });

      const result = builderWithSwitch({ parentId: "test" });

      const expected: Asset = {
        id: "complex",
        type: "custom",
        config: {
          section: {
            items: [
              {
                staticSwitch: [
                  {
                    case: "@[feature.enabled]@",
                    asset: {
                      value: "Enhanced Item",
                      type: "text",
                      id: "test-staticSwitch-0",
                    },
                  },
                  {
                    case: true,
                    asset: {
                      value: "Basic Item",
                      type: "text",
                      id: "test-staticSwitch-1",
                    },
                  },
                ],
              },
              { name: "Item 2" },
            ],
          },
        },
      };

      expect(result).toEqual(expected);
    });

    test("context is only used when builder is called, not during configuration", () => {
      const textBuilder = text().withValue("Test");

      // Configuration phase - context should NOT be used yet
      const switchableBuilder = withSwitch(textBuilder).switch({
        path: ["value"],
        switch: {
          cases: [{ case: true, asset: text().withValue("Switched") }],
        },
      });

      // Now we call with context - this is when assets should be generated
      const result1 = switchableBuilder({ parentId: "test1" });
      const result2 = switchableBuilder({ parentId: "test2" });

      const expected1: Asset = {
        id: "test1",
        type: "text",
        value: {
          staticSwitch: [
            {
              case: true,
              asset: {
                value: "Switched",
                type: "text",
                id: "test1-staticSwitch-0",
              },
            },
          ],
        },
      };

      const expected2: Asset = {
        id: "test2",
        type: "text",
        value: {
          staticSwitch: [
            {
              case: true,
              asset: {
                value: "Switched",
                type: "text",
                id: "test2-staticSwitch-0", // Different ID based on different context
              },
            },
          ],
        },
      };

      expect(result1).toEqual(expected1);
      expect(result2).toEqual(expected2);
    });
  });
});
