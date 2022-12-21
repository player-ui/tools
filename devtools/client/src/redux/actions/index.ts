import { createAction } from '@reduxjs/toolkit';
import type { Events } from '@player-tools/devtools-common';

export { Actions as EventActions } from './events';
export * from './methods';

/** Explicit actions that don't correspond to a specific event or method */
export const Actions = {
  // Explicit actions TODO: Is this level of redundancy okay?
  'selected-player': createAction<string | undefined>('selected-player'),
  'player-timeline-event': createAction<Events.TimelineEvents>(
    'player-timeline-event'
  ),

  // Reset actions
  'clear-selected-data-details': createAction('clear-selected-data-details'),
  'clear-console': createAction('clear-console'),
  'clear-logs': createAction('clear-logs'),
  'clear-store': createAction('clear-store'),
};
