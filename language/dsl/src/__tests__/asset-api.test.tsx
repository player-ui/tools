import { test, expect, describe } from "vitest";
import React from "react";
import { render } from "react-json-reconciler";
import { binding as b, expression as e } from "../string-templates";
import { Switch } from "../switch";
import {
  Collection,
  Text,
  Input,
  ArrayProp,
  Choice,
} from "./helpers/asset-library";

describe("components", () => {
  test("automatically creates collections", async () => {
    const element = (
      <Collection>
        <Collection.Label>
          <Text>Foo</Text>
          <Text>Bar</Text>
        </Collection.Label>
        <Collection.Values>
          <Text>Foo</Text>
          <Text>Bar</Text>
        </Collection.Values>
      </Collection>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "root",
      type: "collection",
      label: {
        asset: {
          id: "label",
          type: "collection",
          values: [
            { asset: { id: "label-values-0", type: "text", value: "Foo" } },
            { asset: { id: "label-values-1", type: "text", value: "Bar" } },
          ],
        },
      },
      values: [
        { asset: { id: "values-0", type: "text", value: "Foo" } },
        { asset: { id: "values-1", type: "text", value: "Bar" } },
      ],
    });
  });

  test("automatically creates text assets", async () => {
    const element = (
      <Collection>
        <Collection.Label>Foo {b`bar`.toString()}</Collection.Label>
        <Collection.Values>
          <Text>Foo</Text>
          <Text>Bar</Text>
        </Collection.Values>
      </Collection>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "root",
      type: "collection",
      label: {
        asset: {
          id: "label",
          type: "text",
          value: "Foo {{bar}}",
        },
      },
      values: [
        { asset: { id: "values-0", type: "text", value: "Foo" } },
        { asset: { id: "values-1", type: "text", value: "Bar" } },
      ],
    });
  });

  test("works with fragments", async () => {
    const element = (
      <Collection>
        <Collection.Label>
          <Text>Label</Text>
        </Collection.Label>
        <Collection.Values>
          <>
            <Text>Foo</Text>
            <Text>Bar</Text>
            <>
              <Text>Foo</Text>
              <Text>Bar</Text>
            </>
          </>
          <Text value="value-4" />
        </Collection.Values>
      </Collection>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "root",
      type: "collection",
      label: { asset: { id: "label", type: "text", value: "Label" } },
      values: [
        {
          asset: {
            id: "values-0",
            type: "text",
            value: "Foo",
          },
        },
        {
          asset: {
            id: "values-1",
            type: "text",
            value: "Bar",
          },
        },
        {
          asset: {
            id: "values-2",
            type: "text",
            value: "Foo",
          },
        },
        {
          asset: {
            id: "values-3",
            type: "text",
            value: "Bar",
          },
        },
        {
          asset: {
            id: "values-4",
            type: "text",
            value: "value-4",
          },
        },
      ],
    });
  });

  describe("custom text modifier component", () => {
    test("works with refs and layout effects", async () => {
      const element = await render(
        <Text>
          Foo{" "}
          <Text.Modifier value="important" type="tag">
            Bar
          </Text.Modifier>
        </Text>,
      );

      expect(element.jsonValue).toMatchInlineSnapshot(`
        {
          "id": "root",
          "modifiers": [
            {
              "name": "M0",
              "type": "tag",
              "value": "important",
            },
          ],
          "type": "text",
          "value": "Foo [[M0]]Bar[[/M0]]",
        }
      `);
    });
  });

  describe("bindings", () => {
    test("converts just a binding node into a ref", async () => {
      const element = await render(<Text>{b`foo.bar`.toString()}</Text>);

      expect(element.jsonValue).toStrictEqual({
        id: "root",
        type: "text",
        value: "{{foo.bar}}",
      });
    });

    test("converts a text string into refs", async () => {
      const element = await render(
        <Text>Label {b`foo.bar`.toString()} End</Text>,
      );

      expect(element.jsonValue).toStrictEqual({
        id: "root",
        type: "text",
        value: "Label {{foo.bar}} End",
      });
    });

    test("leaves bindings for expected props", async () => {
      const element = await render(
        <Input binding={b`foo.bar.baz`}>
          <Input.Label>Input Label</Input.Label>
        </Input>,
      );

      expect(element.jsonValue).toStrictEqual({
        id: "root",
        type: "input",
        binding: "foo.bar.baz",
        label: {
          asset: {
            type: "text",
            id: "label",
            value: "Input Label",
          },
        },
      });
    });
  });

  describe("applicability", () => {
    test("works with applicability prop", async () => {
      const element = await render(
        <Input id="custom-id" applicability={b`foo.bar.baz`}>
          <Input.Label>Input Label</Input.Label>
        </Input>,
      );

      expect(element.jsonValue).toStrictEqual({
        id: "custom-id",
        type: "input",
        applicability: "{{foo.bar.baz}}",
        label: {
          asset: {
            type: "text",
            id: "custom-id-label",
            value: "Input Label",
          },
        },
      });
    });

    test("works for boolean literals", async () => {
      const element = await render(
        <Input id="custom-id" applicability={false}>
          <Input.Label>Input Label</Input.Label>
        </Input>,
      );

      expect(element.jsonValue).toStrictEqual({
        id: "custom-id",
        type: "input",
        applicability: false,
        label: {
          asset: {
            type: "text",
            id: "custom-id-label",
            value: "Input Label",
          },
        },
      });
    });

    test("works with bindings", async () => {
      const show = b`show`;
      const App = () => {
        return (
          <Collection>
            <Collection.Values>
              <Text applicability={show}>
                Hidden - using a binding for applicability
              </Text>
              <Text applicability={e`${show}`}>
                Hidden - using an expression for applicability
              </Text>
              <Text applicability={true}>
                Hidden - using a boolean for applicability
              </Text>
            </Collection.Values>
          </Collection>
        );
      };

      expect((await render(<App />)).jsonValue).toMatchInlineSnapshot(`
        {
          "id": "root",
          "type": "collection",
          "values": [
            {
              "asset": {
                "applicability": "{{show}}",
                "id": "values-0",
                "type": "text",
                "value": "Hidden - using a binding for applicability",
              },
            },
            {
              "asset": {
                "applicability": "{{show}}",
                "id": "values-1",
                "type": "text",
                "value": "Hidden - using an expression for applicability",
              },
            },
            {
              "asset": {
                "applicability": true,
                "id": "values-2",
                "type": "text",
                "value": "Hidden - using a boolean for applicability",
              },
            },
          ],
        }
      `);
    });
  });

  test("auto-id", async () => {
    const element = (
      <Collection id="first-thing">
        <Collection.Label>Text</Collection.Label>
      </Collection>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "first-thing",
      type: "collection",
      label: {
        asset: {
          type: "text",
          id: "first-thing-label",
          value: "Text",
        },
      },
    });
  });

  test("auto-id for non-asset", async () => {
    const element = (
      <Choice id="choice" binding={b`foo.bar.baz`}>
        <Choice.Items>
          <Choice.Item>
            <Choice.Item.Label>Item 1</Choice.Item.Label>
          </Choice.Item>
          <Choice.Item>
            <Choice.Item.Label>Item 2</Choice.Item.Label>
          </Choice.Item>
        </Choice.Items>
      </Choice>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "choice",
      type: "choice",
      binding: "foo.bar.baz",
      items: [
        {
          id: "choice-items-0",
          label: {
            asset: {
              id: "choice-items-0-label",
              type: "text",
              value: "Item 1",
            },
          },
        },
        {
          id: "choice-items-1",
          label: {
            asset: {
              id: "choice-items-1-label",
              type: "text",
              value: "Item 2",
            },
          },
        },
      ],
    });
  });

  test("should allow for a binding-ref on any leaf property", async () => {
    const element = (
      <ArrayProp
        stuff={[]}
        optionalNumber={b`foo.bar`}
        metaData={{
          optionalUnion: {
            other: b`foo`,
          },
        }}
      />
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "root",
      metaData: {
        optionalUnion: {
          other: "{{foo}}",
        },
      },
      optionalNumber: "{{foo.bar}}",
      stuff: [],
      type: "assetWithArray",
    });
  });
});

describe("allows other props to be added to a slot", () => {
  test("works with asset children", async () => {
    const element = await render(
      <Input id="custom-id">
        <Input.Label customLabelProp="custom label slot value">
          Input Label
        </Input.Label>
      </Input>,
    );

    expect(element.jsonValue).toStrictEqual({
      id: "custom-id",
      type: "input",
      label: {
        customLabelProp: "custom label slot value",
        asset: {
          type: "text",
          id: "custom-id-label",
          value: "Input Label",
        },
      },
    });
  });

  test("works with switch children", async () => {
    const element = await render(
      <Input id="custom-id">
        <Input.Label customLabelProp="custom label slot value">
          <Switch>
            <Switch.Case>
              <Text>Test</Text>
            </Switch.Case>
          </Switch>
        </Input.Label>
      </Input>,
    );

    expect(element.jsonValue).toStrictEqual({
      id: "custom-id",
      type: "input",
      label: {
        customLabelProp: "custom label slot value",
        staticSwitch: [
          {
            asset: {
              type: "text",
              id: "custom-id-label-staticSwitch-0",
              value: "Test",
            },
            case: true,
          },
        ],
      },
    });
  });
});
