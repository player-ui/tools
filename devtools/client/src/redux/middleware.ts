import { StoreState } from "@player-tools/devtools-client";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { Actions, Events } from "./actions";
import { GET_DATA_BINDING_DETAILS } from "./aliases";

export const listenerMiddleware = createListenerMiddleware();

listenerMiddleware.startListening({
  matcher: isAnyOf(
    Events.actions['player-data-change-event'],
    Events.actions['player-log-event'],
    Events.actions['player-flow-start'],
    // TODO: I don't actually think this _was_ included
    Events.actions['player-view-update-event']
  ),
  effect: (action, api) => {
    api.dispatch(Actions['player-timeline-event'](action.payload));
  },
});

listenerMiddleware.startListening({
  actionCreator: Events.actions['runtime-init'],
  effect: (_, api) => {
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
    // TODO: Just appropriately type the middleware
    const { players } = api.getState() as StoreState;
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
