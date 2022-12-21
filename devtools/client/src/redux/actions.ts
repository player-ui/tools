import { type AsyncThunk, createAsyncThunk, AnyAction } from '@reduxjs/toolkit';
import {
  createAction,
  ActionCreatorWithPayload,
} from '@reduxjs/toolkit';
import {
  createLogger,
  BACKGROUND_SOURCE,
  // TODO: This is where being able to import the `Runtime` namespace is beneficial
  Methods as RuntimeMethods,
  Events as RuntimeEvents,
} from '@player-tools/devtools-common';

const logger = createLogger(BACKGROUND_SOURCE);

export namespace Methods {

  /** Type describing an object containing async thunks for each Method defined */
  export type MethodThunks = {
    [key in RuntimeMethods.Method["type"]]: AsyncThunk<
      RuntimeMethods.ByType<key>['result'],
      RuntimeMethods.ByType<key>,
      any
    >;
  };

  export type MethodHandler = <T extends RuntimeMethods.MethodTypes>(
    method: RuntimeMethods.ByType<T>
  ) => Promise<RuntimeMethods.ByType<T>['result']>;

  export const buildAsyncThunks = (
    onMethodRequest: MethodHandler
  ): MethodThunks => Object.fromEntries(
    RuntimeMethods.MethodTypes.map(method => 
      [method, createAsyncThunk<
        RuntimeMethods.ByType<typeof method>['result'],
        RuntimeMethods.ByType<typeof method>
      >(method, async (method) => {
        logger.log(`Requesting ${method.type}`, method.params);
        const data = (await onMethodRequest(method)) as 
          RuntimeMethods.ByType<typeof method.type>['result'];
        logger.log(`Response from ${method.type}`, data);
        return data;
      })]
    )
  ) as MethodThunks
}

// TODO: What the hell should we do here? merged namespace for Events or new namespace?
export namespace Events {

  /** Redux actions associated against all possible event types */
  type EventActions = {
    [key in RuntimeEvents.EventTypes]: ActionCreatorWithPayload<
      RuntimeEvents.ByType<key>,
      key
    >;
  };

  export interface EventAction<T extends RuntimeEvents.EventTypes = RuntimeEvents.EventTypes> extends AnyAction {
    payload: RuntimeEvents.ByType<T>;
  }

  /** Redux actions associated against all defined event types */
  export const actions: EventActions = Object.fromEntries(
    RuntimeEvents.EventTypes.map(event => 
      [event, createAction<RuntimeEvents.ByType<typeof event>>(event)]
    )
  ) as EventActions
}

/** Explicit actions that don't correspond to a specific event or method */
export const Actions = {
  // Explicit actions TODO: Is this level of redundancy okay?
  'selected-player': createAction<string | undefined>('selected-player'),
  'player-timeline-event': createAction<RuntimeEvents.TimelineEvents>('player-timeline-event'),

  // Reset actions
  'clear-selected-data-details': createAction('clear-selected-data-details'),
  'clear-console': createAction('clear-console'),
  'clear-logs': createAction('clear-logs'),
  'clear-store': createAction('clear-store'),
};
