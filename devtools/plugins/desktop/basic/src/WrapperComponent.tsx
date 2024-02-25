import { usePluginState } from "@player-tools/devtools-desktop-plugins-common";
import type {
  DevtoolsPluginInteractionEvent,
  PlayerInitEvent,
  PluginData,
  Transaction,
} from "@player-tools/devtools-types";
import type { Flow } from "@player-ui/react";
import { dequal } from "dequal";
import { dset } from "dset/merge";
import { produce } from "immer";
import React, { useCallback, useEffect } from "react";
import { BASE_PLUGIN_DATA, INTERACTIONS } from "./constants";
import type { Evaluation, WrapperComponentProps } from "./types";
import { genDataChangeTransaction, getEvaluateExpression } from "./helpers";
import flow from "../_generated/index.json";

const pluginData: PluginData = {
  ...BASE_PLUGIN_DATA,
  flow: flow as Flow,
};

/** Tap into the ReactPlayer hooks and create the content to be rendered into the extension Player UI */
export const WrapperComponent = ({
  children,
  data,
  logs,
  flow,
  expressionEvaluator,
}: WrapperComponentProps): JSX.Element => {
  const [state, playerID, dispatch] = usePluginState();
  const lastProcessedInteraction = React.useRef(0);
  const expEvaluator = useCallback(getEvaluateExpression(expressionEvaluator), [
    expressionEvaluator,
  ]);

  const id = pluginData.id;

  const processInteraction = useCallback(
    (interaction: DevtoolsPluginInteractionEvent) => {
      const {
        payload: { type, payload },
      } = interaction;
      if (
        type === INTERACTIONS.EVALUATE_EXPRESSION &&
        expressionEvaluator &&
        payload
      ) {
        const result = expEvaluator(payload);

        lastProcessedInteraction.current += 1;

        const newState = produce(state, (draft) => {
          const current: Array<Evaluation> =
            (state?.plugins?.[id]?.flow?.data
              ?.evaluations as Array<Evaluation>) || [];
          dset(
            draft,
            ["plugins", id, "flow", "data", "evaluations"],
            [...current, result]
          );
        });

        dispatch({
          id: -1,
          type: "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
          payload: {
            pluginID: id,
            data: newState.plugins[id].flow.data,
          },
          sender: playerID,
          context: "player",
          target: "player",
          timestamp: Date.now(),
          _messenger_: true,
        });
      }
    },
    [dispatch, expressionEvaluator, id, state]
  );

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

  // Process interactions
  useEffect(() => {
    if (lastProcessedInteraction.current < (state.interactions.length ?? 0)) {
      state.interactions.forEach(processInteraction);
    }
  }, [state.interactions.length]);

  // Data changes
  useEffect(() => {
    if (dequal(state.plugins[id]?.flow?.data?.data, data)) return;

    const newState = produce(state, (draft) => {
      dset(draft, ["plugins", id, "flow", "data", "data"], data);
    });

    const transaction = genDataChangeTransaction({
      playerID,
      data: newState.plugins[id].flow.data,
      pluginID: id,
    });

    dispatch(transaction);
  }, [data]);

  // Logs changes
  useEffect(() => {
    if (dequal(state.plugins[id]?.flow?.data?.logs, logs)) return;

    const newState = produce(state, (draft) => {
      dset(draft, ["plugins", id, "flow", "data", "logs"], logs);
    });

    const transaction = genDataChangeTransaction({
      playerID,
      data: newState.plugins[id].flow.data,
      pluginID: id,
    });

    dispatch(transaction);
  }, [logs]);

  // Flow changes
  useEffect(() => {
    if (dequal(state.plugins[id]?.flow?.data?.flow, flow)) return;

    const newState = produce(state, (draft) => {
      dset(draft, ["plugins", id, "flow", "data", "flow"], flow);
    });

    const transaction = genDataChangeTransaction({
      playerID,
      data: newState.plugins[id].flow.data,
      pluginID: id,
    });

    dispatch(transaction);
  }, [flow]);

  return children as JSX.Element;
};
