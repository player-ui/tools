import {
  AnyAction,
  configureStore,
  createReducer,
  Dispatch,
  Middleware,
  MiddlewareArray,
  ActionReducerMapBuilder,
  EnhancedStore,
} from '@reduxjs/toolkit';
import { logsClearAction } from './actions';
/* eslint-disable no-param-reassign */
import {
  playerFlowStartAction,
  playerTimelineAction,
  playerViewUpdateAction,
  clearSelectedDataDetails,
  playerInitAction,
  playerRemoveAction,
  selectedPlayerAction,
  consoleClearAction,
  clearStore,
} from './actions';
import { PlayersState, StoreState } from '../types/state';

const initialState = {
  selectedPlayerId: null,
  activePlayers: {},
} as PlayersState;

/**
 * This function returns the players reducer. Optionally accepts a callback that receives builder object to add cases upon
 * @param playerReducerCallback: A callback that receives builder object to add cases upon
 * @returns
 */
const playersReducer = (
  playerReducerCallback?: (
    mapBuilder: ActionReducerMapBuilder<PlayersState>
  ) => void
) => {
  return createReducer<PlayersState>(initialState, (builder) => {
    builder.addCase(playerInitAction, (state, action) => {
      const {
        payload: { version, playerID },
      } = action;
      state.activePlayers[playerID] = {
        timelineEvents: [],
        dataState: {},
        consoleState: { history: [] },
      };
      state.version = version;
    });

    builder.addCase(playerRemoveAction, (state, action) => {
      delete state.activePlayers[action.payload];
    });

    builder.addCase(selectedPlayerAction, (state, action) => {
      if (action.payload) {
        state.selectedPlayerId = action.payload;
        return;
      }

      state.selectedPlayerId = Object.keys(state.activePlayers)[0] || null;
    });

    builder.addCase(playerFlowStartAction, (state, action) => {
      const {
        payload: { flow, playerID },
      } = action;

      if (!state.activePlayers[playerID]) {
        state.activePlayers[playerID] = {
          flowInfo: { currentFlow: flow },
          timelineEvents: [],
          dataState: {},
          consoleState: { history: [] },
        };
        state.selectedPlayerId = playerID;
        return;
      }

      state.activePlayers[playerID].flowInfo = {
        ...state.activePlayers[playerID].flowInfo,
        currentFlow: flow,
      };
    });

    builder.addCase(playerTimelineAction, (state, action) => {
      const {
        payload: { playerID },
      } = action;

      if (!state.activePlayers[playerID]) {
        state.activePlayers[playerID] = {
          timelineEvents: [action.payload],
          dataState: {},
          consoleState: { history: [] },
        };
        state.selectedPlayerId = playerID;
        return;
      }

      state.activePlayers[playerID].timelineEvents.push(action.payload);
    });

    builder.addCase(playerViewUpdateAction, (state, action) => {
      const {
        payload: { playerID, update },
      } = action;

      if (!state.activePlayers[playerID]) {
        state.activePlayers[playerID] = {
          view: update,
          timelineEvents: [],
          dataState: {},
          consoleState: { history: [] },
        };
        state.selectedPlayerId = playerID;
        return;
      }

      state.activePlayers[playerID].view = update;
    });

    builder.addCase(clearSelectedDataDetails, (state) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId || !activePlayers[selectedPlayerId]) {
        return;
      }

      activePlayers[selectedPlayerId].dataState.selectedBinding = undefined;
    });

    builder.addCase(consoleClearAction, (state) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) {
        return;
      }

      activePlayers[selectedPlayerId].consoleState = {
        history: [],
      };
    });
    builder.addCase(clearStore, () => {
      return initialState;
    });
    builder.addCase(logsClearAction, (state) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) {
        return;
      }

      activePlayers[selectedPlayerId].timelineEvents = [];
    });
    playerReducerCallback?.(builder);
  });
};

/**
 * This function returns the players store. Accepts optional middleware and callback to enhance the store.
 * @param middleware : Middleware to be added to the store. Optional.
 * @param playerReducerCallback A callback that receives builder object to add cases upon. Optional.
 * @param additionalReducers Additional reducers to be added to the store. Optional
 * @returns
 */
export const createStore = (
  middleware?: Middleware<any, StoreState, Dispatch<AnyAction>>,
  playerReducerCallback?: (
    mapBuilder: ActionReducerMapBuilder<PlayersState>
  ) => void,
  additionalReducers?: any
): EnhancedStore<
  StoreState,
  any,
  Middleware<any, StoreState, Dispatch<AnyAction>>[]
> => {
  return configureStore<
    StoreState,
    any,
    Middleware<any, StoreState, Dispatch<AnyAction>>[]
  >({
    reducer: {
      players: playersReducer(playerReducerCallback),
      ...additionalReducers,
    },
    middleware: (
      getDefaultMiddleware: () => MiddlewareArray<
        Middleware<any, StoreState, Dispatch<AnyAction>>[]
      >
    ) =>
      middleware
        ? getDefaultMiddleware().prepend(middleware)
        : getDefaultMiddleware(),
  });
};
