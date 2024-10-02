import { produce } from "immer";
import { dequal } from "dequal";
import type {
  DevtoolsDataChangeEvent,
  DevtoolsPluginsStore,
  ExtensionSupportedEvents,
  PlayerInitEvent,
  Transaction,
} from "@player-tools/devtools-types";
import { dset } from "dset/merge";
import merge from "lodash.merge";

const containsInteraction = (
  interactions: DevtoolsPluginsStore["interactions"],
  interaction: DevtoolsPluginsStore["interactions"][number]
) => {
  return interactions.filter((i) => dequal(i, interaction)).length > 0;
};

const safelyMerge = (target: any, path: string[] | string, value: any) => {
  const pathArray = typeof path === "string" ? path.split(",") : path;
  let obj = target;
  for (let i = 0; i < pathArray.length - 1; i++) {
    if (obj[path[i]] === null) {
      obj[path[i]] = {};
    }
    obj = obj[path[i]];
  }
  dset(target, path, value);
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
        safelyMerge(draft, "plugins", payload.plugins);

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

        merge(
          draft.plugins[transaction.payload.pluginID].flow.data,
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

        safelyMerge(
          draft,
          ["interactions"],
          [...draft.interactions, transaction]
        );
      });
    case "PLAYER_DEVTOOLS_SELECTED_PLAYER_CHANGE":
      const { playerID } = transaction.payload;

      if (!playerID) return state;
      return produce(state, (draft) => {
        safelyMerge(draft, "currentPlayer", playerID);
      });
    default:
      return state;
  }
};
