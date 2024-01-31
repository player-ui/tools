import { v4 as uuid } from "uuid";
import type {
  BaseRPCType,
  Message,
  RPCRequestMessageEvent,
  RPCResponseMessageEvent,
} from "../types";

export type RPCCallFunction<T extends BaseRPCType<any>> = (
  params?: T["params"]
) => Promise<T["result"]>;

export interface RPCRequestHandler<T extends BaseRPCType<any>> {
  /**
   * On call function that is called when a response from the RPC call is received.
   */
  onMessage: (message: Message) => void;
  /**
   * Makes an RPC request/call to the running player instance.
   */
  call: RPCCallFunction<T>;
}

/**
 * Utility function that creates an RPC Request object based on provided parameters.
 * @param type
 * @param source
 * @param sendMessage
 * @returns
 */
// TODO: This might have to be a bit more sophisticated b/c some RPC connections are more structure -- i.e. setting up listeners for specific events
export function createRPCRequest<T extends BaseRPCType<any>>(
  type: T["type"],
  source: string,
  sendMessage: (message: RPCRequestMessageEvent<T>) => void
): RPCRequestHandler<T> {
  const requestsInFlight = new Map<string, (response: T["result"]) => void>();

  /**
   * On call function to be called when a response from the RPC call is received.
   * @param message
   */
  const onMessage = (message: Message) => {
    if (message.type === "rpc-response") {
      const handler = requestsInFlight.get(message.id);
      requestsInFlight.delete(message.id);
      handler?.(message.result);
    }
  };

  /**
   * Makes an RPC request/call to the running web player instance.
   * @param params
   * @returns
   */
  const callRPCMethod: RPCCallFunction<T> = (params: T["params"]) => {
    return new Promise((resolve, reject) => {
      // Construct the message to send
      const id = uuid();

      const message: RPCRequestMessageEvent<T> = {
        id,
        params,
        type: "rpc-request",
        rpcType: type,
        source,
      };

      // Register the UUID for when we get a response
      requestsInFlight.set(id, resolve);
      sendMessage(message);
    });
  };

  return {
    onMessage,
    call: callRPCMethod,
  };
}

export interface RPCResponder {
  /**
   * On call function that is called when a response from the RPC call is received.
   */
  onMessage: (message: Message) => void;
}

/** Construct for proxying generic RPC events to event specific responders */
export interface RPCController extends RPCResponder {
  /** Collection of underlying, event specific responders */
  rpcHandlers: (RPCResponder & { type: string })[];
}

export type RPCFunctionCallback<T extends BaseRPCType<any>> = (
  params: T["params"]
) => T["result"] | Promise<T["result"]>;

/**
 * Utility function that creates an RPC Responder object based on provided parameters.
 * @param type
 * @param source
 * @param sendResponse
 * @param messageHandler
 * @returns
 */
// TODO: This might have to be a bit more sophisticated b/c some RPC connections are more structure -- i.e. setting up listeners for specific events
export function createRPCResponder<T extends BaseRPCType<any>>(
  type: T["type"],
  source: string,
  sendResponse: (
    response: RPCResponseMessageEvent<T>,
    request: RPCRequestMessageEvent<T>
  ) => void,
  messageHandler: RPCFunctionCallback<T>
): RPCResponder & { type: T["type"] } {
  /**
   * On call function to be called when a request from the RPC call is received.
   * @param message
   */
  const onMessage = async (message: Message) => {
    if (message.type === "rpc-request" && message.rpcType === type) {
      const result = await messageHandler(message.params);

      if (result) {
        const response: RPCResponseMessageEvent<T> = {
          type: "rpc-response",
          id: message.id,
          rpcType: type,
          source,
          result,
          params: message.params,
        };
        sendResponse(response, message);
      }
    }
  };

  return {
    onMessage,
    type,
  };
}

export * from "./bridge";
