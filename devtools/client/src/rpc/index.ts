import {
  type RPCRequestMessageEvent,
  type RPCRequestHandler,
  createRPCRequest,
  Actions,
  PANEL_SOURCE,
} from '@player-tools/devtools-common';

export type RuntimeRPCRequestHandlers = {
  [key in Actions.RuntimeRPCTypes]: RPCRequestHandler<any>;
};

/** Builder for consistently handling RPC requests and responses */
export const buildRPCRequests = (
  onRequestMessage: (
    message: RPCRequestMessageEvent<Actions.RuntimeRPC>
  ) => void
): RuntimeRPCRequestHandlers =>
  Actions.RuntimeRPCTypes.reduce((acc, rpcType) => {
    acc[rpcType] = createRPCRequest(rpcType, PANEL_SOURCE, onRequestMessage);
    return acc;
  }, {} as RuntimeRPCRequestHandlers);
