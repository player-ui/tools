import { describe, expect, test } from "vitest";
import type {
  Transaction,
  DevtoolsDataChangeEvent,
  PlayerInitEvent,
  DevtoolsFlowChangeEvent,
  DevtoolsEventsBatchEvent,
  PlayerStoppedEvent,
  ExtensionSelectedPlayerEvent,
  ExtensionSelectedPluginEvent,
} from "@player-tools/devtools-types";
import { reducer } from "../reducer";
import { INITIAL_EXTENSION_STATE, INITIAL_FLOW } from "../../constants";

const mockPlayerInitTransaction: Transaction<PlayerInitEvent> = {
  id: 1,
  timestamp: Date.now(),
  sender: "sender-id",
  target: "target-id",
  context: "player",
  _messenger_: true,
  type: "PLAYER_DEVTOOLS_PLAYER_INIT",
  payload: {
    plugins: {
      "plugin-id": {
        id: "plugin-id",
        description: "Plugin Description",
        flow: INITIAL_FLOW,
        name: "Plugin Name",
        version: "1.0.0",
      },
    },
  },
};

const mockPlayerFlowChangeTransaction: Transaction<DevtoolsFlowChangeEvent> = {
  id: 2,
  timestamp: Date.now(),
  sender: "sender-id",
  target: "target-id",
  context: "player",
  _messenger_: true,
  type: "PLAYER_DEVTOOLS_PLUGIN_FLOW_CHANGE",
  payload: {
    flow: {
      ...INITIAL_FLOW,
      data: {
        key: "value",
      },
    },
    pluginID: "plugin-id",
  },
};

const mockPluginDataChangeTransaction: Transaction<DevtoolsDataChangeEvent> = {
  id: 2,
  timestamp: Date.now(),
  sender: "sender-id",
  target: "target-id",
  context: "player",
  _messenger_: true,
  type: "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
  payload: {
    data: {
      key: "value",
    },
    pluginID: "plugin-id",
  },
};

const mockEventBatchTransaction: Transaction<DevtoolsEventsBatchEvent> = {
  id: 4,
  timestamp: Date.now(),
  sender: "sender-id",
  target: "target-id",
  context: "player",
  _messenger_: true,
  type: "MESSENGER_EVENT_BATCH",
  payload: {
    events: [
      mockPlayerInitTransaction,
      mockPlayerFlowChangeTransaction,
      mockPluginDataChangeTransaction,
    ],
  },
};

const mockPlayerStoppedTransaction: Transaction<PlayerStoppedEvent> = {
  id: 5,
  timestamp: Date.now(),
  sender: "sender-id",
  target: "target-id",
  context: "player",
  _messenger_: true,
  type: "PLAYER_DEVTOOLS_PLAYER_STOPPED",
  payload: null,
};

const mockPlayerSelectedTransaction: Transaction<ExtensionSelectedPlayerEvent> =
  {
    id: 6,
    timestamp: Date.now(),
    sender: "sender-id",
    target: "target-id",
    context: "player",
    _messenger_: true,
    type: "PLAYER_DEVTOOLS_PLAYER_SELECTED",
    payload: {
      playerID: "player-id",
    },
  };

const mockPluginSelectedTransaction: Transaction<ExtensionSelectedPluginEvent> =
  {
    id: 7,
    timestamp: Date.now(),
    sender: "sender-id",
    target: "target-id",
    context: "player",
    _messenger_: true,
    type: "PLAYER_DEVTOOLS_PLUGIN_SELECTED",
    payload: {
      pluginID: "plugin-id",
    },
  };

describe("reducer", () => {
  test("PLAYER_DEVTOOLS_PLAYER_INIT", () => {
    const newState = reducer(
      INITIAL_EXTENSION_STATE,
      mockPlayerInitTransaction
    );

    expect(newState).toMatchInlineSnapshot(`
      {
        "current": {
          "player": "sender-id",
          "plugin": "plugin-id",
        },
        "players": {
          "sender-id": {
            "active": true,
            "plugins": {
              "plugin-id": {
                "description": "Plugin Description",
                "flow": {
                  "id": "initial-flow",
                  "navigation": {
                    "BEGIN": "FLOW_1",
                    "FLOW_1": {
                      "VIEW_1": {
                        "ref": "view-1",
                        "state_type": "VIEW",
                        "transitions": {},
                      },
                      "startState": "VIEW_1",
                    },
                  },
                  "views": [
                    {
                      "id": "view-1",
                      "type": "text",
                      "value": "connecting...",
                    },
                  ],
                },
                "id": "plugin-id",
                "name": "Plugin Name",
                "version": "1.0.0",
              },
            },
          },
        },
      }
    `);
  });

  test("PLAYER_DEVTOOLS_PLUGIN_FLOW_CHANGE", () => {
    const newState = reducer(
      INITIAL_EXTENSION_STATE,
      mockPlayerFlowChangeTransaction
    );

    expect(newState).toMatchInlineSnapshot(`
      {
        "current": {
          "player": null,
          "plugin": null,
        },
        "players": {
          "sender-id": {
            "plugins": {
              "plugin-id": {
                "flow": {
                  "data": {
                    "key": "value",
                  },
                  "id": "initial-flow",
                  "navigation": {
                    "BEGIN": "FLOW_1",
                    "FLOW_1": {
                      "VIEW_1": {
                        "ref": "view-1",
                        "state_type": "VIEW",
                        "transitions": {},
                      },
                      "startState": "VIEW_1",
                    },
                  },
                  "views": [
                    {
                      "id": "view-1",
                      "type": "text",
                      "value": "connecting...",
                    },
                  ],
                },
              },
            },
          },
        },
      }
    `);
  });

  test("PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE", () => {
    const newState = reducer(
      INITIAL_EXTENSION_STATE,
      mockPluginDataChangeTransaction
    );

    expect(newState).toMatchInlineSnapshot(`
      {
        "current": {
          "player": null,
          "plugin": null,
        },
        "players": {
          "sender-id": {
            "plugins": {
              "plugin-id": {
                "flow": {
                  "data": {
                    "key": "value",
                  },
                },
              },
            },
          },
        },
      }
    `);
  });

  test("MESSENGER_EVENT_BATCH", () => {
    const newState = reducer(
      INITIAL_EXTENSION_STATE,
      mockEventBatchTransaction
    );

    expect(newState).toMatchInlineSnapshot(`
      {
        "current": {
          "player": "sender-id",
          "plugin": "plugin-id",
        },
        "players": {
          "sender-id": {
            "active": true,
            "plugins": {
              "plugin-id": {
                "description": "Plugin Description",
                "flow": {
                  "data": {
                    "key": "value",
                  },
                  "id": "initial-flow",
                  "navigation": {
                    "BEGIN": "FLOW_1",
                    "FLOW_1": {
                      "VIEW_1": {
                        "ref": "view-1",
                        "state_type": "VIEW",
                        "transitions": {},
                      },
                      "startState": "VIEW_1",
                    },
                  },
                  "views": [
                    {
                      "id": "view-1",
                      "type": "text",
                      "value": "connecting...",
                    },
                  ],
                },
                "id": "plugin-id",
                "name": "Plugin Name",
                "version": "1.0.0",
              },
            },
          },
        },
      }
    `);
  });

  test("PLAYER_DEVTOOLS_PLAYER_STOPPED", () => {
    const newState = reducer(
      INITIAL_EXTENSION_STATE,
      mockPlayerStoppedTransaction
    );

    expect(newState).toMatchInlineSnapshot(`
      {
        "current": {
          "player": null,
          "plugin": null,
        },
        "players": {
          "sender-id": {
            "active": false,
          },
        },
      }
    `);
  });

  test("PLAYER_DEVTOOLS_PLAYER_SELECTED", () => {
    const newState = reducer(
      INITIAL_EXTENSION_STATE,
      mockPlayerSelectedTransaction
    );

    expect(newState).toMatchInlineSnapshot(`
      {
        "current": {
          "player": "player-id",
          "plugin": null,
        },
        "players": {},
      }
    `);
  });

  test("PLAYER_DEVTOOLS_PLUGIN_SELECTED", () => {
    const newState = reducer(
      INITIAL_EXTENSION_STATE,
      mockPluginSelectedTransaction
    );

    expect(newState).toMatchInlineSnapshot(`
      {
        "current": {
          "player": null,
          "plugin": "plugin-id",
        },
        "players": {},
      }
    `);
  });
});
