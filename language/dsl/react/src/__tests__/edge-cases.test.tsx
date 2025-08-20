import { test, expect } from "vitest";
import React from "react";
import { render, expression as e, makeBindingsForObject } from "..";
import { Collection, Input, Text } from "./helpers/asset-library";

test("works with a Component that returns a Fragment of items", async () => {
  const NestedItems = () => {
    return (
      <>
        <Text>Before Input</Text>
        <Input />
        <Text>After Input</Text>
      </>
    );
  };

  const expected = {
    id: "root",
    type: "collection",
    values: [
      {
        asset: {
          id: "values-0",
          type: "text",
          value: "Before Input",
        },
      },
      {
        asset: {
          id: "values-1",
          type: "input",
        },
      },
      {
        asset: {
          id: "values-2",
          type: "text",
          value: "After Input",
        },
      },
    ],
  };

  const contentWithFragment = await render(
    <Collection>
      <Collection.Values>
        <NestedItems />
      </Collection.Values>
    </Collection>,
  );

  expect(contentWithFragment.jsonValue).toStrictEqual(expected);

  const contentWithoutFragment = await render(
    <Collection>
      <Collection.Values>
        <Text>Before Input</Text>
        <Input />
        <Text>After Input</Text>
      </Collection.Values>
    </Collection>,
  );

  expect(contentWithoutFragment.jsonValue).toStrictEqual(expected);
});

test("handles invalid expressions", async () => {
  const App = () => {
    return (
      <Collection>
        <Collection.Values>
          <Text applicability={e`foo() + '`}>Hello</Text>
        </Collection.Values>
      </Collection>
    );
  };

  await expect(render(<App />)).rejects.toThrow(
    'Unclosed quote after "" at character 9',
  );
});

test("handles using intermediate schema values as bindings", async () => {
  const model = {
    some: {
      path: [
        {
          of: {
            things: {
              type: "StringType",
            },
          },
        },
      ],
    },
  };

  const schema = makeBindingsForObject(model);

  const App = () => {
    return (
      <Collection>
        <Collection.Values>
          <Text value={schema.some.path} />
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
            "id": "values-0",
            "type": "text",
            "value": "{{some.path}}",
          },
        },
      ],
    }
  `);
});
