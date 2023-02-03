import type { Severity } from "@player-ui/player";
import type { Binding, Flow, View } from "@player-ui/types";
import { DiscriminateByType, DiscriminatedType, isKnownType } from "./utils";
import { RUNTIME_SOURCE } from "./logger";

// TODO: Maybe reverse the pluralness
// Unidirectional events originating from the Player
export namespace Events {
  interface BaseEvent<T extends Events.EventTypes> extends DiscriminatedType<T> {
    /** Source of the method type */
    source: string;
  }

  interface BaseEventWithPlayerID<T extends Events.EventTypes> extends BaseEvent<T> {
    /**
     * Unique Player Id associated with the message.
     */
    playerID: string;
  }

  interface PlayerTimelineEvent<T extends Events.EventTypes> extends BaseEventWithPlayerID<T> {
    /**
     * The time in milliseconds when the event was received.
     */
    timestamp: number;
  }

  export interface RuntimeInitEvent extends BaseEvent<'runtime-init'> {
    /**
     * Source of the event.
     */
    source: typeof RUNTIME_SOURCE;
  }

  export interface PlayerInitEvent extends BaseEventWithPlayerID<'player-init'> {
    /**
     * Source of the event.
     */
    source: string;
    /**
     * Web player version.
     */
    version: string;
  }

  export interface PlayerRemovedEvent extends BaseEventWithPlayerID<'player-removed'> {
    /**
     * Source of the event.
     */
    source: string;
  }

  export interface PlayerLogEvent extends PlayerTimelineEvent<'player-log-event'> {
    /**
     * Source of the event.
     */
    source: string;
    /**
     * Severity of the event
     */
    severity: Severity;
    /**
     * Collection of messages associated with the log event.
     */
    message: Array<any>;
  }

  export interface PlayerDataChangeEvent extends PlayerTimelineEvent<'player-data-change-event'> {
    /**
     * Source of the event.
     */
    source: typeof RUNTIME_SOURCE;
    /**
     * Binding associated with the Data change event.
     */
    binding: Binding;
    /**
     * Old value of the binding.
     */
    oldValue: any;
    /**
     * New value of the binding.
     */
    newValue: any;
  }

  export interface PlayerViewUpdateEvent extends PlayerTimelineEvent<'player-view-update-event'> {
    /**
     * Source of the event.
     */
    source: typeof RUNTIME_SOURCE;
    /**
     * View update.
     */
    update: View;
  }

  export interface PlayerFlowTransitionEvent extends PlayerTimelineEvent<'player-flow-transition-event'> {
    /**
     * The state from which the transition has taken place.
     */
    fromState: string;
    /**
     * The state to which the transition has taken place.
     */
    toState: string;
  }

  export interface PlayerFlowStartEvent
    extends PlayerTimelineEvent<'player-flow-start'> {
    /**
     * Flow information that has been started.
     */
    flow: Flow;
  }

  export interface PlayerFlowEndEvent
    extends PlayerTimelineEvent<'player-flow-end'> {
    /**
     * Flow information that has been ended.
     */
    id: string;
  }

  export type TimelineEvents =
    | PlayerDataChangeEvent
    | PlayerLogEvent
    | PlayerFlowStartEvent
    | PlayerViewUpdateEvent;

  export type Event =
    | TimelineEvents
    | PlayerInitEvent
    | PlayerRemovedEvent
    | PlayerFlowTransitionEvent
    | PlayerFlowEndEvent
    | RuntimeInitEvent;

  export const EventTypes = [
    'runtime-init',
    'player-init',
    'player-removed',
    'player-log-event',
    'player-data-change-event',
    'player-view-update-event',
    'player-flow-transition-event',
    'player-flow-start',
    'player-flow-end',
  ] as const;

  export type EventTypes = typeof EventTypes[number];

  export type ByType<T extends EventTypes> = DiscriminateByType<Event, T>;

  export const isEvent = isKnownType<Event, EventTypes>(EventTypes);
}
