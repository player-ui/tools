import { usePluginState } from "@player-tools/devtools-desktop-plugins-common";
import type {
  DevtoolsPluginInteractionEvent,
  PlayerInitEvent,
  PluginData,
  Transaction,
} from "@player-tools/devtools-types";
import type { Flow } from "@player-ui/react";
import { dequal } from "dequal";
import { produce } from "immer";
import set from "lodash.set";
import React, { useCallback, useEffect } from "react";
import { BASE_PLUGIN_DATA, INTERACTIONS } from "./constants";
import type { Evaluation, WrapperComponentProps } from "./types";
import { genDataChangeTransaction, getEvaluateExpression } from "./helpers";
import flow from "../_generated/index.json";

const pluginData: PluginData = {
  ...BASE_PLUGIN_DATA,
  flow: flow as Flow,
};

/** Defines the content to be rendered into the extension Player UI and process changes */
export const WrapperComponent = ({
  children,
  data,
  playerConfig,
  logs,
  flow,
  expressionEvaluator,
  overrideFlow,
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
        const newState = produce(state, (draft) => {
          const current: Array<Evaluation> =
            (state?.plugins?.[id]?.flow?.data?.history as Array<Evaluation>) ||
            [];
          set(
            draft,
            ["plugins", id, "flow", "data", "history"],
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

        lastProcessedInteraction.current += 1;
      }

      if (type === INTERACTIONS.OVERRIDE_FLOW && payload && overrideFlow) {
        let newFlow: Flow | undefined;

        try {
          newFlow = JSON.parse(payload);
        } catch (e) {
          console.error("Error parsing new flow", e);
        }

        newFlow && overrideFlow(newFlow);
      }
    },
    [dispatch, expressionEvaluator, id, state]
  );

  // inject playerConfig into the plugin data
  const pluginDataWithPlayerConfig = produce(pluginData, (draft) => {
    set(draft, ["flow", "data", "playerConfig"], playerConfig);
  });

  // Initial plugin content
  useEffect(() => {
    const transaction: Transaction<PlayerInitEvent> = {
      id: -1,
      type: "PLAYER_DEVTOOLS_PLAYER_INIT",
      payload: {
        plugins: {
          [id]: pluginDataWithPlayerConfig,
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
      state.interactions
        .slice(lastProcessedInteraction.current)
        .forEach(processInteraction);
    }
  }, [state.interactions.length]);

  // Data changes
  useEffect(() => {
    if (dequal(state.plugins[id]?.flow?.data?.data, data)) return;

    const newState = produce(state, (draft) => {
      set(draft, ["plugins", id, "flow", "data", "data"], data);
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
      set(draft, ["plugins", id, "flow", "data", "logs"], logs);
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
      set(draft, ["plugins", id, "flow", "data", "flow"], flow);
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
