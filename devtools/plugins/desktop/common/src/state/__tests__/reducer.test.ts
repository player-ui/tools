import { describe, expect, test } from "vitest";
import { reducer } from "../reducer";
import {
  DevtoolsPluginsStore,
  Transaction,
  DevtoolsDataChangeEvent,
  PlayerInitEvent,
  DevtoolsPluginInteractionEvent,
} from "@player-tools/devtools-types";

const INITIAL_STATE: DevtoolsPluginsStore = {
  messages: [],
  plugins: {},
  interactions: [],
};

let mockTransactionID = 1;

const mockTransactionMetadata = {
  timestamp: 0,
  sender: "senderID",
  target: "player",
  context: "devtools",
  _messenger_: true,
} as const;

const mockPlayerInitTransaction: Transaction<PlayerInitEvent> = {
  ...mockTransactionMetadata,
  type: "PLAYER_DEVTOOLS_PLAYER_INIT",
  id: mockTransactionID++,
  payload: {
    plugins: {
      test: {
        id: "test",
        version: "0.0.1",
        name: "Test",
        description: "Test Plugin",
        flow: {
          id: "TestFlow",
          navigation: {
            BEGIN: "TestFlow",
          },
        },
      },
    },
  },
};

const mockPluginDataChangeTransaction: Transaction<DevtoolsDataChangeEvent> = {
  ...mockTransactionMetadata,
  type: "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
  id: mockTransactionID++,
  payload: {
    data: { foo: "bar" },
    pluginID: "test",
  },
};

const mockPluginInteractionTransaction: Transaction<DevtoolsPluginInteractionEvent> =
  {
    ...mockTransactionMetadata,
    type: "PLAYER_DEVTOOLS_PLUGIN_INTERACTION",
    id: mockTransactionID++,
    payload: {
      type: "evaluate-expression",
      payload: '{"expression": "{{foo.bar}}"}',
    },
  };

describe("reducer", () => {
  test("handles PLAYER_DEVTOOLS_PLAYER_INIT", () => {
    const newState = reducer(INITIAL_STATE, mockPlayerInitTransaction);
    expect(newState).toMatchInlineSnapshot(`
      {
        "interactions": [],
        "messages": [
          {
            "payload": {
              "plugins": {
                "test": {
                  "description": "Test Plugin",
                  "flow": {
                    "id": "TestFlow",
                    "navigation": {
                      "BEGIN": "TestFlow",
                    },
                  },
                  "id": "test",
                  "name": "Test",
                  "version": "0.0.1",
                },
              },
            },
            "type": "PLAYER_DEVTOOLS_PLAYER_INIT",
          },
        ],
        "plugins": {
          "test": {
            "description": "Test Plugin",
            "flow": {
              "id": "TestFlow",
              "navigation": {
                "BEGIN": "TestFlow",
              },
            },
            "id": "test",
            "name": "Test",
            "version": "0.0.1",
          },
        },
      }
    `);
  });

  test("handles PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE", () => {
    const newState = reducer(INITIAL_STATE, mockPluginDataChangeTransaction);
    expect(newState).toMatchInlineSnapshot(`
      {
        "interactions": [],
        "messages": [
          {
            "payload": {
              "data": {
                "foo": "bar",
              },
              "pluginID": "test",
            },
            "type": "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
          },
        ],
        "plugins": {
          "test": {
            "flow": {
              "data": {
                "foo": "bar",
              },
            },
          },
        },
      }
    `);
  });

  test("handles PLAYER_DEVTOOLS_PLUGIN_INTERACTION", () => {
    const newState = reducer(INITIAL_STATE, mockPluginInteractionTransaction);
    expect(newState).toMatchInlineSnapshot(`
      {
        "interactions": [
          {
            "_messenger_": true,
            "context": "devtools",
            "id": 3,
            "payload": {
              "payload": "{"expression": "{{foo.bar}}"}",
              "type": "evaluate-expression",
            },
            "sender": "senderID",
            "target": "player",
            "timestamp": 0,
            "type": "PLAYER_DEVTOOLS_PLUGIN_INTERACTION",
          },
        ],
        "messages": [],
        "plugins": {},
      }
    `);
  });
});
