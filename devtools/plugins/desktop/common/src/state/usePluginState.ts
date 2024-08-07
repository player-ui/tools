import { Messenger } from "@player-tools/devtools-messenger";
import type {
  DevtoolsPluginsStore,
  ExtensionSupportedEvents,
  MessengerOptions,
  Transaction,
} from "@player-tools/devtools-types";
import { useEffect, useMemo, useReducer, useRef } from "react";
import uid from "tiny-uid";
import { useCommunicationLayer } from "../communication-layer";
import { reducer } from "./reducer";

const playerID = uid();

const INITIAL_STATE: DevtoolsPluginsStore = {
  messages: [],
  plugins: {},
  interactions: [],
};

/** devtools plugin state */
export const usePluginState = (): [
  DevtoolsPluginsStore,
  string,
  React.Dispatch<Transaction<ExtensionSupportedEvents>>
] => {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const lastMessageIndex = useRef<number>(-1);
  const { sendMessage, addListener, removeListener } = useCommunicationLayer();

  const messenger = useMemo(() => {
    const options: MessengerOptions<ExtensionSupportedEvents> = {
      id: playerID,
      context: "player",
      messageCallback: (message) =>
        dispatch(message as Parameters<typeof dispatch>[0]),
      sendMessage,
      addListener,
      removeListener,
      logger: console,
    };

    return new Messenger(options);
  }, [addListener, removeListener, sendMessage]);

  useEffect(() => {
    if (state.messages.length > lastMessageIndex.current + 1) {
      const messages = state.messages.slice(
        lastMessageIndex.current + 1,
        state.messages.length
      );
      lastMessageIndex.current = state.messages.length - 1;
      messages.forEach((message) => {
        messenger.sendMessage(message);
      });
    }
  }, [state.messages, messenger]);

  return [state, playerID, dispatch];
};
