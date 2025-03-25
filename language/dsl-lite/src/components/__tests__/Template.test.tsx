/** @jsx createElement */
import { createElement } from "../../jsx-runtime.js";
import { describe, test, expect } from "vitest";
import { render } from "../../render.js";
import { Template } from "../Template";
import { binding as b, expression as e } from "../../tagged-templates.js";

describe("Template Components", () => {
  test("renders template with binding", () => {
    const { jsonValue } = render(
      <obj>
        <Template data={b`items`} output="values">
          <value>Item _index_</value>
        </Template>
      </obj>
    );

    expect(jsonValue).toEqual({
      template: [
        {
          data: "{{items}}",
          output: "values",
          value: {
            asset: "Item _index_",
          },
        },
      ],
    });
  });
});
