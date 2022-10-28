/* eslint-disable no-param-reassign */
import { ActionReducerMapBuilder } from '@reduxjs/toolkit';
import { PlayersState } from '@player-tools/devtools-common';
import { AsyncRPCActions } from './actions';

/**
 * Callback function that adds cases for async actions for the player.
 * @param playerReducerCallback
 * @returns
 */
export const buildPlayerReducerCallback =
  (actions: AsyncRPCActions) =>
  (builder: ActionReducerMapBuilder<PlayersState>) => {
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
