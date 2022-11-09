import React from 'react';
import { PluginClient, usePlugin } from 'flipper-plugin';
import {
  createStore,
  Runtime,
  RPCRequestMessageEvent,
  RPCResponseMessageEvent,
} from '@player-tools/devtools-common';
import {
  handleMessage,
  buildAliases,
  buildPlayerReducerCallback,
  buildRPCActions,
  buildRPCRequests,
  RuntimeRPCRequestHandlers,
} from '@player-tools/devtools-client';
// TODO: Fix import lol -- maybe try to bundle this package _before_ it hits flipper-pkg? i'm so tired of monkeying with this
import { App } from '@player-tools/devtools-ui';

type Events = {
  [key in Runtime.RuntimeEventTypes]: Extract<
    Runtime.RuntimeEvent,
    { type: key }
  >;
} & {
  'rpc-response': RPCResponseMessageEvent<Runtime.RuntimeRPC>;
};

type Methods = {
  [key in Runtime.RuntimeRPCTypes]: (
    payload: RPCRequestMessageEvent<Runtime.RuntimeRPC>
  ) => Promise<RPCResponseMessageEvent<Runtime.RuntimeRPC>>;
};

export function plugin(client: PluginClient<Events, Methods>) {
  const rpcHandlers: RuntimeRPCRequestHandlers = buildRPCRequests(
    async (message: RPCRequestMessageEvent<Runtime.RuntimeRPC>) => {
      // TODO: Do `send('rpc-request', message)`
      const response = await client.send(message.rpcType, message);
      // TODO: This doesn't currently work
      rpcHandlers[message.rpcType].onMessage(response);
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

  return { store };
}

export const Component = () => {
  const { store } = usePlugin(plugin);
  return <App store={store} />;
};
