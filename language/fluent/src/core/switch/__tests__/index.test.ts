import { describe, test, expect, beforeEach } from "vitest";
import { switch_ } from "../index";
import type { AssetWrapperOrSwitch } from "@player-ui/types";
import { text } from "../../mocks";
import { expression } from "../../tagged-template";
import { resetGlobalIdSet } from "../../base-builder";

describe("Switch", () => {
  beforeEach(() => {
    resetGlobalIdSet();
  });

  test("create a static switch by default", () => {
    const cases = [{ case: true, asset: text().withValue("Hello") }];
    const result = switch_({ cases })({ parentId: "parent" });

    const expected: AssetWrapperOrSwitch = {
      staticSwitch: [
        {
          case: true,
          asset: {
            value: "Hello",
            type: "text",
            id: "parent-staticSwitch-0-text",
          },
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
          asset: {
            value: "Hello",
            type: "text",
            id: "parent-dynamicSwitch-0-text",
          },
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
          asset: {
            value: "Hello",
            type: "text",
            id: "parent-staticSwitch-0-text",
          },
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
          asset: {
            value: "Hello",
            type: "text",
            id: "parent-staticSwitch-0-text",
          },
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
          asset: {
            value: "First",
            type: "text",
            id: "parent-staticSwitch-0-text",
          },
        },
        {
          case: '{{name.first}} == "Jane"',
          asset: {
            value: "Second",
            type: "text",
            id: "parent-staticSwitch-1-text",
          },
        },
        {
          case: true,
          asset: {
            value: "Default",
            type: "text",
            id: "parent-staticSwitch-2-text",
          },
        },
      ],
    };

    expect(result).toEqual(expected);
  });
});
