import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { Actions, Events } from "./actions";
import { GET_DATA_BINDING_DETAILS } from "./aliases";
import { type StoreState } from './state';

/**
 * Listener middleware that will be consumed by default when creating the devtools store.
 * Exported such that clients can configure additional side effects.
 */
export const listenerMiddleware = createListenerMiddleware<StoreState>();

listenerMiddleware.startListening({
  matcher: isAnyOf(
    Events.actions['player-data-change-event'],
    Events.actions['player-log-event'],
    Events.actions['player-flow-start'],
  ),
  effect: (action, api) => {
    api.dispatch(Actions['player-timeline-event'](action.payload));
  },
});

listenerMiddleware.startListening({
  actionCreator: Events.actions['runtime-init'],
  effect: (_, api) => {
    console.log("um")
    api.dispatch(Actions["clear-store"]())
  }
})

listenerMiddleware.startListening({
  matcher: isAnyOf(
    Events.actions["player-init"],
    Events.actions["player-removed"],
  ),
  effect: (_, api) => {
    api.dispatch(Actions["selected-player"]())
  }
});

listenerMiddleware.startListening({
  matcher: isAnyOf(
    Events.actions["player-flow-start"],
    Events.actions["player-data-change-event"],
  ),
  effect: (action, api) => {
    const { players } = api.getState();
    const { playerID } = action.payload;

    if (
      players.activePlayers[playerID] &&
      players.activePlayers[playerID].dataState.selectedBinding
    ) {
      api.dispatch({
        type: GET_DATA_BINDING_DETAILS,
        payload: { playerID, binding: players.activePlayers[playerID].dataState.selectedBinding },
      });
    }

    api.dispatch({
      type: GET_DATA_BINDING_DETAILS,
      payload: { playerID, binding: '' },
    })
  }
})
