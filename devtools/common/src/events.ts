import { Severity } from "@player-ui/logger";
import { Binding, Flow, View } from "@player-ui/types";
import { BaseEventMessage, BaseMessageWithPlayerID } from ".";
import { RUNTIME_SOURCE } from "./logger";

// Unidirectional events originating from the Player
export namespace Events {
  interface PlayerTimelineEvent<T extends Events.RuntimeEventTypes>
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

  export type RuntimeEvent =
    | PlayerInitEvent
    | PlayerRemovedEvent
    | PlayerDataChangeEvent
    | PlayerLogEvent
    | PlayerViewUpdateEvent
    | PlayerFlowStartEvent
    | PlayerFlowTransitionEvent
    | PlayerFlowEndEvent
    | RuntimeInitEvent;

  export const RuntimeEventTypes = [
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

  // export const RuntimeEventTypes2 = [
  //   key in RuntimeEventTypes["type"]
  // ]

  export type RuntimeEventTypes = typeof RuntimeEventTypes[number];
}
