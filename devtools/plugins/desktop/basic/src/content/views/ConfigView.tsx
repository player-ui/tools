import React from "react";
import { ObjectInspector } from "@devtools-ui/plugin";
import { VIEWS_IDS } from "../../constants";
import { bindings } from "../schema";
import { Screen } from "../common";

export const ConfigView = (
  <Screen
    id={VIEWS_IDS.CONFIG}
    main={
      <ObjectInspector binding={bindings.playerConfig as any}>
        <ObjectInspector.Label>Config</ObjectInspector.Label>
      </ObjectInspector>
    }
  />
);
