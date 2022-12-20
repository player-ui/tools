import { Events } from './events';
import { Methods } from './methods';

export interface BaseEventMessage<
  T extends Events.EventTypes | 'rpc-request' | 'rpc-response'
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

export interface BaseMessageWithPlayerID<T extends Events.EventTypes>
  extends BaseEventMessage<T> {
  /**
   * Unique Player Id associated with the message.
   */
  playerID: string;
}

export interface MethodRequestMessageEvent<T extends Methods.BaseMethod<any>>
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

export interface MethodResponseMessageEvent<T extends Methods.BaseMethod<any>>
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

// TODO: This should include methods
export type Message =
  | MethodRequestMessageEvent<any>
  | MethodResponseMessageEvent<any>
  | Events.Event;

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

export type DiscriminateByType<Types, T extends string> = Extract<
  Types,
  { type: T }
>;

/** Higher order utility for determining what types things are */
export const isKnownType = <Types, T extends string>(types: readonly T[]) => 
  <Provided extends T>(value: any, type?: Provided): value is DiscriminateByType<Types, Provided> =>
    typeof value === 'object' &&
    types.includes(value.type) &&
    (!type || value.type === type);
