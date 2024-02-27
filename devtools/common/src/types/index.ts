import type { Severity } from "@player-ui/player";
import type { Binding, Flow, Schema, View } from "@player-ui/types";
import type { RUNTIME_SOURCE } from "../constants";
import type { ProfilerNode } from "./state";

export interface BaseEventMessage<
  T extends Runtime.RuntimeEventTypes | "rpc-request" | "rpc-response"
> {
  /**
   * Source of the Message
   */
  source: string;
  /**
   * Unique type associated with the message.
   */
  type: T;
}

export interface BaseRPCType<T extends Runtime.RuntimeRPCTypes> {
  /**
   * Source of the RPC type
   */
  source: string;
  /**
   * Unique type associated with the RPC type.
   */
  type: T;
  /**
   * Parameters associated with the RPC type.
   */
  params?: unknown;
  /**
   * Result of the RPC call.
   */
  result?: unknown;
}

export interface BaseMessageWithPlayerID<T extends Runtime.RuntimeEventTypes>
  extends BaseEventMessage<T> {
  /**
   * Unique Player Id associated with the message.
   */
  playerID: string;
}

export interface RPCRequestMessageEvent<T extends BaseRPCType<any>>
  extends BaseEventMessage<"rpc-request"> {
  /**
   * Unique Player Id associated with the RPC Request message.
   */
  id: string;
  /**
   * RPC type associated with the RPC Request message.
   */
  rpcType: T["type"];
  /**
   * Parameters associated with the RPC Request message.
   */
  params: T["params"];
}

export interface RPCResponseMessageEvent<T extends BaseRPCType<any>>
  extends BaseEventMessage<"rpc-response"> {
  /**
   * Unique Id associated with the RPC Response message.
   */
  id: string;
  /**
   *  RPC type associated with the RPC Response message.
   */
  rpcType: T["type"];
  /**
   *  Result associated with the RPC Response message.
   */
  result: T["result"];
  /**
   *  Parameters associated with the RPC Response message.
   */
  params: T["params"];
}
export namespace Runtime {
  interface PlayerTimelineEvent<T extends Runtime.RuntimeEventTypes>
    extends BaseMessageWithPlayerID<T> {
    /**
     * The time in milliseconds when the event was received.
     */
    timestamp: number;
  }

  export interface RuntimeInitEvent extends BaseEventMessage<"runtime-init"> {
    /**
     * Source of the event.
     */
    source: typeof RUNTIME_SOURCE;
  }

  export interface PlayerInitEvent
    extends BaseMessageWithPlayerID<"player-init"> {
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
    extends BaseMessageWithPlayerID<"player-removed"> {
    /**
     * Source of the event.
     */
    source: string;
  }

  export interface PlayerLogEvent
    extends PlayerTimelineEvent<"player-log-event"> {
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
    extends PlayerTimelineEvent<"player-data-change-event"> {
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
    extends PlayerTimelineEvent<"player-view-update-event"> {
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
    extends PlayerTimelineEvent<"player-flow-transition-event"> {
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
    extends PlayerTimelineEvent<"player-flow-start"> {
    /**
     * Flow information that has been started.
     */
    flow: Flow;
  }

  export interface PlayerFlowEndEvent
    extends PlayerTimelineEvent<"player-flow-end"> {
    /**
     * Flow information that has been ended.
     */
    id: string;
  }

  export interface PlayerConfigRPC
    extends BaseRPCType<"player-config-request"> {
    /**
     * Parameters associated with the Runtime Info RPC.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the RPC call.
     */
    result?: {
      /**
       * currently registered plugins
       */
      plugins?: string[];
      /**
       * data types and validations
       */
      schema?: any;
      /**
       * unary, binary, operators
       */
      expressions?: any;
    };
  }

  export interface PlayerDataBindingRPC
    extends BaseRPCType<"player-data-binding-details"> {
    /**
     * Parameters associated with the Data Binding RPC.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
      /**
       * Binding associated with the Data binding RPC.
       */
      binding: Binding;
    };
    /**
     * Result of the RPC call.
     */
    result?: {
      /**
       * Binding associated with the Data binding RPC result.
       */
      binding: Binding;
      /**
       * Value associated with the binding
       */
      value: {
        /**
         * The current (user) value of the binding.
         * It may or may not be valid
         * */
        currentValue?: any;

        /**
         * The formatted version of the currentValue.
         * This will be the same if there's no formatted for the data-type
         */
        formattedValue?: any;

        /**
         * The value of the binding stored in the model.
         * This will be the last known good value for the binding
         */
        modelValue?: any;
      };
      /**
       * Data binding type
       */
      type?: Schema.DataType;
      /**
       * Validation associated with the data binding
       */
      validation?: any;
    };
  }

  export interface PlayerViewDetailsRPC
    extends BaseRPCType<"player-view-details-request"> {
    /**
     * Parameters associated with the View Details RPC.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the RPC call.
     */
    result?: {
      /**
       * Last update of the view.
       */
      lastViewUpdate?: View;
    };
  }

  export interface PlayerRuntimeInfoRPC
    extends BaseRPCType<"player-runtime-info-request"> {
    /**
     * Parameters associated with the Runtime Info RPC.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the RPC call.
     */
    result?: {
      /**
       * The unique ID associated with the current flow.
       */
      currentFlowID?: string;
      /**
       * The state of the current flow.
       */
      currentFlowState?: string;
      /**
       * The unique ID associated with the current view.
       */
      currentViewID?: string;
      /**
       * The flow information associated with the current flow.
       */
      currentFlow?: Flow;
    };
  }

  export interface PlayerExpressionRPC
    extends BaseRPCType<"player-execute-expression"> {
    /**
     * Parameters associated with the Expression RPC.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
      /**
       * Expression to be evaluated.
       */
      expression: string;
    };
    /**
     * Result of the RPC call.
     */
    result?:
      | {
          /**
           * Error Status of the evaluation
           */
          status: "error";
          /**
           * Message associated with the evaluation.
           */
          message: string;
          /**
           * Expression associated with this evaluation.
           */
          exp: string;
        }
      | {
          /**
           * Sucess Status of the evaluation
           */
          status: "success";
          /**
           * Data associated with the evaluation
           */
          data: any;
          /**
           * Expression associated with this evaluation.
           */
          exp: string;
        };
  }

  export interface PlayerStartProfilerRPC
    extends BaseRPCType<"player-start-profiler-request"> {
    /**
     * Parameters associated with the Profiler Details RPC.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the RPC call.
     */
    result?: {
      /**
       * initial rootnode of the profiler node tree
       */
      data: ProfilerNode;
    };
  }

  export interface PlayerStopProfilerRPC
    extends BaseRPCType<"player-stop-profiler-request"> {
    /**
     * Parameters associated with the Profiler Details RPC.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the RPC call.
     */
    result?: {
      /**
       * final rootnode of the profiler node tree
       */
      data: ProfilerNode;
    };
  }

  export type RuntimeEvent =
    | PlayerInitEvent
    | PlayerRemovedEvent
    | PlayerDataChangeEvent
    | PlayerLogEvent
    | PlayerViewUpdateEvent
    | PlayerFlowStartEvent
    | RuntimeInitEvent;

  export const RuntimeEventTypes = [
    "runtime-init",
    "player-init",
    "player-removed",
    "player-log-event",
    "player-data-change-event",
    "player-view-update-event",
    "player-flow-transition-event",
    "player-flow-start",
    "player-flow-end",
  ] as const;

  export type RuntimeEventTypes = (typeof RuntimeEventTypes)[number];

  export type RuntimeRPC =
    | PlayerConfigRPC
    | PlayerDataBindingRPC
    | PlayerViewDetailsRPC
    | PlayerRuntimeInfoRPC
    | PlayerExpressionRPC
    | PlayerStartProfilerRPC
    | PlayerStopProfilerRPC;

  // TODO: Generate this from `RuntimeRPC["type"]` if I ever can
  export const RuntimeRPCTypes = [
    "player-config-request",
    "player-data-binding-details",
    "player-view-details-request",
    "player-runtime-info-request",
    "player-execute-expression",
    "player-start-profiler-request",
    "player-stop-profiler-request",
  ] as const;

  export type RuntimeRPCTypes = (typeof RuntimeRPCTypes)[number];
}

// TODO: Convert to RPC
export type Message =
  | RPCRequestMessageEvent<any>
  | RPCResponseMessageEvent<any>
  | Runtime.RuntimeEvent;
