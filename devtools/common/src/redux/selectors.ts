import { createSelector } from '@reduxjs/toolkit';
import type { StoreState, PlayersState } from '../types/state';

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

export const selectPlayerVersion: any = createSelector(
  selectPlayers,
  (players: PlayersState) => players.version
);

export const selectPlayerIds: any = createSelector(
  selectActivePlayers,
  (activePlayers) => Object.keys(activePlayers) || []
);

/**
 * Selects the selected/currently active player Id.
 */
export const selectSelectedPlayerId: any = createSelector(
  selectPlayers,
  (players: PlayersState) => players.selectedPlayerId
);

export const selectCurrentPlayer: any = createSelector(
  selectActivePlayers,
  selectSelectedPlayerId,
  (activePlayers, selectedPlayerId) => {
    if (!selectedPlayerId) {
      return null;
    }

    return activePlayers[selectedPlayerId];
  }
);

export const selectConfig: any = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    return currentPlayer?.configState ?? null;
  }
);

const selectData: any = createSelector(selectCurrentPlayer, (currentPlayer) => {
  return currentPlayer?.dataState;
});

export const selectFlowInfo: any = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return null;
    }

    return currentPlayer?.flowInfo;
  }
);

export const selectCurrentFlow: any = createSelector(
  selectFlowInfo,
  (flowInfo) => {
    return flowInfo?.currentFlow;
  }
);

export const selectCurrentTopic: any = createSelector(
  selectCurrentFlow,
  (currentFlow) => {
    return currentFlow?.topic;
  }
);

export const selectEvents: any = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return [];
    }

    return currentPlayer?.timelineEvents;
  }
);

export const selectView: any = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return null;
    }

    return currentPlayer?.view;
  }
);

export const selectAllBindings: any = createSelector(selectData, (data) => {
  return data?.allBindings;
});

export const selectSelectedBinding: any = createSelector(selectData, (data) => {
  return data?.selectedBinding;
});

export const selectConsole: any = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    if (!currentPlayer) {
      return { history: [] };
    }

    return currentPlayer.consoleState;
  }
);

export const selectProfiler: any = createSelector(
  selectCurrentPlayer,
  (currentPlayer) => {
    return currentPlayer?.profilerInfo;
  }
);
