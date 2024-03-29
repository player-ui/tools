import { test, expect, describe } from "vitest";
import React from "react";
import { render } from "react-json-reconciler";
import { expression as e } from "..";
import { Switch } from "../switch";
import { Text, Collection, Input } from "./helpers/asset-library";

describe("staticSwitch", () => {
  test("works for basic cases", async () => {
    const element = (
      <Collection>
        <Collection.Label>
          <Switch>
            <Switch.Case exp={e`foo() = bar()`}>
              <Text>Text 1</Text>
            </Switch.Case>
            <Switch.Case>
              <Text>Text 1</Text>
            </Switch.Case>
          </Switch>
        </Collection.Label>
      </Collection>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "root",
      type: "collection",
      label: {
        staticSwitch: [
          {
            case: "foo() = bar()",
            asset: {
              id: "label-staticSwitch-0",
              type: "text",
              value: "Text 1",
            },
          },
          {
            case: true,
            asset: {
              id: "label-staticSwitch-1",
              type: "text",
              value: "Text 1",
            },
          },
        ],
      },
    });
  });

  test("works for dynamic switch", async () => {
    const element = (
      <Collection>
        <Collection.Label>
          <Switch isDynamic>
            <Switch.Case exp={e`foo() = bar()`}>
              <Text>Text 1</Text>
            </Switch.Case>
            <Switch.Case>
              <Input>
                <Input.Label>
                  <Switch>
                    <Switch.Case exp={e`bar() == bar()`}>
                      <Text>Text 1</Text>
                    </Switch.Case>
                  </Switch>
                </Input.Label>
              </Input>
            </Switch.Case>
          </Switch>
        </Collection.Label>
      </Collection>
    );

    expect((await render(element)).jsonValue).toMatchInlineSnapshot(`
      {
        "id": "root",
        "label": {
          "dynamicSwitch": [
            {
              "asset": {
                "id": "label-dynamicSwitch-0",
                "type": "text",
                "value": "Text 1",
              },
              "case": "foo() = bar()",
            },
            {
              "asset": {
                "id": "label-dynamicSwitch-1",
                "label": {
                  "staticSwitch": [
                    {
                      "asset": {
                        "id": "label-dynamicSwitch-1-label-staticSwitch-0",
                        "type": "text",
                        "value": "Text 1",
                      },
                      "case": "bar() == bar()",
                    },
                  ],
                },
                "type": "input",
              },
              "case": true,
            },
          ],
        },
        "type": "collection",
      }
    `);
  });

  test("static switch with boolean exp", async () => {
    const element = (
      <Collection>
        <Collection.Label>
          <Switch>
            <Switch.Case exp>
              <Text>Text 1</Text>
            </Switch.Case>
            <Switch.Case exp={false}>
              <Text>Text 1</Text>
            </Switch.Case>
          </Switch>
        </Collection.Label>
      </Collection>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "root",
      type: "collection",
      label: {
        staticSwitch: [
          {
            case: true,
            asset: {
              id: "label-staticSwitch-0",
              type: "text",
              value: "Text 1",
            },
          },
          {
            case: false,
            asset: {
              id: "label-staticSwitch-1",
              type: "text",
              value: "Text 1",
            },
          },
        ],
      },
    });
  });

  test("dynamic switch with boolean exp", async () => {
    const element = (
      <Collection>
        <Collection.Label>
          <Switch isDynamic>
            <Switch.Case exp>
              <Text>Text 1</Text>
            </Switch.Case>
            <Switch.Case exp={false}>
              <Text>Text 1</Text>
            </Switch.Case>
          </Switch>
        </Collection.Label>
      </Collection>
    );

    expect((await render(element)).jsonValue).toStrictEqual({
      id: "root",
      type: "collection",
      label: {
        dynamicSwitch: [
          {
            case: true,
            asset: {
              id: "label-dynamicSwitch-0",
              type: "text",
              value: "Text 1",
            },
          },
          {
            case: false,
            asset: {
              id: "label-dynamicSwitch-1",
              type: "text",
              value: "Text 1",
            },
          },
        ],
      },
    });
  });
});

describe("generates ids", () => {
  test("works for collection items", async () => {
    const content = (
      <Collection>
        <Collection.Values>
          <Switch>
            <Switch.Case>
              <Text>Test 1</Text>
            </Switch.Case>
          </Switch>
          <Switch>
            <Switch.Case>
              <Text>Test 2</Text>
            </Switch.Case>
          </Switch>
        </Collection.Values>
      </Collection>
    );

    expect((await render(content)).jsonValue).toMatchInlineSnapshot(`
      {
        "id": "root",
        "type": "collection",
        "values": [
          {
            "staticSwitch": [
              {
                "asset": {
                  "id": "values-0-staticSwitch-0",
                  "type": "text",
                  "value": "Test 1",
                },
                "case": true,
              },
            ],
          },
          {
            "staticSwitch": [
              {
                "asset": {
                  "id": "values-1-staticSwitch-0",
                  "type": "text",
                  "value": "Test 2",
                },
                "case": true,
              },
            ],
          },
        ],
      }
    `);
  });
});
