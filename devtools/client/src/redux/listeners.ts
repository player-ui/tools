import { Message } from "@player-tools/devtools-common";
import { Store } from "redux";
import { Actions } from '.';


export function handleMessage(store: Store, message: Message) {
  switch (message.type) {
    case 'runtime-init':
      store.dispatch(clearStore());
      break;
    case 'player-init':
      store.dispatch(Actions.Events['player-init'](message));
      store.dispatch(selectedPlayerAction());
      break;
    case 'player-removed':
      store.dispatch(playerRemoveAction(message.playerID));
      store.dispatch(selectedPlayerAction());
      break;
    case 'player-flow-start':
      store.dispatch(playerFlowStartAction(message));
      store.dispatch(playerTimelineAction(message));
      store.dispatch({
        type: GET_DATA_BINDING_DETAILS,
        payload: { playerID: message.playerID, binding: '' },
      });
      break;
    case 'player-log-event':
      store.dispatch(playerTimelineAction(message));
      break;
    case 'player-view-update-event':
      store.dispatch(playerViewUpdateAction(message));
      break;
    case 'player-data-change-event': {
      const { players } = store.getState();

      if (
        players.activePlayers[message.playerID] &&
        players.activePlayers[message.playerID].dataState.selectedBinding
      ) {
        store.dispatch({
          type: GET_DATA_BINDING_DETAILS,
          payload: message,
        });
      }

      store.dispatch({
        type: GET_DATA_BINDING_DETAILS,
        payload: { playerID: message.playerID, binding: '' },
      });
      store.dispatch(playerTimelineAction(message));
      break;
    }

    default:
      console.warn('Unhandled event: ' + JSON.stringify(message));
      break;
  }
}
