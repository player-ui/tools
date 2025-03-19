/** @jsx createElement */
import { createElement, Fragment } from "../jsx-runtime.js";
import { describe, test, expect } from "vitest";
import { binding as b, expression as e } from "../tagged-templates.js";
import { render } from "../render.js";

describe("JSX Syntax with Custom Runtime", () => {
  test("basic JSX elements", () => {
    // Object with properties
    const element = (
      <obj type="text">
        <property name="title" value="Hello World" />
        <property name="style" value="heading" />
      </obj>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      type: "text",
      title: "Hello World",
      style: "heading",
    });
  });

  test("JSX with arrays", () => {
    // Array element
    const element = (
      <array>
        <value value="Item 1" />
        <value value="Item 2" />
        <value value="Item 3" />
      </array>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual(["Item 1", "Item 2", "Item 3"]);
  });

  test("JSX with complex nesting", () => {
    // Complex nested structure
    const element = (
      <obj type="view">
        <property name="header">
          <obj type="text">
            <property name="text" value="Welcome" />
          </obj>
        </property>
        <property name="items">
          <array>
            <value value="First item" />
            <value value="Second item" />
          </array>
        </property>
        <property name="footer">
          <obj type="button">
            <property name="label" value="Continue" />
            <property name="disabled" value={false} />
          </obj>
        </property>
      </obj>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      type: "view",
      header: {
        type: "text",
        text: "Welcome",
      },
      items: ["First item", "Second item"],
      footer: {
        type: "button",
        label: "Continue",
        disabled: false,
      },
    });
  });

  test("JSX with template values", () => {
    // Using binding templates
    const element = (
      <obj type="input">
        <property name="label" value="Name" />
        <property name="value" value={b`form.name`} />
        <property name="required" value={true} />
        <property name="visible" value={e`!isComplete && form.step === 1`} />
      </obj>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      type: "input",
      label: "Name",
      value: "{{form.name}}",
      required: true,
      visible: "@[!isComplete && form.step === 1]@",
    });
  });

  test("JSX with fragments", () => {
    // Using fragments
    const element = (
      <obj type="container">
        <>
          <property name="title" value="Fragmented Content" />
          <property name="subtitle" value="With multiple properties" />
        </>
        <property name="data" value={b`content.data`} />
      </obj>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      type: "container",
      title: "Fragmented Content",
      subtitle: "With multiple properties",
      data: "{{content.data}}",
    });
  });

  test("JSX with text children", () => {
    // Text nodes
    const element = (
      <obj type="text">
        <property name="content">
          <value>This is a text content</value>
        </property>
      </obj>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      type: "text",
      content: "This is a text content",
    });
  });

  test("player-ui compliant content example", () => {
    // A more complete player-ui content example
    const element = (
      <obj>
        <property name="id" value="view_welcome" />
        <property name="type" value="view" />
        <property name="title" value="Welcome" />
        <property name="actions">
          <array>
            <obj>
              <property
                name="asset"
                value={{
                  id: "action_continue",
                  type: "action",
                  value: "Continue",
                  label: "Continue",
                  exp: e`isFormValid`,
                }}
              />
            </obj>
            <obj>
              <property
                name="asset"
                value={{
                  id: "action_back",
                  type: "action",
                  value: "Back",
                  label: "Back",
                }}
              />
            </obj>
          </array>
        </property>
        <property name="contents">
          <array>
            <obj>
              <property
                name="asset"
                value={{
                  id: "text_welcome",
                  type: "text",
                  value: "Welcome to our application!",
                  format: "paragraph",
                }}
              />
            </obj>
            <obj>
              <property
                name="asset"
                value={{
                  id: "input_name",
                  type: "input",
                  value: b`form.name`,
                  label: "Your Name",
                  required: true,
                }}
              />
            </obj>
          </array>
        </property>
      </obj>
    );

    const { jsonValue } = render(element);
    expect(jsonValue).toEqual({
      id: "view_welcome",
      type: "view",
      title: "Welcome",
      actions: [
        {
          asset: {
            id: "action_continue",
            type: "action",
            value: "Continue",
            label: "Continue",
            exp: "@[isFormValid]@",
          },
        },
        {
          asset: {
            id: "action_back",
            type: "action",
            value: "Back",
            label: "Back",
          },
        },
      ],
      contents: [
        {
          asset: {
            id: "text_welcome",
            type: "text",
            value: "Welcome to our application!",
            format: "paragraph",
          },
        },
        {
          asset: {
            id: "input_name",
            type: "input",
            value: "{{form.name}}",
            label: "Your Name",
            required: true,
          },
        },
      ],
    });
  });
});
