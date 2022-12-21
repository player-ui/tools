import { Binding, Flow, Schema, View } from '@player-ui/types';
import { ProfilerNode } from './types';
import { DiscriminateByType, DiscriminatedType, isKnownType } from './utils';

// Bidirectional methods originating from the devtools client
export namespace Methods {
  interface BaseMethod<T extends Methods.MethodTypes> extends DiscriminatedType<T> {
    // TODO: I don't think I need a source -- esp for methods? unless i use that to determine if the event has been responded to or not?
    /**
     * Source of the method type
     */
    source: string;
    /**
     * Parameters associated with the method request.
     */
    params?: unknown;
    /**
     * Result of the method response.
     */
    result?: unknown;
  }

  export interface PlayerConfigMethod extends BaseMethod<'player-config-request'> {
    /**
     * Parameters associated with the Runtime Info method request.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the method response.
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

  export interface PlayerDataBindingMethod extends BaseMethod<'player-data-binding-details'> {
    /**
     * Parameters associated with the Data Binding method request.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
      /**
       * Binding associated with the Data binding method request.
       */
      binding: Binding;
    };
    /**
     * Result of the method response.
     */
    result?: {
      /**
       * Binding associated with the Data binding method response.
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

  export interface PlayerViewDetailsMethod extends BaseMethod<'player-view-details-request'> {
    /**
     * Parameters associated with the View Details method request.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the method response.
     */
    result?: {
      /**
       * Last update of the view.
       */
      lastViewUpdate?: View;
    };
  }

  export interface PlayerRuntimeInfoMethod extends BaseMethod<'player-runtime-info-request'> {
    /**
     * Parameters associated with the Runtime Info method request.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the method response.
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

  export interface PlayerExpressionMethod extends BaseMethod<'player-execute-expression'> {
    /**
     * Parameters associated with the Expression method request.
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
     * Result of the method response.
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

  export interface PlayerStartProfilerMethod extends BaseMethod<'player-start-profiler-request'> {
    /**
     * Parameters associated with the Profiler Details method request.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the method response.
     */
    result?: {
      /**
       * initial rootnode of the profiler node tree
       */
      data: ProfilerNode;
    };
  }

  export interface PlayerStopProfilerMethod extends BaseMethod<'player-stop-profiler-request'> {
    /**
     * Parameters associated with the Profiler Details method request.
     */
    params: {
      /**
       * Unique Player Id associated with the message.
       */
      playerID: string;
    };
    /**
     * Result of the method response.
     */
    result?: {
      /**
       * final rootnode of the profiler node tree
       */
      data: ProfilerNode;
    };
  }

  export type Method =
    | PlayerConfigMethod
    | PlayerDataBindingMethod
    | PlayerViewDetailsMethod
    | PlayerRuntimeInfoMethod
    | PlayerExpressionMethod
    | PlayerStartProfilerMethod
    | PlayerStopProfilerMethod;

  // TODO: Generate this from `Method['type']` if I ever can
  export const MethodTypes = [
    'player-config-request',
    'player-data-binding-details',
    'player-view-details-request',
    'player-runtime-info-request',
    'player-execute-expression',
    'player-start-profiler-request',
    'player-stop-profiler-request',
  ] as const;

  export type MethodTypes = typeof MethodTypes[number];

  export type ByType<T extends MethodTypes> = DiscriminateByType<Method, T>;

  export const isMethod = isKnownType<Method, MethodTypes>(MethodTypes);
}
