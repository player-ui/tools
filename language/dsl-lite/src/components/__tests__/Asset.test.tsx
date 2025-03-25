/** @jsx createElement */
import { createElement } from "../../jsx-runtime.js";
import { describe, test, expect } from "vitest";
import { binding as b, expression as e } from "../../tagged-templates.js";
import { render } from "../../render.js";
import { Asset } from "../Asset";
import { IdProvider, useId } from "../useId.jsx";
import { JSXElement } from "../../types.js";

describe("Asset Component", () => {
  test("basic asset with required props only", () => {
    const element = (
      <IdProvider id="test">
        <Asset type="button" />
      </IdProvider>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      id: "test",
      type: "button",
    });
  });

  test("asset with explicit ID", () => {
    const element = (
      <IdProvider id="test">
        <Asset type="text" id="text_123" />
      </IdProvider>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      id: "text_123",
      type: "text",
    });
  });

  test("asset with custom properties", () => {
    const element = (
      <IdProvider id="test">
        <Asset
          type="input"
          id="input_name"
          label="Your Name"
          required={true}
          placeholder="Enter your name"
        />
      </IdProvider>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      id: "input_name",
      label: "Your Name",
      placeholder: "Enter your name",
      required: true,
      type: "input",
    });
  });

  test("asset with tagged template values", () => {
    const element = (
      <IdProvider id="test">
        <Asset
          type="input"
          id="input_email"
          label="Email Address"
          value={b`form.email`}
          visible={e`isEmailRequired`}
        />
      </IdProvider>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      id: "input_email",
      label: "Email Address",
      type: "input",
      value: "{{form.email}}",
      visible: "@[isEmailRequired]@",
    });
  });

  test("complex nested asset structure", () => {
    const Collection = (props: { children?: JSXElement | JSXElement[] }) => {
      const { branch } = useId();

      const children = Array.isArray(props.children)
        ? props.children
        : props.children
        ? [props.children]
        : [];

      return (
        <property name="values">
          <array>
            {children.map((child, index) => (
              // eslint-disable-next-line react/jsx-key
              <obj>
                <property name="asset">
                  <IdProvider
                    id={branch({
                      type: "property",
                      name: "values",
                      index,
                    })}
                  >
                    {child}
                  </IdProvider>
                </property>
              </obj>
            ))}
          </array>
        </property>
      );
    };

    const element = (
      <IdProvider id="test">
        <Asset type="form" id="registration_form">
          <Collection>
            <Asset type="section" id="personal_info">
              <Collection>
                <Asset
                  type="input"
                  id="input_name"
                  label="Full Name"
                  value={b`form.name`}
                  required={true}
                />
                <Asset
                  type="input"
                  id="input_email"
                  label="Email"
                  value={b`form.email`}
                  validations={e`isValidEmail(form.email)`}
                />
              </Collection>
            </Asset>
            <Asset type="section" id="preferences">
              <Collection>
                <Asset
                  type="checkbox"
                  id="checkbox_newsletter"
                  label="Subscribe to newsletter"
                  value={b`form.preferences.newsletter`}
                />
                <Asset
                  type="button"
                  label="Submit"
                  disabled={e`!isFormValid`}
                />
              </Collection>
            </Asset>
          </Collection>
        </Asset>
      </IdProvider>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      id: "registration_form",
      type: "form",
      values: [
        {
          asset: {
            id: "personal_info",
            type: "section",
            values: [
              {
                asset: {
                  id: "input_name",
                  label: "Full Name",
                  required: true,
                  type: "input",
                  value: "{{form.name}}",
                },
              },
              {
                asset: {
                  id: "input_email",
                  label: "Email",
                  type: "input",
                  validations: "@[isValidEmail(form.email)]@",
                  value: "{{form.email}}",
                },
              },
            ],
          },
        },
        {
          asset: {
            id: "preferences",
            type: "section",
            values: [
              {
                asset: {
                  id: "checkbox_newsletter",
                  label: "Subscribe to newsletter",
                  type: "checkbox",
                  value: "{{form.preferences.newsletter}}",
                },
              },
              {
                asset: {
                  disabled: "@[!isFormValid]@",
                  id: "preferences-values-1",
                  label: "Submit",
                  type: "button",
                },
              },
            ],
          },
        },
      ],
    });
  });
});
