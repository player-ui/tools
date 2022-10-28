import { RPCFunctionCallback } from '../rpc';
import { Runtime } from '../types';

export type RuntimeEventWithoutSource =
  | Omit<Runtime.PlayerDataChangeEvent, 'source'>
  | Omit<Runtime.PlayerLogEvent, 'source'>
  | Omit<Runtime.PlayerInitEvent, 'source'>
  | Omit<Runtime.PlayerViewUpdateEvent, 'source'>
  | Omit<Runtime.RuntimeInitEvent, 'source'>
  | Omit<Runtime.PlayerFlowStartEvent, 'source'>
  | Omit<Runtime.PlayerRemovedEvent, 'source'>;

export type RuntimeEventPublisher = (
  message: RuntimeEventWithoutSource
) => void;

export type ConfigRequestHandler = 
  RPCFunctionCallback<Runtime.PlayerConfigRPC>;
export type DataBindingRequestHandler =
  RPCFunctionCallback<Runtime.PlayerDataBindingRPC>;
export type RuntimeInfoRequestHandler =
  RPCFunctionCallback<Runtime.PlayerRuntimeInfoRPC>;
export type ViewInfoRequestHandler =
  RPCFunctionCallback<Runtime.PlayerViewDetailsRPC>;
export type ExpressionEvalHandler =
  RPCFunctionCallback<Runtime.PlayerExpressionRPC>;
export type StartProfilerRequestHandler =
  RPCFunctionCallback<Runtime.PlayerStartProfilerRPC>;
export type StopProfilerRequestHandler =
  RPCFunctionCallback<Runtime.PlayerStopProfilerRPC>;

export interface PlayerRuntimeRPCCallbacks {
  /**
   * Config Callback
   */
  config: ConfigRequestHandler;
  /**
   * Data Binding Callback
   */
  dataBinding: DataBindingRequestHandler;
  /**
   * Info Callback
   */
  info: RuntimeInfoRequestHandler;
  /**
   * View Callback
   */
  view: ViewInfoRequestHandler;
  /**
   * Evaluate Callback
   */
  evaluate: ExpressionEvalHandler;
  /**
   * Start Profiler Request Callback
   */
  startProfiler: StartProfilerRequestHandler;
  /**
   * End Profiler Request Callback
   */
  stopProfiler: StopProfilerRequestHandler;
}
