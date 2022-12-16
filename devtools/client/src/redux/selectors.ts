import { createSelector } from '@reduxjs/toolkit';
import type { StoreState, PlayersState } from './state';

/**
 * Selects the player state
 * @param state
 * @returns
 */
const selectPlayers = (state: StoreState) => {
  return state.players;
};

/**
 * Selects all the active players.
 */
const selectActivePlayers = createSelector(
  selectPlayers,
  (players: PlayersState) => players.activePlayers
);

export const selectPlayerVersion = createSelector(
  selectPlayers,
  (players: PlayersState) => players.version
);

export const selectPlayerIds = createSelector(
  selectActivePlayers,
  (activePlayers) => Object.keys(activePlayers) || []
);

/**
 * Selects the selected/currently active player Id.
 */
export const selectSelectedPlayerId = createSelector(
  selectPlayers,
  (players: PlayersState) => players.selectedPlayerId
);

export const selectCurrentPlayer = createSelector(
  selectActivePlayers,
  selectSelectedPlayerId,
  (activePlayers, selectedPlayerId) => {
    if (!selectedPlayerId) {
      return null;
    }

    return activePlayers[selectedPlayerId];
  }
);

export const selectConfig = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    return currentPlayer?.configState ?? null;
  }
);

const selectData = createSelector(selectCurrentPlayer, (currentPlayer) => {
  return currentPlayer?.dataState;
});

export const selectFlowInfo = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return null;
    }

    return currentPlayer?.flowInfo;
  }
);

export const selectCurrentFlow = createSelector(
  selectFlowInfo,
  (flowInfo) => {
    return flowInfo?.currentFlow;
  }
);

export const selectCurrentTopic = createSelector(
  selectCurrentFlow,
  (currentFlow) => {
    return currentFlow?.topic;
  }
);

export const selectEvents = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return [];
    }

    return currentPlayer?.timelineEvents;
  }
);

export const selectView = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return null;
    }

    return currentPlayer?.view;
  }
);

export const selectAllBindings = createSelector(selectData, (data) => {
  return data?.allBindings;
});

export const selectSelectedBinding = createSelector(selectData, (data) => {
  return data?.selectedBinding;
});

export const selectConsole = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return { history: [] };
    }

    return currentPlayer.consoleState;
  }
);

export const selectProfiler = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    return currentPlayer?.profilerInfo;
  }
);
