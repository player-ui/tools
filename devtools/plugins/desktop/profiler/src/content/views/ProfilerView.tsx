/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react";
import { expression as e } from "@player-tools/dsl";
import { Action, Collection, FlameGraph, Text } from "@devtools-ui/plugin";
import { INTERACTIONS, VIEWS_IDS } from "../../constants";
import { Screen } from "../common";
import { bindings } from "../schema";

const startProfilerExpression = e` publish('${INTERACTIONS.START_PROFILING}') `;
const stopProfilerExpression = e` publish('${INTERACTIONS.STOP_PROFILING}') `;

export const ProfilerView = (
  <Screen
    id={VIEWS_IDS.PROFILER}
    header={
      <Collection>
        <Collection.Values>
          <Action
            applicability={e` {{profiling}} === true ` as any}
            key="stopProfiler"
            exp={stopProfilerExpression.toString()}
          >
            <Action.Label>
              <Text>Stop</Text>
            </Action.Label>
          </Action>
          <Action
            applicability={e` {{profiling}} === false ` as any}
            key="startProfiler"
            exp={startProfilerExpression.toString()}
          >
            <Action.Label>
              <Text>Start</Text>
            </Action.Label>
          </Action>
        </Collection.Values>
      </Collection>
    }
    main={
      <Collection>
        <Collection.Values>
          <FlameGraph
            applicability={e` {{displayFlameGraph}} === true ` as any}
            binding={bindings.rootNode as any}
          />
          <Text applicability={e` {{profiling}} === true` as any}>
            Profiling...
          </Text>
          <Text applicability={e` {{profiling}} === false` as any}>
            Start the profiler to generate the flame graph.
          </Text>
        </Collection.Values>
      </Collection>
    }
  />
);
