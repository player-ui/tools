import type {
  ExtensionSupportedEvents,
  MessengerOptions,
} from "@player-tools/devtools-types";
import { useEffect, useState } from "react";

type IntoArrays<T> = {
  [P in keyof T]: T[P][];
};

type CommunicationLayerMethods = Pick<
  MessengerOptions<ExtensionSupportedEvents>,
  "sendMessage" | "addListener" | "removeListener"
>;

type Callbacks = IntoArrays<CommunicationLayerMethods>;

/** Web extension communication layer leverage by the @player-tools/devtools-messenger */
export const useCommunicationLayer = (): Pick<
  MessengerOptions<ExtensionSupportedEvents>,
  "sendMessage" | "addListener" | "removeListener"
> => {
  const [layerCallbacks, setLayerCallbacks] = useState<Callbacks>({
    sendMessage: [],
    addListener: [],
    removeListener: [],
  });

  useEffect(() => {
    // TODO:: figure out the connection errors when uncommenting this block
    //
    // import("js-flipper").then(({ flipperClient }) => {
    //   flipperClient.start("Player UI Devtools").then(() => {
    //     flipperClient.addPlugin({
    //       getId() {
    //         return "player-devtools";
    //       },
    //
    //       onConnect(connection) {
    //         /** MessengerOptions['sendMessage'] */
    //         const sendMessage: CommunicationLayerMethods["sendMessage"] =
    //           async (message) => {
    //             connection.send("message::plugin", message);
    //           };
    //
    //         /** MessengerOptions['addListener'] */
    //         const addListener: CommunicationLayerMethods["addListener"] = (
    //           listener
    //         ) => {
    //           connection.receive("message::flipper", (message) => {
    //             listener(message);
    //           });
    //         };
    //
    //         setLayerCallbacks((current) => ({
    //           sendMessage: [...current.sendMessage, sendMessage],
    //           addListener: [...current.addListener, addListener],
    //           removeListener: current.removeListener,
    //         }));
    //       },
    //       onDisconnect() {},
    //     });
    //   });
    // });

    let windowListener: null | ((event: MessageEvent) => void) = null;

    setLayerCallbacks((current) => ({
      sendMessage: [
        ...current.sendMessage,
        async (message) => {
          window.postMessage(message, "*");
        },
      ],
      addListener: [
        ...current.addListener,
        (listener) => {
          windowListener = (event: MessageEvent) => listener(event.data);
          window.addEventListener("message", windowListener);
        },
      ],
      removeListener: [
        ...current.removeListener,
        () => {
          if (windowListener) {
            window.removeEventListener("message", windowListener);
          }
        },
      ],
    }));
  }, []);

  const layer: Pick<
    MessengerOptions<ExtensionSupportedEvents>,
    "sendMessage" | "addListener" | "removeListener"
  > = {
    sendMessage: async (message) => {
      layerCallbacks.sendMessage.forEach((callback) => callback(message));
    },
    addListener: (listener) => {
      layerCallbacks.addListener.forEach((callback) => callback(listener));
    },
    removeListener: (listener) => {
      layerCallbacks.removeListener.forEach((callback) => callback(listener));
    },
  };

  return layer;
};
