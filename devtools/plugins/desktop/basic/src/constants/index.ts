import type { PluginData } from "@player-tools/devtools-types";

export const PLUGIN_ID = "player-ui-basic-devtools-plugin";

export const PLUGIN_NAME = "Standard Devtools";

export const PLUGIN_DESCRIPTION = "Standard Player UI Devtools";

export const PLUGIN_VERSION = "0.0.1";

export const VIEWS_IDS = {
  FLOW: "Flow",
  DATA: "Data",
  LOGS: "Logs",
  CONSOLE: "Console",
};

export const INTERACTIONS = {
  EVALUATE_EXPRESSION: "evaluate-expression",
};

export const BASE_PLUGIN_DATA: Omit<PluginData, "flow"> = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: PLUGIN_DESCRIPTION,
  version: PLUGIN_VERSION,
};
