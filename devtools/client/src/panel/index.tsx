import React, { useRef } from "react";
import type {
  MessengerOptions,
  ExtensionSupportedEvents,
} from "@player-tools/devtools-types";
import { DataController, Flow, useReactPlayer } from "@player-ui/react";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import {
  Card,
  CardBody,
  CardHeader,
  ChakraProvider,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Select,
  Text,
} from "@chakra-ui/react";
import { ThemeProvider } from "@devtools-ds/themes";

import { INITIAL_FLOW } from "../constants";
import { PLAYER_PLUGINS, PUBSUB_PLUGIN } from "../plugins";
import { useExtensionState } from "../state";
import { flowDiff } from "../helpers/flowDiff";
import { theme } from "./theme";

const fallbackRender: ErrorBoundary["props"]["fallbackRender"] = ({
  error,
}) => {
  return (
    <Container centerContent>
      <Card>
        <CardHeader>
          <Heading>Ops, something went wrong.</Heading>
        </CardHeader>
      </Card>
      <CardBody>
        <Text as="pre">{error.message}</Text>
      </CardBody>
    </Container>
  );
};

/**
 * Panel Component
 *
 * This component serves as the main container for the devtools plugin content defined by plugin authors using Player-UI DSL.
 *
 * Props:
 * - `communicationLayer`: An object that allows communication between the devtools and the Player-UI plugins,
 *   enabling the exchange of data and events.
 *
 * Features:
 * - Error Handling: Utilizes the `ErrorBoundary` component from `react-error-boundary` to gracefully handle and display errors
 *   that may occur during the rendering of the plugin's content.
 * - State Management: Integrates with custom hooks such as `useExtensionState` to manage the state of the plugin and its components.
 * - Player Integration: Uses the `useReactPlayer` hook from `player-ui/react` to render interactive player components based on the
 *   DSL defined by the plugin authors.
 *
 * Example Usage:
 * ```tsx
 * <Panel communicationLayer={myCommunicationLayer} />
 * ```
 *
 * Note: The `communicationLayer` prop is essential for the proper functioning of the `Panel` component, as it enables the necessary
 * communication and data exchange with the player-ui/react library.
 */
export const Panel = ({
  communicationLayer,
}: {
  /** the communication layer to use for the extension */
  readonly communicationLayer: Pick<
    MessengerOptions<ExtensionSupportedEvents>,
    "sendMessage" | "addListener" | "removeListener"
  >;
}) => {
  const { state, selectPlayer, selectPlugin, handleInteraction } =
    useExtensionState({
      communicationLayer,
    });

  const { reactPlayer } = useReactPlayer({
    plugins: PLAYER_PLUGINS,
  });

  const dataController = useRef<WeakRef<DataController> | null>(null);

  const currentFlow = useRef<Flow | null>(null);

  useEffect(() => {
    reactPlayer.player.hooks.dataController.tap("devtools-panel", (d) => {
      dataController.current = new WeakRef(d);
    });
  }, [reactPlayer]);

  useEffect(() => {
    // we subscribe to all messages from the devtools plugin
    // so the plugin author can define their own events
    PUBSUB_PLUGIN.subscribe("*", (type: string, payload: string) => {
      handleInteraction({
        type,
        payload,
      });
    });
  }, []);

  useEffect(() => {
    const { player, plugin } = state.current;

    const flow =
      player && plugin
        ? state.players[player]?.plugins?.[plugin]?.flow || INITIAL_FLOW
        : INITIAL_FLOW;

    if (!currentFlow.current) {
      currentFlow.current = flow;
      reactPlayer.start(flow);
      return;
    }

    const diff = flowDiff({
      curr: currentFlow.current as Flow,
      next: flow,
    });

    if (diff) {
      const { change, value } = diff;

      if (change === "flow") {
        currentFlow.current = value;
        reactPlayer.start(value);
      } else if (change === "data") {
        if (dataController.current) {
          dataController.current.deref()?.set(value as Record<string, unknown>);
        } else {
          reactPlayer.start(flow);
        }
      }
    }
  }, [reactPlayer, state]);

  const Component = reactPlayer.Component as React.FC;

  return (
    <ChakraProvider theme={theme}>
      <ThemeProvider colorScheme="dark">
        <ErrorBoundary fallbackRender={fallbackRender}>
          <Flex direction="column" w="100vw" h="100vh" alignItems={"normal"}>
            {state.current.player ? (
              <Container minWidth={"100%"}>
                <Flex direction="column" marginTop="4">
                  <Flex gap={"8"}>
                    <FormControl>
                      <FormLabel>Player</FormLabel>
                      <Select
                        id="player"
                        value={state.current.player || ""}
                        onChange={(event) => selectPlayer(event.target.value)}
                      >
                        {Object.keys(state.players).map((playerID) => (
                          <option key={playerID} value={playerID}>
                            {playerID}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <FormLabel>Plugin</FormLabel>
                      <Select
                        id="plugin"
                        value={state.current.plugin || ""}
                        onChange={(event) => selectPlugin(event.target.value)}
                      >
                        {Object.keys(
                          state.players[state.current.player].plugins,
                        ).map((pluginID) => (
                          <option key={pluginID} value={pluginID}>
                            {pluginID}
                          </option>
                        ))}
                      </Select>
                    </FormControl>
                  </Flex>
                  <Flex>
                    <Component />
                  </Flex>
                  <details>
                    <summary>Debug</summary>
                    <pre style={{ maxHeight: "30vh", overflow: "scroll" }}>
                      {JSON.stringify(state, null, 2)}
                    </pre>
                  </details>
                </Flex>
              </Container>
            ) : (
              <Flex justifyContent="center" padding="6">
                <Text>
                  No Player-UI instance or devtools plugin detected. Visit{" "}
                  <a href="https://player-ui.github.io/">
                    https://player-ui.github.io/
                  </a>{" "}
                  for more info.
                </Text>
              </Flex>
            )}
          </Flex>
        </ErrorBoundary>
      </ThemeProvider>
    </ChakraProvider>
  );
};
