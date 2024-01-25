import React from 'react';
import { expression as e } from '../../string-templates';
import { DSLCompiler } from '../compiler';
import type { Navigation } from '../../types';

test('treats jsx as view', async () => {
  const compiler = new DSLCompiler();

  const result = await compiler.serialize(
    <object>
      <property name="foo">bar</property>
    </object>
  );
  expect(result.value).toStrictEqual({
    foo: 'bar',
  });
});

test('should treat schema type objects as schema', async () => {
  const compiler = new DSLCompiler();
  const result = await compiler.serialize({
    foo: { bar: { type: 'StringType' } },
  });

  expect(result.value).toStrictEqual({
    ROOT: {
      foo: {
        type: 'fooType',
      },
    },
    fooType: {
      bar: {
        type: 'StringType',
      },
    },
  });
});

test('expressions in navigation', async () => {
  const compiler = new DSLCompiler();
  const navigation: Navigation = {
    BEGIN: 'Flow',
    onStart: e`foo`,
    Flow: {
      startState: 'VIEW_page',
      onStart: [e`foo`, e`foo`],
      VIEW_page: {
        onStart: {
          exp: e`foo`,
        },
        state_type: `VIEW`,
        ref: 'test',
        transitions: {
          '*': 'ShowGatewayOrMCUI',
        },
      },
      ShowGatewayOrMCUI: {
        state_type: 'ACTION',
        exp: e`foo`,
        transitions: {
          '*': 'VIEW_Gateway',
        },
      },
      END_back: {
        state_type: 'END',
        outcome: 'BACK',
      },
      END_done: {
        state_type: 'END',
        outcome: 'doneWithFlow',
      },
    },
  };
  const result = await compiler.serialize({ navigation });
  expect(result.value).toStrictEqual({
    navigation: {
      BEGIN: 'Flow',
      onStart: `foo`,
      Flow: {
        startState: 'VIEW_page',
        onStart: [`foo`, `foo`],
        VIEW_page: {
          onStart: {
            exp: `foo`,
          },
          state_type: `VIEW`,
          ref: 'test',
          transitions: {
            '*': 'ShowGatewayOrMCUI',
          },
        },
        ShowGatewayOrMCUI: {
          state_type: 'ACTION',
          exp: `foo`,
          transitions: {
            '*': 'VIEW_Gateway',
          },
        },
        END_back: {
          state_type: 'END',
          outcome: 'BACK',
        },
        END_done: {
          state_type: 'END',
          outcome: 'doneWithFlow',
        },
      },
    },
    views: [],
  });
});

test('compiles schema when added to flow', async () => {
  const compiler = new DSLCompiler();
  const result = await compiler.serialize({
    id: 'test-flow',
    views: [],
    navigation: {
      BEGIN: 'FLOW_1',
      FLOW_1: {
        startState: 'VIEW_1',
        VIEW_1: {
          state_type: 'VIEW',
          ref: 'test',
          transitions: {
            '*': 'END_Done',
          },
        },
      },
    },
    schema: {
      foo: {
        bar: {
          baz: {
            type: 'StringType',
            validation: [
              {
                type: 'required',
              },
            ],
          },
        },
      },
    },
  });

  expect(result.value).toMatchInlineSnapshot(`
    Object {
      "id": "test-flow",
      "navigation": Object {
        "BEGIN": "FLOW_1",
        "FLOW_1": Object {
          "VIEW_1": Object {
            "ref": "test",
            "state_type": "VIEW",
            "transitions": Object {
              "*": "END_Done",
            },
          },
          "startState": "VIEW_1",
        },
      },
      "schema": Object {
        "ROOT": Object {
          "foo": Object {
            "type": "fooType",
          },
        },
        "barType": Object {
          "baz": Object {
            "type": "StringType",
            "validation": Array [
              Object {
                "type": "required",
              },
            ],
          },
        },
        "fooType": Object {
          "bar": Object {
            "type": "barType",
          },
        },
      },
      "views": Array [],
    }
  `);
});

test('compiles mixed DSL and non-DSL views', async () => {
  const compiler = new DSLCompiler();
  const dslView = (
    <object>
      <property name="foo">bar</property>
    </object>
  );
  const result = await compiler.serialize({
    id: 'test-flow',
    views: [
      {
        id: 'foo',
        type: 'bar',
        info: {
          asset: {
            id: 'info',
            type: 'baz',
          },
        },
      },
      dslView,
    ],
    navigation: {
      BEGIN: 'FLOW_1',
      FLOW_1: {
        startState: 'VIEW_1',
        VIEW_1: {
          state_type: 'VIEW',
          ref: 'test',
          transitions: {
            '*': 'END_Done',
          },
        },
      },
    },
  });

  expect(result.value).toMatchInlineSnapshot(`
    Object {
      "id": "test-flow",
      "navigation": Object {
        "BEGIN": "FLOW_1",
        "FLOW_1": Object {
          "VIEW_1": Object {
            "ref": "test",
            "state_type": "VIEW",
            "transitions": Object {
              "*": "END_Done",
            },
          },
          "startState": "VIEW_1",
        },
      },
      "views": Array [
        Object {
          "id": "foo",
          "info": Object {
            "asset": Object {
              "id": "info",
              "type": "baz",
            },
          },
          "type": "bar",
        },
        Object {
          "foo": "bar",
        },
      ],
    }
  `);
});
