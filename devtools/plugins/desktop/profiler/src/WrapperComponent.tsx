import { usePluginState } from "@player-tools/devtools-desktop-plugins-common";
import type {
  DevtoolsPluginInteractionEvent,
  PlayerInitEvent,
  PluginData,
  Transaction,
} from "@player-tools/devtools-types";
import type { Flow } from "@player-ui/react";
import { produce } from "immer";
import set from "lodash.set";
import React, { useCallback, useEffect } from "react";
import { BASE_PLUGIN_DATA, INTERACTIONS } from "./constants";
import type { WrapperComponentProps } from "./types";
import { genDataChangeTransaction } from "./helpers";
import flow from "../_generated/index.json";

const pluginData: PluginData = {
  ...BASE_PLUGIN_DATA,
  flow: flow as Flow,
};

/** Defines the content to be rendered into the extension Player UI and process changes */
export const WrapperComponent = ({
  children,
  startProfiler,
  stopProfiler,
  id: playerID,
}: WrapperComponentProps): JSX.Element => {
  const [state, dispatch] = usePluginState({ playerID });
  const lastProcessedInteraction = React.useRef(0);
  const id = pluginData.id;

  // Initial plugin content
  useEffect(() => {
    const transaction: Transaction<PlayerInitEvent> = {
      id: -1,
      type: "PLAYER_DEVTOOLS_PLAYER_INIT",
      payload: {
        plugins: {
          [id]: pluginData,
        },
      },
      sender: playerID,
      context: "player",
      target: "player",
      timestamp: Date.now(),
      _messenger_: true,
    };

    dispatch(transaction);
  }, []);

  const processInteraction = useCallback(
    (interaction: DevtoolsPluginInteractionEvent) => {
      const {
        payload: { type },
      } = interaction;
      if (type === INTERACTIONS.START_PROFILING) {
        startProfiler();
        lastProcessedInteraction.current += 1;

        const newState = produce(state, (draft) => {
          set(draft, ["plugins", id, "flow", "data", "rootNode"], {
            name: "root",
            children: [],
          });
          set(draft, ["plugins", id, "flow", "data", "durations"], []);
          set(draft, ["plugins", id, "flow", "data", "profiling"], true);
          set(
            draft,
            ["plugins", id, "flow", "data", "displayFlameGraph"],
            false
          );
        });

        const transaction = genDataChangeTransaction({
          playerID,
          data: newState.plugins[id].flow.data,
          pluginID: id,
        });

        dispatch(transaction);
      }

      if (type === INTERACTIONS.STOP_PROFILING) {
        const { rootNode, durations } = stopProfiler();
        lastProcessedInteraction.current += 1;

        const newState = produce(state, (draft) => {
          set(draft, ["plugins", id, "flow", "data", "rootNode"], rootNode);
          set(draft, ["plugins", id, "flow", "data", "durations"], durations);
          set(draft, ["plugins", id, "flow", "data", "profiling"], false);
          set(
            draft,
            ["plugins", id, "flow", "data", "displayFlameGraph"],
            true
          );
        });

        const transaction = genDataChangeTransaction({
          playerID,
          data: newState.plugins[id].flow.data,
          pluginID: id,
        });

        dispatch(transaction);
      }
    },
    [dispatch, id, state]
  );

  // Process interactions
  useEffect(() => {
    if (lastProcessedInteraction.current < (state.interactions.length ?? 0)) {
      state.interactions
        .slice(lastProcessedInteraction.current)
        .forEach(processInteraction);
    }
  }, [state.interactions.length]);

  return children as JSX.Element;
};
