import { Events } from '@player-tools/devtools-common';
import { ActionCreatorWithPayload, createAction } from '@reduxjs/toolkit';
import { AnyAction } from 'redux';

/** Redux actions associated against all possible event types */
type EventActions = {
  [key in Events.EventTypes]: ActionCreatorWithPayload<Events.ByType<key>, key>;
};

/** Redux actions associated against all defined event types */
export const Actions: EventActions = Object.fromEntries(
  Events.EventTypes.map((event) => [
    event,
    createAction<Events.ByType<typeof event>>(event),
  ])
) as EventActions;
