import React from "react";
import { expression as e } from "@player-tools/dsl";
import { Action, Collection, ObjectInspector, Text } from "@devtools-ui/plugin";
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
          <Action key="startProfiler" exp={startProfilerExpression.toString()}>
            <Action.Label>
              <Text>Start</Text>
            </Action.Label>
          </Action>
          <Action key="stopProfiler" exp={stopProfilerExpression.toString()}>
            <Action.Label>
              <Text>Stop</Text>
            </Action.Label>
          </Action>
        </Collection.Values>
      </Collection>
    }
    main={
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      <ObjectInspector binding={bindings.rootNode as any} />
    }
  />
);
