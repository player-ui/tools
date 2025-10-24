import { describe, test, expect, beforeEach } from "vitest";
import { FluentBuilderBase } from "../fluent-builder-base";
import { BaseBuildContext, FluentBuilder } from "../types";
import { resetGlobalIdSet } from "../id/generator";
import { expression } from "../../tagged-template";
import type { Asset } from "@player-ui/types";

interface TestAsset extends Asset<"test"> {
  value: string;
}

class TestAssetBuilder
  extends FluentBuilderBase<TestAsset>
  implements FluentBuilder<TestAsset, BaseBuildContext>
{
  constructor() {
    super({ type: "test" });
  }

  value(v: string): this {
    return this.set("value", v);
  }

  id(v: string): this {
    return this.set("id", v);
  }

  build(context?: BaseBuildContext): TestAsset {
    return this.buildWithDefaults({ type: "test", value: "" }, context);
  }
}

interface CollectionAsset extends Asset<"collection"> {
  values?: Array<{ asset: Asset }>;
}

class CollectionBuilder
  extends FluentBuilderBase<CollectionAsset>
  implements FluentBuilder<CollectionAsset, BaseBuildContext>
{
  // Mark 'values' as an array property to test array wrapping logic
  static __arrayProperties__ = new Set(["values"]);

  constructor() {
    super({ type: "collection" });
  }

  withValues(v: Array<FluentBuilder<Asset, BaseBuildContext> | Asset>): this {
    return this.set("values", { asset: v });
  }

  id(v: string): this {
    return this.set("id", v);
  }

  build(context?: BaseBuildContext): CollectionAsset {
    return this.buildWithDefaults({ type: "collection" }, context);
  }
}

describe("Switch Integration with FluentBuilderBase", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  describe("Basic switch() method", () => {
    test("can add a switch to a builder using the switch() method", () => {
      const builder = new TestAssetBuilder()
        .value("original")
        .switch(["value"], {
          cases: [
            {
              case: expression`user.lang === 'es'`,
              asset: new TestAssetBuilder().value("Hola"),
            },
            { case: true, asset: new TestAssetBuilder().value("Hello") },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result).toEqual({
        id: "test-test",
        type: "test",
        value: {
          staticSwitch: [
            {
              case: "@[user.lang === 'es']@",
              asset: {
                value: "Hola",
                type: "test",
                id: "test-test-value-staticSwitch-0-test",
              },
            },
            {
              case: true,
              asset: {
                value: "Hello",
                type: "test",
                id: "test-test-value-staticSwitch-1-test",
              },
            },
          ],
        },
      });
    });

    test("can add dynamic switch", () => {
      const builder = new TestAssetBuilder()
        .value("original")
        .switch(["value"], {
          cases: [{ case: true, asset: new TestAssetBuilder().value("Hi") }],
          isDynamic: true,
        });

      const result = builder.build({ parentId: "test" });

      expect(result).toEqual({
        id: "test-test",
        type: "test",
        value: {
          dynamicSwitch: [
            {
              case: true,
              asset: {
                value: "Hi",
                type: "test",
                id: "test-test-value-dynamicSwitch-0-test",
              },
            },
          ],
        },
      });
    });

    test("preserves existing asset id when provided", () => {
      const builder = new TestAssetBuilder()
        .value("original")
        .switch(["value"], {
          cases: [
            {
              case: true,
              asset: new TestAssetBuilder().value("Hello").id("custom-id"),
            },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result.value).toEqual({
        staticSwitch: [
          {
            case: true,
            asset: {
              value: "Hello",
              type: "test",
              id: "custom-id",
            },
          },
        ],
      });
    });

    test("handles multiple cases with sequential indexing", () => {
      const builder = new TestAssetBuilder()
        .value("original")
        .switch(["value"], {
          cases: [
            {
              case: expression`name.first === 'John'`,
              asset: new TestAssetBuilder().value("First"),
            },
            {
              case: expression`name.first === 'Jane'`,
              asset: new TestAssetBuilder().value("Second"),
            },
            { case: true, asset: new TestAssetBuilder().value("Default") },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result.value).toEqual({
        staticSwitch: [
          {
            case: "@[name.first === 'John']@",
            asset: {
              value: "First",
              type: "test",
              id: "test-test-value-staticSwitch-0-test",
            },
          },
          {
            case: "@[name.first === 'Jane']@",
            asset: {
              value: "Second",
              type: "test",
              id: "test-test-value-staticSwitch-1-test",
            },
          },
          {
            case: true,
            asset: {
              value: "Default",
              type: "test",
              id: "test-test-value-staticSwitch-2-test",
            },
          },
        ],
      });
    });
  });

  describe("Switch with nested paths", () => {
    test("can replace array element with switch", () => {
      const builder = new CollectionBuilder()
        .withValues([
          new TestAssetBuilder().value("Item 1"),
          new TestAssetBuilder().value("Item 2"),
          new TestAssetBuilder().value("Item 3"),
        ])
        .switch(["values", 1], {
          cases: [
            {
              case: expression`user.isAdmin`,
              asset: new TestAssetBuilder().value("Admin Item"),
            },
            { case: true, asset: new TestAssetBuilder().value("Default") },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result).toEqual({
        id: "test-collection",
        type: "collection",
        values: [
          {
            asset: {
              id: "test-collection-values-0-test",
              type: "test",
              value: "Item 1",
            },
          },
          {
            staticSwitch: [
              {
                case: "@[user.isAdmin]@",
                asset: {
                  value: "Admin Item",
                  type: "test",
                  id: "test-collection-values-staticSwitch-0-test",
                },
              },
              {
                case: true,
                asset: {
                  value: "Default",
                  type: "test",
                  id: "test-collection-values-staticSwitch-1-test",
                },
              },
            ],
          },
          {
            asset: {
              id: "test-collection-values-2-test",
              type: "test",
              value: "Item 3",
            },
          },
        ],
      });
    });

    test("can add multiple switches at different array indices", () => {
      const builder = new CollectionBuilder()
        .withValues([
          new TestAssetBuilder().value("Item 1"),
          new TestAssetBuilder().value("Item 2"),
          new TestAssetBuilder().value("Item 3"),
        ])
        .switch(["values", 0], {
          cases: [
            {
              case: expression`showSpecial`,
              asset: new TestAssetBuilder().value("Special First"),
            },
            {
              case: true,
              asset: new TestAssetBuilder().value("Regular First"),
            },
          ],
        })
        .switch(["values", 2], {
          cases: [
            {
              case: expression`user.isPremium`,
              asset: new TestAssetBuilder().value("Premium Last"),
            },
            {
              case: true,
              asset: new TestAssetBuilder().value("Standard Last"),
            },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result).toEqual({
        id: "test-collection",
        type: "collection",
        values: [
          {
            staticSwitch: [
              {
                case: "@[showSpecial]@",
                asset: {
                  value: "Special First",
                  type: "test",
                  id: "test-collection-values-staticSwitch-0-test",
                },
              },
              {
                case: true,
                asset: {
                  value: "Regular First",
                  type: "test",
                  id: "test-collection-values-staticSwitch-1-test",
                },
              },
            ],
          },
          {
            asset: {
              id: "test-collection-values-1-test",
              type: "test",
              value: "Item 2",
            },
          },
          {
            staticSwitch: [
              {
                case: "@[user.isPremium]@",
                asset: {
                  value: "Premium Last",
                  type: "test",
                  id: "test-collection-values-staticSwitch-2-test",
                },
              },
              {
                case: true,
                asset: {
                  value: "Standard Last",
                  type: "test",
                  id: "test-collection-values-staticSwitch-3-test",
                },
              },
            ],
          },
        ],
      });
    });
  });

  describe("Switch reusability", () => {
    test("can reuse the same builder with different contexts", () => {
      const builder = new TestAssetBuilder()
        .value("original")
        .switch(["value"], {
          cases: [{ case: true, asset: new TestAssetBuilder().value("Hi") }],
        });

      const result1 = builder.build({ parentId: "test1" });
      const result2 = builder.build({ parentId: "test2" });

      expect(result1.id).toBe("test1-test");
      expect(result2.id).toBe("test2-test");

      const switch1: unknown = result1.value;
      const switch2: unknown = result2.value;

      expect(switch1).toHaveProperty("staticSwitch");
      expect(switch2).toHaveProperty("staticSwitch");

      if (
        typeof switch1 === "object" &&
        switch1 !== null &&
        "staticSwitch" in switch1 &&
        typeof switch2 === "object" &&
        switch2 !== null &&
        "staticSwitch" in switch2
      ) {
        const staticSwitch1 = switch1.staticSwitch;
        const staticSwitch2 = switch2.staticSwitch;

        if (
          Array.isArray(staticSwitch1) &&
          Array.isArray(staticSwitch2) &&
          staticSwitch1.length > 0 &&
          staticSwitch2.length > 0
        ) {
          const case1 = staticSwitch1[0];
          const case2 = staticSwitch2[0];

          if (typeof case1 === "object" && case1 !== null && "asset" in case1) {
            const asset1 = case1.asset;
            if (
              typeof asset1 === "object" &&
              asset1 !== null &&
              "id" in asset1
            ) {
              expect(asset1.id).toBe("test1-test-value-staticSwitch-0-test");
            }
          }

          if (typeof case2 === "object" && case2 !== null && "asset" in case2) {
            const asset2 = case2.asset;
            if (
              typeof asset2 === "object" &&
              asset2 !== null &&
              "id" in asset2
            ) {
              expect(asset2.id).toBe("test2-test-value-staticSwitch-0-test");
            }
          }
        }
      }
    });
  });

  describe("Switch with string case expressions", () => {
    test("handles string case expressions", () => {
      const builder = new TestAssetBuilder()
        .value("original")
        .switch(["value"], {
          cases: [
            {
              case: "{{foo}} === 'bar'",
              asset: new TestAssetBuilder().value("Match"),
            },
            { case: true, asset: new TestAssetBuilder().value("No Match") },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result.value).toEqual({
        staticSwitch: [
          {
            case: "{{foo}} === 'bar'",
            asset: {
              value: "Match",
              type: "test",
              id: "test-test-value-staticSwitch-0-test",
            },
          },
          {
            case: true,
            asset: {
              value: "No Match",
              type: "test",
              id: "test-test-value-staticSwitch-1-test",
            },
          },
        ],
      });
    });

    test("handles boolean case expressions", () => {
      const builder = new TestAssetBuilder()
        .value("original")
        .switch(["value"], {
          cases: [
            { case: false, asset: new TestAssetBuilder().value("False") },
            { case: true, asset: new TestAssetBuilder().value("True") },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result.value).toEqual({
        staticSwitch: [
          {
            case: false,
            asset: {
              value: "False",
              type: "test",
              id: "test-test-value-staticSwitch-0-test",
            },
          },
          {
            case: true,
            asset: {
              value: "True",
              type: "test",
              id: "test-test-value-staticSwitch-1-test",
            },
          },
        ],
      });
    });
  });

  describe("Switch array wrapping behavior (path.length check)", () => {
    test("switches on entire array property should be wrapped in array", () => {
      // When switching the entire 'values' array property (path.length === 1),
      // the switch result should be wrapped in an array because 'values' is an array type
      const builder = new CollectionBuilder().switch(["values"], {
        cases: [
          {
            case: expression`user.isAdmin`,
            asset: new TestAssetBuilder().value("Admin Only"),
          },
          {
            case: true,
            asset: new TestAssetBuilder().value("Default"),
          },
        ],
      });

      const result = builder.build({ parentId: "test" });

      // The switch should be wrapped in an array: [{ staticSwitch: [...] }]
      expect(result.values).toBeInstanceOf(Array);
      expect(result.values).toHaveLength(1);
      expect(result.values?.[0]).toHaveProperty("staticSwitch");
      expect(result.values?.[0]).toEqual({
        staticSwitch: [
          {
            case: "@[user.isAdmin]@",
            asset: {
              value: "Admin Only",
              type: "test",
              id: "test-collection-values-staticSwitch-0-test",
            },
          },
          {
            case: true,
            asset: {
              value: "Default",
              type: "test",
              id: "test-collection-values-staticSwitch-1-test",
            },
          },
        ],
      });
    });

    test("switches on specific array element should NOT be double-wrapped", () => {
      // When switching a specific element in the array (path.length > 1),
      // the switch result should NOT be wrapped in an additional array
      const builder = new CollectionBuilder()
        .withValues([
          new TestAssetBuilder().value("Item 1"),
          new TestAssetBuilder().value("Item 2"),
        ])
        .switch(["values", 1], {
          cases: [
            {
              case: expression`user.isAdmin`,
              asset: new TestAssetBuilder().value("Admin Item"),
            },
            {
              case: true,
              asset: new TestAssetBuilder().value("Default"),
            },
          ],
        });

      const result = builder.build({ parentId: "test" });

      // The switch at index 1 should NOT be double-wrapped
      // It should be: [{ asset: ... }, { staticSwitch: [...] }]
      // NOT: [{ asset: ... }, [{ staticSwitch: [...] }]]
      expect(result.values).toBeInstanceOf(Array);
      expect(result.values).toHaveLength(2);

      // First element should be the original asset
      expect(result.values?.[0]).toEqual({
        asset: {
          id: "test-collection-values-0-test",
          type: "test",
          value: "Item 1",
        },
      });

      // Second element should be the switch (NOT wrapped in an extra array)
      expect(result.values?.[1]).toHaveProperty("staticSwitch");
      expect(result.values?.[1]).not.toBeInstanceOf(Array);
      expect(result.values?.[1]).toEqual({
        staticSwitch: [
          {
            case: "@[user.isAdmin]@",
            asset: {
              value: "Admin Item",
              type: "test",
              id: "test-collection-values-staticSwitch-0-test",
            },
          },
          {
            case: true,
            asset: {
              value: "Default",
              type: "test",
              id: "test-collection-values-staticSwitch-1-test",
            },
          },
        ],
      });
    });

    test("multiple switches on different array indices should all be unwrapped", () => {
      // Verify that multiple switches at different array indices all avoid double-wrapping
      const builder = new CollectionBuilder()
        .withValues([
          new TestAssetBuilder().value("Item 1"),
          new TestAssetBuilder().value("Item 2"),
          new TestAssetBuilder().value("Item 3"),
        ])
        .switch(["values", 0], {
          cases: [
            {
              case: expression`showFirst`,
              asset: new TestAssetBuilder().value("First Switch"),
            },
            {
              case: true,
              asset: new TestAssetBuilder().value("First Default"),
            },
          ],
        })
        .switch(["values", 2], {
          cases: [
            {
              case: expression`showLast`,
              asset: new TestAssetBuilder().value("Last Switch"),
            },
            { case: true, asset: new TestAssetBuilder().value("Last Default") },
          ],
        });

      const result = builder.build({ parentId: "test" });

      expect(result.values).toBeInstanceOf(Array);
      expect(result.values).toHaveLength(3);

      // All array elements should contain switches, not arrays of switches
      expect(result.values?.[0]).toHaveProperty("staticSwitch");
      expect(result.values?.[0]).not.toBeInstanceOf(Array);

      expect(result.values?.[1]).toEqual({
        asset: {
          id: "test-collection-values-1-test",
          type: "test",
          value: "Item 2",
        },
      });

      expect(result.values?.[2]).toHaveProperty("staticSwitch");
      expect(result.values?.[2]).not.toBeInstanceOf(Array);
    });
  });
});
