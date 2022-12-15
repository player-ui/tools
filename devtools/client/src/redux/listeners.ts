import { Events, Message } from "@player-tools/devtools-common";
import { eventActions } from "./actions";
import { Store } from "redux";
import { GET_DATA_BINDING_DETAILS } from "./aliases";

export function handleMessage(store: Store, message: Message) {
  // propagate message to default event handlers
  const { type } = message;
  if (type in Events.RuntimeEventTypes) {
    eventActions[type as Events.RuntimeEventTypes](message as any)
  }

  // other event handlers
  switch (message.type) {
    case 'runtime-init':
      store.dispatch(clearStore());
      break;
    case 'player-removed':
    case 'player-init':
      store.dispatch(selectedPlayerAction());
      break;
    case 'player-flow-start':
      // TODO: Can I map an action to another action? alias?
      // store.dispatch(playerTimelineAction(message));
      // retrieve data model on start
      store.dispatch({
        type: GET_DATA_BINDING_DETAILS,
        payload: { playerID: message.playerID, binding: '' },
      });
      break;
    // case 'player-log-event':
    //   store.dispatch(playerTimelineAction(message));
    //   break;
    // case 'player-view-update-event':
    //   store.dispatch(playerViewUpdateAction(message));
    //   break;
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
