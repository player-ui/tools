import React from "react";
import { type PluginClient, Layout, usePlugin } from "flipper-plugin";
import type {
  CommunicationLayerMethods,
  ExtensionSupportedEvents,
  MessengerEvent,
  TransactionMetadata,
} from "@player-tools/devtools-types";
import { Panel } from "@player-tools/devtools-client";

type Events = {
  /** message received */
  "message::plugin": MessengerEvent<ExtensionSupportedEvents> &
    TransactionMetadata;
};

type Methods = {
  /** message sent */
  "message::flipper": (
    message: MessengerEvent<ExtensionSupportedEvents>,
  ) => Promise<void>;
};

/** Flipper desktop plugin */
export function plugin(
  client: PluginClient<Events, Methods>,
): CommunicationLayerMethods {
  const listeners: Array<
    (
      message: MessengerEvent<ExtensionSupportedEvents> & TransactionMetadata,
    ) => void
  > = [];

  client.onConnect(() => {
    client.onMessage("message::plugin", (message) => {
      listeners.forEach((listener) => listener(message));
    });
  });

  return {
    sendMessage: async (message: MessengerEvent<ExtensionSupportedEvents>) => {
      client.send("message::flipper", message);
    },
    addListener: (
      listener: (
        message: MessengerEvent<ExtensionSupportedEvents> & TransactionMetadata,
      ) => void,
    ) => {
      listeners.push(listener);
    },
    removeListener: (
      listener: (
        message: MessengerEvent<ExtensionSupportedEvents> & TransactionMetadata,
      ) => void,
    ) => {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    },
  };
}

/** Flipper desktop plugin component */
export const Component = () => {
  const communicationLayer = usePlugin(plugin);
  return (
    <Layout.Container>
      <Panel communicationLayer={communicationLayer} />
    </Layout.Container>
  );
};
