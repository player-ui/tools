import { Events } from './events';
import { Actions } from './actions';

export interface BaseEventMessage<
  T extends Events.RuntimeEventTypes | 'rpc-request' | 'rpc-response'
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

export interface BaseRPCType<T extends Actions.RuntimeRPCTypes> {
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

export interface BaseMessageWithPlayerID<T extends Events.RuntimeEventTypes>
  extends BaseEventMessage<T> {
  /**
   * Unique Player Id associated with the message.
   */
  playerID: string;
}

export interface RPCRequestMessageEvent<T extends BaseRPCType<any>>
  extends BaseEventMessage<'rpc-request'> {
  /**
   * Unique Player Id associated with the RPC Request message.
   */
  id: string;
  /**
   * RPC type associated with the RPC Request message.
   */
  rpcType: T['type'];
  /**
   * Parameters associated with the RPC Request message.
   */
  params: T['params'];
}

export interface RPCResponseMessageEvent<T extends BaseRPCType<any>>
  extends BaseEventMessage<'rpc-response'> {
  /**
   * Unique Id associated with the RPC Response message.
   */
  id: string;
  /**
   *  RPC type associated with the RPC Response message.
   */
  rpcType: T['type'];
  /**
   *  Result associated with the RPC Response message.
   */
  result: T['result'];
  /**
   *  Parameters associated with the RPC Response message.
   */
  params: T['params'];
}

// TODO: Convert to RPC
export type Message =
  | RPCRequestMessageEvent<any>
  | RPCResponseMessageEvent<any>
  | Events.RuntimeEvent;

  

// TODO: export via plugins
export type ProfilerNode = {
  /**
   * hook name
   */
  name: string;
  /**
   * startTime of the hook
   */
  startTime?: number;
  /**
   * endTime of the hook
   */
  endTime?: number;
  /**
   * duration of hook resolution times
   * unit: ms
   */
  value?: number;
  /**
   * tooltip to be shown on hover
   */
  tooltip?: string;
  /**
   * subhook profiler nodes
   */
  children: ProfilerNode[];
};

