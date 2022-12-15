import { Binding, Flow, Schema, View } from '@player-ui/types';
import { BaseRPCType, ProfilerNode } from './types';

// TODO: Settle on actions vs RPC nomenclature
// Bidirectional RPCs originating from the devtools client
export namespace Actions {
  export interface PlayerConfigRPC
    extends BaseRPCType<'player-config-request'> {
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
    extends BaseRPCType<'player-data-binding-details'> {
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
    extends BaseRPCType<'player-view-details-request'> {
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
    extends BaseRPCType<'player-runtime-info-request'> {
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
    extends BaseRPCType<'player-execute-expression'> {
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
          status: 'error';
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
          status: 'success';
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
    extends BaseRPCType<'player-start-profiler-request'> {
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
    extends BaseRPCType<'player-stop-profiler-request'> {
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

  export type RuntimeRPC =
    | PlayerConfigRPC
    | PlayerDataBindingRPC
    | PlayerViewDetailsRPC
    | PlayerRuntimeInfoRPC
    | PlayerExpressionRPC
    | PlayerStartProfilerRPC
    | PlayerStopProfilerRPC;

  // TODO: Generate this from `RuntimeRPC['type']` if I ever can
  export const RuntimeRPCTypes = [
    'player-config-request',
    'player-data-binding-details',
    'player-view-details-request',
    'player-runtime-info-request',
    'player-execute-expression',
    'player-start-profiler-request',
    'player-stop-profiler-request',
  ] as const;

  export type RuntimeRPCTypes = typeof RuntimeRPCTypes[number];
}
