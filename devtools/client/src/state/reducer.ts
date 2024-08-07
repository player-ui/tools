import type {
  ExtensionState,
  ExtensionSupportedEvents,
  Transaction,
} from "@player-tools/devtools-types";
import set from "lodash.set";
import { produce } from "immer";

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
        set(draft, ["current", "player"], sender);
        set(
          draft,
          ["current", "plugin"],
          draft.current.plugin || plugins[Object.keys(plugins)[0]].id
        );

        set(draft, ["players", sender, "plugins"], plugins);
        set(draft, ["players", sender, "active"], true);
      });
    case "PLAYER_DEVTOOLS_PLUGIN_FLOW_CHANGE":
      return produce(state, (draft) => {
        const {
          sender,
          payload: { flow, pluginID },
        } = transaction;

        set(draft, ["players", sender, "plugins", pluginID, "flow"], flow);
      });
    case "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE":
      return produce(state, (draft) => {
        const {
          sender,
          payload: { data, pluginID },
        } = transaction;
        set(
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

        set(draft, ["players", sender, "active"], false);
      });
    case "PLAYER_DEVTOOLS_PLAYER_SELECTED":
      return produce(state, (draft) => {
        const { playerID } = transaction.payload;
        set(draft, ["current", "player"], playerID);
      });
    case "PLAYER_DEVTOOLS_PLUGIN_SELECTED":
      return produce(state, (draft) => {
        const { pluginID } = transaction.payload;
        set(draft, ["current", "plugin"], pluginID);
      });
    default:
      return state;
  }
};
