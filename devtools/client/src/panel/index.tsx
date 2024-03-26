import React, { useRef } from "react";
import type { MessengerOptions } from "@player-tools/devtools-types";
import type { ExtensionSupportedEvents } from "@player-tools/devtools-types";
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
  HStack,
  Select,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ThemeProvider } from "@devtools-ds/themes";

import { INITIAL_FLOW, PLAYER_PLUGINS, PUBSUB_PLUGIN } from "../constants";
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
 * Panel component
 *
 * devtools plugin authors can define their plugins content using DSL and have it rendered here
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
    reactPlayer.player.hooks.dataController.tap("panel", (d) => {
      dataController.current = new WeakRef(d);
    });
  }, [reactPlayer]);

  useEffect(() => {
    // we subscribe to all messages from the devtools plugin
    // so the plugin author can define their own events
    PUBSUB_PLUGIN.subscribe("*", (type: string, payload: string) => {
      console.log("Received message", { type, payload });

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
        dataController.current
          ? dataController.current
              .deref()
              ?.set(value as Record<string, unknown>)
          : reactPlayer.start(flow);
      }
    }
  }, [reactPlayer, state]);

  const Component = reactPlayer.Component as React.FC;

  return (
    <ChakraProvider theme={theme}>
      <ThemeProvider colorScheme="dark">
        <ErrorBoundary fallbackRender={fallbackRender}>
          <VStack w="100vw" h="100vh">
            {state.current.player ? (
              <Flex direction="column" marginTop="4">
                <HStack spacing="4">
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
                        state.players[state.current.player].plugins
                      ).map((pluginID) => (
                        <option key={pluginID} value={pluginID}>
                          {pluginID}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>
                <Container marginY="6">
                  <Component />
                </Container>
                <details>
                  <summary>Debug</summary>
                  <pre>{JSON.stringify(state, null, 2)}</pre>
                </details>
              </Flex>
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
          </VStack>
        </ErrorBoundary>
      </ThemeProvider>
    </ChakraProvider>
  );
};
