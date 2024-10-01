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
import { dset } from "dset/merge";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  id: playerID,
}: WrapperComponentProps): JSX.Element => {
  const [state, dispatch] = usePluginState({ playerID });
  const [highlight, setHighlight] = useState(false);
  const lastProcessedInteraction = useRef(0);
  const expEvaluator = useCallback(getEvaluateExpression(expressionEvaluator), [
    expressionEvaluator,
  ]);

  const pluginID = pluginData.id;

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
            (state?.plugins?.[pluginID]?.flow?.data
              ?.history as Array<Evaluation>) || [];
          dset(
            draft,
            ["plugins", pluginID, "flow", "data", "history"],
            [...current, result]
          );
        });

        dispatch({
          id: -1,
          type: "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
          payload: {
            pluginID: pluginID,
            data: newState.plugins[pluginID].flow.data,
          },
          sender: playerID,
          context: "player",
          target: playerID,
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

      if (type === INTERACTIONS.PLAYER_SELECTED && payload) {
        dispatch({
          id: -1,
          type: "PLAYER_DEVTOOLS_SELECTED_PLAYER_CHANGE",
          payload: { playerID: payload },
          sender: playerID,
          context: "player",
          target: playerID,
          timestamp: Date.now(),
          _messenger_: true,
        });
      }
    },
    [dispatch, expressionEvaluator, pluginID, state]
  );

  useEffect(() => {
    if (playerID === state.currentPlayer) {
      setHighlight(true);
      const timer = setTimeout(() => {
        setHighlight(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [playerID, state.currentPlayer]);

  // inject playerConfig into the plugin data
  const pluginDataWithPlayerConfig = produce(pluginData, (draft) => {
    dset(draft, ["flow", "data", "playerConfig"], playerConfig);
  });

  // Initial plugin content
  useEffect(() => {
    const transaction: Transaction<PlayerInitEvent> = {
      id: -1,
      type: "PLAYER_DEVTOOLS_PLAYER_INIT",
      payload: {
        plugins: {
          [pluginID]: pluginDataWithPlayerConfig,
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
    if (dequal(state.plugins[pluginID]?.flow?.data?.data, data)) return;

    const newState = produce(state, (draft) => {
      dset(draft, ["plugins", pluginID, "flow", "data", "data"], data);
    });

    const transaction = genDataChangeTransaction({
      playerID,
      data: newState.plugins[pluginID].flow.data,
      pluginID: pluginID,
    });

    dispatch(transaction);
  }, [data]);

  // Logs changes
  useEffect(() => {
    if (dequal(state.plugins[pluginID]?.flow?.data?.logs, logs)) return;

    const newState = produce(state, (draft) => {
      dset(draft, ["plugins", pluginID, "flow", "data", "logs"], logs);
    });

    const transaction = genDataChangeTransaction({
      playerID,
      data: newState.plugins[pluginID].flow.data,
      pluginID: pluginID,
    });

    dispatch(transaction);
  }, [logs]);

  // Flow changes
  useEffect(() => {
    if (dequal(state.plugins[pluginID]?.flow?.data?.flow, flow)) return;

    const newState = produce(state, (draft) => {
      dset(draft, ["plugins", pluginID, "flow", "data", "flow"], flow);
    });

    const transaction = genDataChangeTransaction({
      playerID,
      data: newState.plugins[pluginID].flow.data,
      pluginID: pluginID,
    });

    dispatch(transaction);
  }, [flow]);

  return (
    <div id={playerID} style={highlight ? { border: "2px solid blue" } : {}}>
      {children}
    </div>
  );
};
