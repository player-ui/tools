import { test, expect, describe } from "vitest";
import { setupTestEnv } from "@player-tools/test-utils";
import { decorateNode } from "../annotations";

describe("Annotations", () => {
  test("JSDoc comments to strings", () => {
    const sc = `
    /**
   * An asset is the smallest unit of user interaction in a player view
   * @example Example usage of interface Asset
   * @see Asset for implementation details
   * @default default value
   */
  export interface Asset<T extends string = string> {
    id: string;
    [key: string]: unknown;
  }
  `;

    const { sf } = setupTestEnv(sc);
    expect(decorateNode(sf.statements[0])).toMatchSnapshot();
  });

  test("JSDoc @meta", () => {
    const sc = `
    /**
   * An asset is the smallest unit of user interaction in a player view
   * @meta category:views
   * @meta screenshot:/path/image.png
   */
  export interface Asset<T extends string = string> {
    id: string;
    [key: string]: unknown;
  }
  `;

    const { sf } = setupTestEnv(sc);
    expect(decorateNode(sf.statements[0])).toMatchSnapshot();
  });
});
