import React from "react";
import { ObjectInspector, CopyToClipboard } from "@devtools-ui/plugin";
import { VIEWS_IDS } from "../../constants";
import { Screen } from "../common";
import { bindings } from "../schema";

export const FlowView = (
  <Screen
    id={VIEWS_IDS.FLOW}
    main={
      <ObjectInspector binding={bindings.flow as any} filter>
        <ObjectInspector.Label>Flow</ObjectInspector.Label>
      </ObjectInspector>
    }
    footer={
      <CopyToClipboard binding={bindings.flow as any}>
        <CopyToClipboard.Label>
          Copy flow to the clipboard
        </CopyToClipboard.Label>
      </CopyToClipboard>
    }
  />
);
