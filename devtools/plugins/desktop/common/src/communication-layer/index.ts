import type {
  ExtensionSupportedEvents,
  MessengerEvent,
  MessengerOptions,
  TransactionMetadata,
} from "@player-tools/devtools-types";
import { useEffect, useState } from "react";
import { type FlipperPluginConnection, flipperClient } from "js-flipper";

type IntoArrays<T> = {
  [P in keyof T]: T[P][];
};

type CommunicationLayerMethods = Pick<
  MessengerOptions<ExtensionSupportedEvents>,
  "sendMessage" | "addListener" | "removeListener"
>;

type Callbacks = IntoArrays<CommunicationLayerMethods>;

// keep track of the Flipper connection between React renders
let flipperConnection: FlipperPluginConnection | null = null;

/** Adds a Flipper client and starts the connection */
export const startFlipperConnection = (
  setLayerCallbacks: (
    value: React.SetStateAction<IntoArrays<CommunicationLayerMethods>>
  ) => void
) => {
  const listeners: Array<
    (
      message: TransactionMetadata & MessengerEvent<ExtensionSupportedEvents>
    ) => void
  > = [];

  if (!flipperConnection) {
    flipperClient
      .start("player-ui-devtools")
      .then(() => {
        flipperClient.addPlugin({
          getId() {
            return "player-ui-devtools";
          },
          onConnect(conn) {
            flipperConnection = conn;

            conn.receive("message::flipper", (message) => {
              listeners.forEach((listener) => listener(message));
            });
          },
          onDisconnect() {
            console.log("Flipper client disconnected");
            flipperConnection = null;
          },
        });
      })
      .catch((error) => {
        console.error("Failed to start Flipper client", error);
      });
  }

  const sendMessage: CommunicationLayerMethods["sendMessage"] = async (
    message
  ) => {
    flipperConnection?.send("message::plugin", message);
  };

  const addListener: CommunicationLayerMethods["addListener"] = (listener) => {
    listeners.push(listener);
  };

  setLayerCallbacks((current) => ({
    sendMessage: [...current.sendMessage, sendMessage],
    addListener: [...current.addListener, addListener],
    removeListener: current.removeListener,
  }));
};

/** Web extension communication layer leverage by the @player-tools/devtools-messenger */
export const useCommunicationLayer = (): Pick<
  MessengerOptions<ExtensionSupportedEvents>,
  "sendMessage" | "addListener" | "removeListener"
> => {
  const flipperConnectionIsActive = localStorage.getItem(
    "player-ui-devtools-flipper-active"
  );

  const [layerCallbacks, setLayerCallbacks] = useState<Callbacks>({
    sendMessage: [],
    addListener: [],
    removeListener: [],
  });

  useEffect(() => {
    if (flipperConnectionIsActive === "true") {
      startFlipperConnection(setLayerCallbacks);
    } else {
      console.warn(
        "The Flipper connection is disabled. If you want to enable it, use the Player UI extension popup."
      );
    }

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
