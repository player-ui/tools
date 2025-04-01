/** @jsx createElement */
import { createElement } from "../../jsx-runtime.js";
import { describe, test, expect } from "vitest";
import { expression as e } from "../../tagged-templates.js";
import { render } from "../../render.js";
import { Switch, isSwitch } from "../Switch";

describe("Switch Component", () => {
  test("renders static Switch with Cases", () => {
    const element = (
      <Switch>
        <Switch.Case exp={true}>
          <obj>
            <property name="content" value="Case 1" />
          </obj>
        </Switch.Case>
        <Switch.Case exp={false}>
          <obj>
            <property name="content" value="Case 2" />
          </obj>
        </Switch.Case>
      </Switch>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      staticSwitch: [
        {
          case: true,
          asset: { content: "Case 1" },
        },
        {
          case: false,
          asset: { content: "Case 2" },
        },
      ],
    });
  });

  test("renders dynamic Switch with Cases", () => {
    const element = (
      <Switch isDynamic>
        <Switch.Case exp={e`condition1`}>
          <obj>
            <property name="content" value="Dynamic Case 1" />
          </obj>
        </Switch.Case>
        <Switch.Case exp={e`condition2`}>
          <obj>
            <property name="content" value="Dynamic Case 2" />
          </obj>
        </Switch.Case>
      </Switch>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      dynamicSwitch: [
        {
          case: "@[condition1]@",
          asset: { content: "Dynamic Case 1" },
        },
        {
          case: "@[condition2]@",
          asset: { content: "Dynamic Case 2" },
        },
      ],
    });
  });

  test("renders Switch with no children", () => {
    const element = <Switch />;
    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      staticSwitch: [],
    });
  });

  test("isSwitch identifies Switch component", () => {
    const element = <Switch />;
    expect(isSwitch(element)).toBe(true);
  });

  test("isSwitch returns false for non-Switch elements", () => {
    const element = <obj />;
    expect(isSwitch(element)).toBe(false);
  });
});
