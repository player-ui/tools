import type {
  DevtoolsDataChangeEvent,
  Transaction,
} from "@player-tools/devtools-types";
import type { Flow } from "@player-ui/react";

const NOOP_ID = -1;

/**
 * Generates a data change transaction for the player devtools plugin.
 *
 * This function creates a transaction object that represents a change in data
 * within a player devtools plugin. The transaction includes details such as the
 * plugin ID, the changed data, and the player ID. It is used to communicate
 * changes between the plugin and devtools.
 */
export const genDataChangeTransaction = ({
  playerID,
  data,
  pluginID,
}: {
  playerID: string;
  data: Flow["data"];
  pluginID: string;
}): Transaction<DevtoolsDataChangeEvent> => {
  return {
    id: NOOP_ID,
    type: "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
    payload: {
      pluginID,
      data,
    },
    sender: playerID,
    context: "player",
    target: "player",
    timestamp: Date.now(),
    _messenger_: true,
  };
};
