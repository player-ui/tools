import { expression as e } from "@player-tools/dsl";
import { CodeEditor } from "@devtools-ui/plugin";
import React from "react";
import { VIEWS_IDS, INTERACTIONS } from "../../constants";
import { Screen } from "../common";
import { bindings } from "../schema";

const evaluateExpression = e` publish('${INTERACTIONS.OVERRIDE_FLOW}', ${bindings.code}) `;

export const EditorView = (
  <Screen
    id={VIEWS_IDS.EDITOR}
    main={
      <CodeEditor
        exp={evaluateExpression as any}
        binding={bindings.flow as any}
      />
    }
  />
);
