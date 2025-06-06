import { test, expect, describe } from "vitest";
import React from "react";
import { render } from "react-json-reconciler";
import { binding as b } from "..";
import { Template } from "../template";
import { Text, Collection } from "./helpers/asset-library";

test("finds output property based on array context", async () => {
  const element = (
    <obj>
      <property name="foo">
        <array>
          <value>Foo</value>
          <Template data={b`foo.output`}>
            <value>bar</value>
          </Template>
        </array>
      </property>
    </obj>
  );

  expect((await render(element)).jsonValue).toStrictEqual({
    foo: ["Foo"],
    template: [
      {
        data: "foo.output",
        value: "bar",
        output: "foo",
        placement: "append",
      },
    ],
  });
});

test("finds dynamic property in a template", async () => {
  const element = (
    <obj>
      <property name="foo">
        <array>
          <value>Foo</value>
          <Template dynamic data={b`foo.output`}>
            <value>bar</value>
          </Template>
        </array>
      </property>
    </obj>
  );

  expect((await render(element)).jsonValue).toStrictEqual({
    foo: ["Foo"],
    template: [
      {
        data: "foo.output",
        dynamic: true,
        value: "bar",
        output: "foo",
        placement: "append",
      },
    ],
  });
});

test("works if already in a template array", async () => {
  const element = (
    <obj>
      <property name="template">
        <array>
          <Template output="output" data={b`foo.output`}>
            <value>bar</value>
          </Template>
        </array>
      </property>
    </obj>
  );
  expect((await render(element)).jsonValue).toStrictEqual({
    template: [{ output: "output", data: "foo.output", value: "bar" }],
  });
});

test("Template order is preserved", async () => {
  const element = (
    <Collection id="view-1">
      <Collection.Values>
        <Collection>
          <Collection.Label>
            This collection has a template first
          </Collection.Label>
          <Collection.Values>
            <Template data={b`foo`}>
              <Text>Dynamic Item _index_</Text>
            </Template>
            <Text>Static Item</Text>
          </Collection.Values>
        </Collection>

        <Collection>
          <Collection.Label>
            This collection has a template last
          </Collection.Label>
          <Collection.Values>
            <Text>Static Item</Text>
            <Template data={b`foo`}>
              <Text>Dynamic Item _index_</Text>
            </Template>
          </Collection.Values>
        </Collection>
      </Collection.Values>
    </Collection>
  );

  const expectedOutput = {
    id: "view-1",
    type: "collection",
    values: [
      {
        asset: {
          id: "view-1-values-0",
          type: "collection",
          label: {
            asset: {
              id: "view-1-values-0-label",
              type: "text",
              value: "This collection has a template first",
            },
          },
          template: [
            {
              data: "foo",
              output: "values",
              value: {
                asset: {
                  id: "view-1-values-0-values-_index_",
                  type: "text",
                  value: "Dynamic Item _index_",
                },
              },
              placement: "prepend",
            },
          ],
          values: [
            {
              asset: {
                id: "view-1-values-0-values-1",
                type: "text",
                value: "Static Item",
              },
            },
          ],
        },
      },
      {
        asset: {
          id: "view-1-values-1",
          type: "collection",
          label: {
            asset: {
              id: "view-1-values-1-label",
              type: "text",
              value: "This collection has a template last",
            },
          },
          values: [
            {
              asset: {
                id: "view-1-values-1-values-0",
                type: "text",
                value: "Static Item",
              },
            },
          ],
          template: [
            {
              data: "foo",
              output: "values",
              value: {
                asset: {
                  id: "view-1-values-1-values-_index_",
                  type: "text",
                  value: "Dynamic Item _index_",
                },
              },
              placement: "append",
            },
          ],
        },
      },
    ],
  };

  expect(JSON.stringify((await render(element)).jsonValue)).toBe(
    JSON.stringify(expectedOutput),
  );
});

test("Template placement is inferred as prepend", async () => {
  const element = (
    <obj>
      <property name="foo">
        <array>
          <Template dynamic data={b`foo.output`}>
            <value>bar</value>
          </Template>
          <value>Foo</value>
        </array>
      </property>
    </obj>
  );
  expect((await render(element)).jsonValue).toStrictEqual({
    foo: ["Foo"],
    template: [
      {
        data: "foo.output",
        placement: "prepend",
        dynamic: true,
        value: "bar",
        output: "foo",
      },
    ],
  });
});

test("Template placement is inferred as append", async () => {
  const element = (
    <obj>
      <property name="foo">
        <array>
          <value>Foo</value>
          <Template dynamic data={b`foo.output`}>
            <value>bar</value>
          </Template>
        </array>
      </property>
    </obj>
  );

  expect((await render(element)).jsonValue).toStrictEqual({
    foo: ["Foo"],
    template: [
      {
        data: "foo.output",
        placement: "append",
        dynamic: true,
        value: "bar",
        output: "foo",
      },
    ],
  });
});

test("Template with explicit placement is respected", async () => {
  const element = (
    <obj>
      <property name="foo">
        <array>
          <value>Foo</value>
          <Template dynamic data={b`foo.output`} placement="prepend">
            <value>bar</value>
          </Template>
        </array>
      </property>
    </obj>
  );

  expect((await render(element)).jsonValue).toStrictEqual({
    foo: ["Foo"],
    template: [
      {
        data: "foo.output",
        placement: "prepend",
        dynamic: true,
        value: "bar",
        output: "foo",
      },
    ],
  });
});

test("template will delete empty arrays related to the template only", async () => {
  const element = (
    <Collection>
      <Collection.Actions>
        <Template data={b`foo.bar`}>
          <Text>Template action</Text>
        </Template>
      </Collection.Actions>
      <Collection.Values>
        <Template data={b`foo.bar`}>
          <Text>Template Value 1</Text>
        </Template>
        <Collection>
          <Collection.Actions />
          {/* "actions": [] will not be deleted since it's not related to template */}
          <Collection.Values>
            {/* "values": [] will not be deleted */}
            <Template data={b`foo.bar`}>
              <Text>Template Value 2</Text>
            </Template>
          </Collection.Values>
        </Collection>
        <Collection>
          <Collection.Actions />
          <Collection.Values>
            <Text>This should not be deleted by template</Text>
            {/* "values" array will have text so it will not be deleted, only empty arrays are deleted */}
            <Template data={b`foo.bar`}>
              <Text>Template Value 3</Text>
            </Template>
          </Collection.Values>
        </Collection>
      </Collection.Values>
    </Collection>
  );
  expect((await render(element)).jsonValue).toStrictEqual({
    id: "root",
    type: "collection",
    template: [
      {
        data: "foo.bar",
        output: "actions",
        value: {
          id: "actions-_index_",
          type: "text",
          value: "Template action",
        },
      },
      {
        data: "foo.bar",
        output: "values",
        placement: "prepend",
        value: {
          asset: {
            id: "values-_index_",
            type: "text",
            value: "Template Value 1",
          },
        },
      },
    ],
    values: [
      {
        asset: {
          actions: [],
          id: "values-1",
          type: "collection",
          template: [
            {
              data: "foo.bar",
              output: "values",
              value: {
                asset: {
                  id: "values-1-values-_index_",
                  type: "text",
                  value: "Template Value 2",
                },
              },
            },
          ],
        },
      },
      {
        asset: {
          actions: [],
          id: "values-2",
          type: "collection",
          values: [
            {
              asset: {
                id: "values-2-values-0",
                type: "text",
                value: "This should not be deleted by template",
              },
            },
          ],
          template: [
            {
              data: "foo.bar",
              output: "values",
              placement: "append",
              value: {
                asset: {
                  id: "values-2-values-_index_",
                  type: "text",
                  value: "Template Value 3",
                },
              },
            },
          ],
        },
      },
    ],
  });
});

describe("template auto id", () => {
  test("simple", async () => {
    const element = (
      <Collection>
        <Collection.Values>
          <Template data={b`foo.bar`}>
            <Text>Template Value</Text>
          </Template>
          <Text id="static">Value 1</Text>
        </Collection.Values>
      </Collection>
    );

    const actual = (await render(element)).jsonValue;

    expect(actual).toStrictEqual({
      id: "root",
      type: "collection",
      template: [
        {
          data: "foo.bar",
          output: "values",
          value: {
            asset: {
              id: "values-_index_",
              type: "text",
              value: "Template Value",
            },
          },
          placement: "prepend",
        },
      ],
      values: [
        {
          asset: {
            id: "static",
            type: "text",
            value: "Value 1",
          },
        },
      ],
    });
  });

  test("nested", async () => {
    const element = (
      <Collection>
        <Collection.Values>
          <Template data={b`foo.bar`}>
            <Collection>
              <Collection.Values>
                <Template data={b`foo.baz`}>
                  <Text>Nested Templates</Text>
                </Template>
              </Collection.Values>
            </Collection>
          </Template>
          <Text id="static">Value 1</Text>
        </Collection.Values>
      </Collection>
    );

    const actual = (await render(element)).jsonValue;

    expect(actual).toStrictEqual({
      id: "root",
      type: "collection",
      template: [
        {
          data: "foo.bar",
          output: "values",
          value: {
            asset: {
              id: "values-_index_",
              template: [
                {
                  output: "values",
                  data: "foo.baz",
                  value: {
                    asset: {
                      id: "values-_index_-values-_index1_",
                      type: "text",
                      value: "Nested Templates",
                    },
                  },
                },
              ],
              type: "collection",
            },
          },
          placement: "prepend",
        },
      ],
      values: [
        {
          asset: {
            id: "static",
            type: "text",
            value: "Value 1",
          },
        },
      ],
    });
  });
});
