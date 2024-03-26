import type { ExtensionState } from "@player-tools/devtools-types";
import type { Flow, ReactPlayerPlugin } from "@player-ui/react";
import DevtoolsUIAssetsPlugin from "@devtools-ui/plugin";
import { PubSubPlugin } from "@player-ui/pubsub-plugin";

export const PUBSUB_PLUGIN = new PubSubPlugin();

export const PLAYER_PLUGINS: ReactPlayerPlugin[] = [
  new DevtoolsUIAssetsPlugin(),
  PUBSUB_PLUGIN,
];

export const INITIAL_FLOW: Flow = {
  id: "initial-flow",
  views: [
    {
      id: "view-1",
      type: "text",
      value: "connecting...",
    },
  ],
  navigation: {
    BEGIN: "FLOW_1",
    FLOW_1: {
      startState: "VIEW_1",
      VIEW_1: {
        state_type: "VIEW",
        ref: "view-1",
        transitions: {},
      },
    },
  },
};

export const INITIAL_EXTENSION_STATE: ExtensionState = {
  current: {
    player: null,
    plugin: null,
  },
  players: {},
};
