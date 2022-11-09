import {
  type RPCRequestMessageEvent,
  type RPCRequestHandler,
  createRPCRequest,
  Runtime,
  PANEL_SOURCE,
} from '@player-tools/devtools-common';

export type RuntimeRPCRequestHandlers = {
  [key in Runtime.RuntimeRPCTypes]: RPCRequestHandler<any>;
};

/** Builder for consistently handling RPC requests and responses */
export const buildRPCRequests = (
  onRequestMessage: (
    message: RPCRequestMessageEvent<Runtime.RuntimeRPC>
  ) => void
): RuntimeRPCRequestHandlers =>
  Runtime.RuntimeRPCTypes.reduce((acc, rpcType) => {
    acc[rpcType] = createRPCRequest(rpcType, PANEL_SOURCE, onRequestMessage);
    return acc;
  }, {} as RuntimeRPCRequestHandlers);
