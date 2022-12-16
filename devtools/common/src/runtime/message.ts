import type { RPCFunctionCallback } from '../rpc';
import type { Events, Methods } from '..';


// TODO: Not sure about these types staying in common

export type RuntimeEventWithoutSource =
  | Omit<Events.PlayerDataChangeEvent, 'source'>
  | Omit<Events.PlayerLogEvent, 'source'>
  | Omit<Events.PlayerInitEvent, 'source'>
  | Omit<Events.PlayerViewUpdateEvent, 'source'>
  | Omit<Events.RuntimeInitEvent, 'source'>
  | Omit<Events.PlayerFlowStartEvent, 'source'>
  | Omit<Events.PlayerRemovedEvent, 'source'>;

export type RuntimeEventPublisher = (
  message: RuntimeEventWithoutSource
) => void;

export type ConfigRequestHandler = RPCFunctionCallback<Methods.PlayerConfigMethod>;
export type DataBindingRequestHandler =
  RPCFunctionCallback<Methods.PlayerDataBindingMethod>;
export type RuntimeInfoRequestHandler =
  RPCFunctionCallback<Methods.PlayerRuntimeInfoMethod>;
export type ViewInfoRequestHandler =
  RPCFunctionCallback<Methods.PlayerViewDetailsMethod>;
export type ExpressionEvalHandler =
  RPCFunctionCallback<Methods.PlayerExpressionMethod>;
export type StartProfilerRequestHandler =
  RPCFunctionCallback<Methods.PlayerStartProfilerMethod>;
export type StopProfilerRequestHandler =
  RPCFunctionCallback<Methods.PlayerStopProfilerMethod>;

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
