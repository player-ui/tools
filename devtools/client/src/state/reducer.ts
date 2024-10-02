import type {
  ExtensionState,
  ExtensionSupportedEvents,
  Transaction,
} from "@player-tools/devtools-types";
import { dset } from "dset/merge";
import merge from "lodash.merge";
import { produce } from "immer";

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

/** Extension state reducer */
export const reducer = (
  state: ExtensionState,
  transaction: Transaction<ExtensionSupportedEvents>
): ExtensionState => {
  switch (transaction.type) {
    case "PLAYER_DEVTOOLS_PLAYER_INIT":
      return produce(state, (draft) => {
        const {
          sender,
          payload: { plugins },
        } = transaction;
        safelyMerge(draft, ["current", "player"], sender);
        safelyMerge(
          draft,
          ["current", "plugin"],
          draft.current.plugin || plugins[Object.keys(plugins)[0]].id
        );

        safelyMerge(draft, ["players", sender, "plugins"], plugins);
        safelyMerge(draft, ["players", sender, "active"], true);
      });
    case "PLAYER_DEVTOOLS_PLUGIN_FLOW_CHANGE":
      return produce(state, (draft) => {
        const {
          sender,
          payload: { flow, pluginID },
        } = transaction;

        safelyMerge(
          draft,
          ["players", sender, "plugins", pluginID, "flow"],
          flow
        );
      });
    case "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE":
      return produce(state, (draft) => {
        const {
          sender,
          payload: { data, pluginID },
        } = transaction;
        merge(
          draft,
          ["players", sender, "plugins", pluginID, "flow", "data"],
          data
        );
      });
    case "MESSENGER_EVENT_BATCH":
      return produce(state, (draft) => {
        return transaction.payload.events.reduce(reducer, draft);
      });
    case "PLAYER_DEVTOOLS_PLAYER_STOPPED":
      return produce(state, (draft) => {
        const { sender } = transaction;

        safelyMerge(draft, ["players", sender, "active"], false);
      });
    case "PLAYER_DEVTOOLS_PLAYER_SELECTED":
      return produce(state, (draft) => {
        const { playerID } = transaction.payload;
        safelyMerge(draft, ["current", "player"], playerID);
      });
    case "PLAYER_DEVTOOLS_PLUGIN_SELECTED":
      return produce(state, (draft) => {
        const { pluginID } = transaction.payload;
        safelyMerge(draft, ["current", "plugin"], pluginID);
      });
    default:
      return state;
  }
};
