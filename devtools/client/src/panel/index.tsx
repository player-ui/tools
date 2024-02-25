import React, { useRef } from "react";
import type { MessengerOptions } from "@player-tools/devtools-types";
import type { ExtensionSupportedEvents } from "@player-tools/devtools-types";
import { DataController, Flow, useReactPlayer } from "@player-ui/react";
import { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";

import styles from "./index.module.css";
import { INITIAL_FLOW, PLAYER_CONFIG, PUBSUB_PLUGIN } from "../constants";
import { useExtensionState } from "../state";
import { flowDiff } from "../helpers/flowDiff";

const fallbackRender: ErrorBoundary["props"]["fallbackRender"] = ({
  error,
}) => {
  return (
    <div className={styles.errorMessage}>
      <p>Ops, something went wrong.</p>
      <pre>{error.message}</pre>
    </div>
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

  const { reactPlayer } = useReactPlayer(PLAYER_CONFIG);

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
    <ErrorBoundary fallbackRender={fallbackRender}>
      <div className={styles.container}>
        <>
          {state.current.player ? (
            <>
              <header className={styles.header}>
                <div className={styles.dropdownContainer}>
                  <label htmlFor="player">Player: </label>
                  <select
                    id="player"
                    className={styles.dropdown}
                    value={state.current.player || ""}
                    onChange={(event) => selectPlayer(event.target.value)}
                  >
                    {Object.keys(state.players).map((playerID) => (
                      <option key={playerID} value={playerID}>
                        {playerID}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={styles.dropdownContainer}>
                  <label htmlFor="plugin">Plugin: </label>
                  <select
                    id="plugin"
                    className={styles.dropdown}
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
                  </select>
                </div>
              </header>

              <main className={styles.main}>
                <Component />
              </main>

              <details>
                <summary>State</summary>
                <pre>{JSON.stringify(state, null, 2)}</pre>
              </details>
            </>
          ) : (
            <div className={styles.noPlayerMessage}>
              <p>
                No Player-UI instance or devtools plugin detected. Visit{" "}
                <a href="https://player-ui.github.io/">
                  https://player-ui.github.io/
                </a>{" "}
                for more info.
              </p>
            </div>
          )}
        </>
      </div>
    </ErrorBoundary>
  );
};
