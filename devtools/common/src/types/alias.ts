import { Runtime } from './index';

interface Action {
  /**
   * Type associated with the action
   */
  type: string;
}

export interface AliasAction extends Action {
  /**
   * RuntimeRPC Payload associated with the Alias Action.
   */
  payload: Runtime.RuntimeRPC['params'];
}

export interface ConfigAction extends Action {
  /**
   * PlayerConfigRPC Payload associated with the Alias Action
   */
  payload: Runtime.PlayerConfigRPC['params'];
}

export interface DataBindingAction extends Action {
  /**
   * PlayerDataBindingRPC Payload associated with the Alias Action.
   */
  payload: Runtime.PlayerDataBindingRPC['params'];
}

export interface ExpressionAction extends Action {
  /**
   * PlayerExpressionRPC Payload associated with the Alias Action.
   */
  payload: Runtime.PlayerExpressionRPC['params'];
}

export interface StartProfilerAction extends Action {
  /**
   * PlayerStartProfilerRPC associated with the Alias Action
   */
  payload: Runtime.PlayerStartProfilerRPC['params'];
}

export interface StopProfilerAction extends Action {
  /**
   * PlayerStartProfilerRPC associated with the Alias Action
   */
  payload: Runtime.PlayerStopProfilerRPC['params'];
}
