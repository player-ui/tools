import { produce } from "immer";
import { dset } from "dset/merge";
import { dequal } from "dequal";
import type {
  DevtoolsDataChangeEvent,
  DevtoolsPluginsStore,
  ExtensionSupportedEvents,
  PlayerInitEvent,
  Transaction,
} from "@player-tools/devtools-types";

const containsInteraction = (
  interactions: DevtoolsPluginsStore["interactions"],
  interaction: DevtoolsPluginsStore["interactions"][number]
) => {
  return interactions.filter((i) => dequal(i, interaction)).length > 0;
};

/** devtools plugin state reducer */
export const reducer = (
  state: DevtoolsPluginsStore,
  transaction: Transaction<ExtensionSupportedEvents>
): DevtoolsPluginsStore => {
  switch (transaction.type) {
    case "PLAYER_DEVTOOLS_PLAYER_INIT":
      return produce(state, (draft) => {
        const { payload } = transaction;
        dset(draft, "plugins", payload.plugins);

        const message: PlayerInitEvent = {
          type: "PLAYER_DEVTOOLS_PLAYER_INIT",
          payload,
        };

        draft.messages.push(message);
      });
    case "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE":
      return produce(state, (draft) => {
        const { payload } = transaction;

        if (!payload.data) return state;

        dset(
          draft.plugins,
          [transaction.payload.pluginID, "flow", "data"],
          transaction.payload.data
        );

        const message: DevtoolsDataChangeEvent = {
          type: "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
          payload,
        };

        draft.messages.push(message);
      });
    case "PLAYER_DEVTOOLS_PLUGIN_INTERACTION":
      return produce(state, (draft) => {
        if (containsInteraction(draft.interactions, transaction)) return state;

        dset(draft, ["interactions"], [...draft.interactions, transaction]);
      });
    default:
      return state;
  }
};
