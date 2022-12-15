import type { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import type { PlayersState } from './state';
import { AsyncRPCActions, eventActions } from './actions';
import { Events } from '@player-tools/devtools-common';

/**
 * Callback function that adds cases for async actions for the player.
 * @param playerReducerCallback
 * @returns
 */
export const buildPlayerReducerCallback =
  (actions: AsyncRPCActions) =>
  (builder: ActionReducerMapBuilder<PlayersState>) => {
    builder.addCase(
      eventActions['player-init'], (state, action) => {
        const { payload: { version, playerID }} = action;
        state.activePlayers[playerID] = {
          timelineEvents: [],
          dataState: {},
          consoleState: { history: [] },
        }
        state.version = version;
      }
    )

    builder.addCase(eventActions['player-removed'], (state, action) => {
      delete state.activePlayers[action.payload.playerID];
    });

    builder.addCase(eventActions['player'], (state, action) => {
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




    builder.addCase(
      actions['player-runtime-info-request'].fulfilled,
      (state, action) => {
        const { activePlayers, selectedPlayerId } = state;

        if (!selectedPlayerId) {
          return;
        }

        const data =
          action.payload && Object.keys(action.payload).length > 0
            ? action.payload
            : null;
        activePlayers[selectedPlayerId].flowInfo = data;
      }
    );

    builder.addCase(
      actions['player-config-request'].fulfilled,
      (state, action) => {
        const { activePlayers, selectedPlayerId } = state;

        if (!selectedPlayerId) {
          return;
        }

        activePlayers[selectedPlayerId].configState = action.payload;
      }
    );

    builder.addCase(
      actions['player-view-details-request'].fulfilled,
      (state, action) => {
        const { activePlayers, selectedPlayerId } = state;

        if (!selectedPlayerId) {
          return;
        }

        activePlayers[selectedPlayerId].view = action.payload?.lastViewUpdate;
      }
    );

    builder.addCase(
      actions['player-data-binding-details'].fulfilled,
      (state, action) => {
        const {
          meta: {
            arg: { binding, playerID },
          },
          payload,
        } = action;
        const { activePlayers } = state;

        if (!playerID || !activePlayers[playerID]) {
          return;
        }

        if (binding === '') {
          activePlayers[playerID].dataState.allBindings = payload;
          return;
        }

        activePlayers[playerID].dataState.selectedBinding = payload;
      }
    );

    builder.addCase(
      actions['player-execute-expression'].fulfilled,
      (state, action) => {
        const { activePlayers, selectedPlayerId } = state;

        if (!selectedPlayerId) {
          return;
        }

        activePlayers[selectedPlayerId].consoleState?.history?.push({
          id: action.meta.requestId,
          result: action.payload,
          expression: action.payload?.exp ?? '',
        });
      }
    );

    builder.addCase(
      actions['player-start-profiler-request'].fulfilled,
      (state, action) => {
        const { activePlayers, selectedPlayerId } = state;

        if (!selectedPlayerId) return;

        activePlayers[selectedPlayerId].profilerInfo = action.payload?.data;
      }
    );

    builder.addCase(
      actions['player-stop-profiler-request'].fulfilled,
      (state, action) => {
        const { activePlayers, selectedPlayerId } = state;

        if (!selectedPlayerId) return;

        activePlayers[selectedPlayerId].profilerInfo = action.payload?.data;
      }
    );
  };
