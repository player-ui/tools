import { Messenger } from "@player-tools/devtools-messenger";
import type {
  ExtensionSupportedEvents,
  MessengerOptions,
} from "@player-tools/devtools-types";
import { useCallback, useEffect, useMemo, useReducer } from "react";

import { INITIAL_EXTENSION_STATE } from "../constants";
import { reducer } from "./reducer";

const NOOP_ID = -1;

/**
 * Custom React hook for managing the state of the devtools extension.
 *
 * This hook initializes the extension's state and sets up a communication layer
 * using the `Messenger` class. It provides methods to select a player or plugin,
 * and handle interactions, which dispatch actions to update the state accordingly.
 *
 */
export const useExtensionState = ({
  communicationLayer,
}: {
  /** the communication layer to use for the extension */
  communicationLayer: Pick<
    MessengerOptions<ExtensionSupportedEvents>,
    "sendMessage" | "addListener" | "removeListener"
  >;
}) => {
  const [state, dispatch] = useReducer(reducer, INITIAL_EXTENSION_STATE);

  const messengerOptions = useMemo<MessengerOptions<ExtensionSupportedEvents>>(
    () => ({
      context: "devtools",
      target: "player",
      messageCallback: (message) => {
        dispatch(message);
      },
      ...communicationLayer,
      logger: console,
      debug: true,
    }),
    [dispatch, communicationLayer]
  );

  const messenger = useMemo(
    () => new Messenger(messengerOptions),
    [messengerOptions]
  );

  useEffect(() => {
    return () => {
      messenger.destroy();
    };
  }, []);

  const selectPlayer = useCallback(
    (playerID: string) => {
      dispatch({
        id: NOOP_ID,
        sender: "internal",
        context: "devtools",
        _messenger_: false,
        timestamp: Date.now(),
        type: "PLAYER_DEVTOOLS_PLAYER_SELECTED",
        payload: {
          playerID,
        },
      });

      messenger.sendMessage({
        type: "PLAYER_DEVTOOLS_PLUGIN_INTERACTION",
        payload: {
          type: "player-selected",
          payload: playerID,
        },
      });
    },
    [dispatch]
  );

  const selectPlugin = useCallback(
    (pluginID: string) => {
      dispatch({
        id: NOOP_ID,
        sender: "internal",
        context: "devtools",
        _messenger_: false,
        timestamp: Date.now(),
        type: "PLAYER_DEVTOOLS_PLUGIN_SELECTED",
        payload: {
          pluginID,
        },
      });
    },
    [dispatch]
  );

  /**
   * Plugin authors can add interactive elements to the Player-UI content by leveraging
   * the pub-sub plugin and having the handle interaction proxy the message to the inspected
   * Player-UI instance.
   */
  const handleInteraction = useCallback(
    ({
      type,
      payload,
      playerID,
    }: {
      /** player id */
      playerID: string;
      /** interaction type */
      type: string;
      /** interaction payload */
      payload?: string;
    }) => {
      messenger.sendMessage({
        type: "PLAYER_DEVTOOLS_PLUGIN_INTERACTION",
        target: playerID,
        payload: {
          type,
          payload,
        },
      });
    },
    [messenger]
  );

  return { state, selectPlayer, selectPlugin, handleInteraction };
};
