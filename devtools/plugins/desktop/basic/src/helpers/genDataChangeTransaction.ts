import type {
  DevtoolsDataChangeEvent,
  Transaction,
} from "@player-tools/devtools-types";
import type { Flow } from "@player-ui/react";

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
    id: -1,
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
