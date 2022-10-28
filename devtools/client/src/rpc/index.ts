import {
  createRPCRequest,
  PANEL_SOURCE,
  Runtime as PlayerRuntime,
  RPCRequestMessageEvent,
  RPCRequestHandler,
  Runtime,
} from '@player-tools/devtools-common';

export type RuntimeRPCRequestHandlers = {
  [key in Runtime.RuntimeRPCTypes]: RPCRequestHandler<any>;
};

export const buildRPCRequests = (
  onRequestMessage: (
    message: RPCRequestMessageEvent<PlayerRuntime.RuntimeRPC>
  ) => void
): RuntimeRPCRequestHandlers =>
  Runtime.RuntimeRPCTypes.reduce(
    (acc, rpcType) => (
      (acc[rpcType] = createRPCRequest(
        rpcType,
        PANEL_SOURCE,
        onRequestMessage
      )),
      acc
    ),
    {} as RuntimeRPCRequestHandlers
  );
