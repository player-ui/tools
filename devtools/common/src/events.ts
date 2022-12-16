import type { Severity } from "@player-ui/player";
import type { Binding, Flow, View } from "@player-ui/types";
import { BaseEventMessage, BaseMessageWithPlayerID, DiscriminateByType } from ".";
import { RUNTIME_SOURCE } from "./logger";

// TODO: Maybe reverse the pluralness
// Unidirectional events originating from the Player
export namespace Events {
  export interface PlayerTimelineEvent<T extends Events.EventTypes>
    extends BaseMessageWithPlayerID<T> {
    /**
     * The time in milliseconds when the event was received.
     */
    timestamp: number;
  }

  export interface RuntimeInitEvent extends BaseEventMessage<'runtime-init'> {
    /**
     * Source of the event.
     */
    source: typeof RUNTIME_SOURCE;
  }

  export interface PlayerInitEvent
    extends BaseMessageWithPlayerID<'player-init'> {
    /**
     * Source of the event.
     */
    source: string;
    /**
     * Web player version.
     */
    version: string;
  }

  export interface PlayerRemovedEvent
    extends BaseMessageWithPlayerID<'player-removed'> {
    /**
     * Source of the event.
     */
    source: string;
  }

  export interface PlayerLogEvent
    extends PlayerTimelineEvent<'player-log-event'> {
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

  export interface PlayerDataChangeEvent
    extends PlayerTimelineEvent<'player-data-change-event'> {
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

  export interface PlayerViewUpdateEvent
    extends PlayerTimelineEvent<'player-view-update-event'> {
    /**
     * Source of the event.
     */
    source: typeof RUNTIME_SOURCE;
    /**
     * View update.
     */
    update: View;
  }

  export interface PlayerFlowTransitionEvent
    extends PlayerTimelineEvent<'player-flow-transition-event'> {
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
}
