import { createAction } from '@reduxjs/toolkit';
import type { Runtime } from '../types';

// Actions
export const playerInitAction =
  createAction<Runtime.PlayerInitEvent>('player-init');
export const playerRemoveAction = createAction<string>('player-removed');
export const selectedPlayerAction = createAction<string | undefined>(
  'selected-player'
);
export const playerFlowStartAction =
  createAction<Runtime.PlayerFlowStartEvent>('player-flow-start');
export const playerTimelineAction = createAction<
  | Runtime.PlayerDataChangeEvent
  | Runtime.PlayerLogEvent
  | Runtime.PlayerFlowStartEvent
>('player-timeline-event');
export const playerViewUpdateAction =
  createAction<Runtime.PlayerViewUpdateEvent>('player-view-update-event');
export const clearSelectedDataDetails = createAction<void>(
  'clear-selected-data-details'
);
export const consoleClearAction = createAction('console-clear');
export const clearStore = createAction<void>('clear-store');
export const logsClearAction = createAction('logs-clear');
