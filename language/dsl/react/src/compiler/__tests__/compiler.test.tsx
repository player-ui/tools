import { test, expect } from "vitest";
import React from "react";
import { expression as e } from "../../string-templates";
import { DSLCompiler } from "../compiler";
import type { Navigation } from "../../types";

test("treats jsx as view", async () => {
  const compiler = new DSLCompiler();

  const result = await compiler.serialize(
    <object>
      <property name="foo">bar</property>
    </object>,
  );
  expect(result).toBeDefined();
  expect(result?.value).toStrictEqual({
    foo: "bar",
  });
});

test("should treat schema type  objects as schema", async () => {
  const compiler = new DSLCompiler();
  const result = await compiler.serialize({
    foo: { bar: { type: "StringType" } },
  });

  expect(result.value).toStrictEqual({
    ROOT: {
      foo: {
        type: "fooType",
      },
    },
    fooType: {
      bar: {
        type: "StringType",
      },
    },
  });
});

test("expressions in navigation", async () => {
  const compiler = new DSLCompiler();
  const navigation: Navigation = {
    BEGIN: "Flow",
    onStart: e`foo`,
    Flow: {
      startState: "VIEW_page",
      onStart: [e`foo`, e`foo`],
      VIEW_page: {
        onStart: {
          exp: e`foo`,
        },
        state_type: `VIEW`,
        ref: "test",
        transitions: {
          "*": "ShowView1Or2",
        },
      },
      ShowView1Or2: {
        state_type: "ACTION",
        exp: e`foo`,
        transitions: {
          "*": "VIEW_Other",
        },
      },
      END_back: {
        state_type: "END",
        outcome: "BACK",
      },
      END_done: {
        state_type: "END",
        outcome: "doneWithFlow",
      },
    },
  };
  const result = await compiler.serialize({ navigation });
  expect(result.value).toStrictEqual({
    navigation: {
      BEGIN: "Flow",
      onStart: `foo`,
      Flow: {
        startState: "VIEW_page",
        onStart: [`foo`, `foo`],
        VIEW_page: {
          onStart: {
            exp: `foo`,
          },
          state_type: `VIEW`,
          ref: "test",
          transitions: {
            "*": "ShowView1Or2",
          },
        },
        ShowView1Or2: {
          state_type: "ACTION",
          exp: `foo`,
          transitions: {
            "*": "VIEW_Other",
          },
        },
        END_back: {
          state_type: "END",
          outcome: "BACK",
        },
        END_done: {
          state_type: "END",
          outcome: "doneWithFlow",
        },
      },
    },
    views: [],
  });
});

test("compiles schema when added to flow", async () => {
  const compiler = new DSLCompiler();
  const result = await compiler.serialize({
    id: "test-flow",
    views: [],
    navigation: {
      BEGIN: "FLOW_1",
      FLOW_1: {
        startState: "VIEW_1",
        VIEW_1: {
          state_type: "VIEW",
          ref: "test",
          transitions: {
            "*": "END_Done",
          },
        },
      },
    },
    schema: {
      foo: {
        bar: {
          baz: {
            type: "StringType",
            validation: [
              {
                type: "required",
              },
            ],
          },
        },
      },
    },
  });

  expect(result).toBeDefined();
  expect(result?.value).toMatchInlineSnapshot(`
    {
      "id": "test-flow",
      "navigation": {
        "BEGIN": "FLOW_1",
        "FLOW_1": {
          "VIEW_1": {
            "ref": "test",
            "state_type": "VIEW",
            "transitions": {
              "*": "END_Done",
            },
          },
          "startState": "VIEW_1",
        },
      },
      "schema": {
        "ROOT": {
          "foo": {
            "type": "fooType",
          },
        },
        "barType": {
          "baz": {
            "type": "StringType",
            "validation": [
              {
                "type": "required",
              },
            ],
          },
        },
        "fooType": {
          "bar": {
            "type": "barType",
          },
        },
      },
      "views": [],
    }
  `);
});

test("compiles mixed DSL and non-DSL views", async () => {
  const compiler = new DSLCompiler();
  const dslView = (
    <object>
      <property name="foo">bar</property>
    </object>
  );
  const result = await compiler.serialize({
    id: "test-flow",
    views: [
      {
        id: "foo",
        type: "bar",
        info: {
          asset: {
            id: "info",
            type: "baz",
          },
        },
      },
      dslView,
    ],
    navigation: {
      BEGIN: "FLOW_1",
      FLOW_1: {
        startState: "VIEW_1",
        VIEW_1: {
          state_type: "VIEW",
          ref: "test",
          transitions: {
            "*": "END_Done",
          },
        },
      },
    },
  });

  expect(result).toBeDefined();
  expect(result?.value).toMatchInlineSnapshot(`
    {
      "id": "test-flow",
      "navigation": {
        "BEGIN": "FLOW_1",
        "FLOW_1": {
          "VIEW_1": {
            "ref": "test",
            "state_type": "VIEW",
            "transitions": {
              "*": "END_Done",
            },
          },
          "startState": "VIEW_1",
        },
      },
      "views": [
        {
          "id": "foo",
          "info": {
            "asset": {
              "id": "info",
              "type": "baz",
            },
          },
          "type": "bar",
        },
        {
          "foo": "bar",
        },
      ],
    }
  `);
});
