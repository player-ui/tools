import React from "react";
import { PluginClient, usePlugin } from "flipper-plugin";
import {
  createStore,
  Runtime,
  RPCRequestMessageEvent,
  RPCResponseMessageEvent,
} from "@player-tools/devtools-common";
import {
  handleMessage,
  buildAliases,
  buildPlayerReducerCallback,
  buildRPCActions,
  buildRPCRequests,
  RuntimeRPCRequestHandlers,
} from "@player-tools/devtools-client";
import { App } from "@player-tools/devtools-ui";

type Events = {
  [key in Runtime.RuntimeEventTypes]: Extract<
    Runtime.RuntimeEvent,
    { type: key }
  >;
} & {
  "rpc-response": RPCResponseMessageEvent<Runtime.RuntimeRPC>;
};

type Methods = {
  [key in Runtime.RuntimeRPCTypes]: (
    payload: RPCRequestMessageEvent<Runtime.RuntimeRPC>
  ) => Promise<void>;
};

export function plugin(client: PluginClient<Events, Methods>): {
  store: ReturnType<typeof createStore>;
} {
  const rpcHandlers: RuntimeRPCRequestHandlers = buildRPCRequests(
    (message: RPCRequestMessageEvent<Runtime.RuntimeRPC>) => {
      // TODO: Do `send('rpc-request', message)`
      client.send(message.rpcType, message);
    }
  );
  const actions = buildRPCActions(rpcHandlers);
  const store = createStore(
    buildAliases(actions),
    buildPlayerReducerCallback(actions)
  );

  Runtime.RuntimeEventTypes.forEach((event) => {
    client.onMessage(event, (message) => {
      handleMessage(store, message);
    });
  });

  client.onMessage("rpc-response", (params) => {
    rpcHandlers[params.rpcType].onMessage(params);
  });

  return { store };
}

export const Component = () => {
  const { store } = usePlugin(plugin);
  return <App store={store} />;
};
