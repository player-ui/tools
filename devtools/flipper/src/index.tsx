import React from 'react';
import { PluginClient, usePlugin } from 'flipper-plugin';
import {
  Runtime,
  Events,
  Methods,
} from '@player-tools/devtools-common';
import {
  createDevtoolsStore,
  dispatchEvents,
} from '@player-tools/devtools-client';
// TODO: Fix import lol -- maybe try to bundle this package _before_ it hits flipper-pkg? i'm so tired of monkeying with this
import { App } from '@player-tools/devtools-ui/dist/devtools-ui.prod';

type Events = {
  [type in Events.Event['type']]: Events.ByType<type>;
};

type Methods = {
  [type in Methods.Method["type"]]: (
    payload: Methods.ByType<type>["params"]
  ) => Promise<Methods.ByType<type>["result"]>;
};

export function plugin(client: PluginClient<Events, Methods>) {
  // Delegate to plugin for how to handle communications
  const methodHandler = async <T extends Methods.MethodTypes>(
    method: Methods.ByType<T>
  ): Promise<Methods.ByType<T>['result']> => {
    if (await client.supportsMethod(method.type)) {
      return (await client.send(
        method.type,
        method.params as any
      )) as Methods.ByType<T>['result'];
    }
    // TODO: What do we do when things aren't supported?
  };

  const store = createDevtoolsStore(methodHandler)

  // Listen for events
  Events.EventTypes.forEach((event) => {
    client.onMessage(event, dispatchEvents(store.dispatch));
  });

  return { store };
}

export const Component = () => {
  const { store } = usePlugin(plugin);
  return <App store={store} />;
};
