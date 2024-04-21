import type { PluginData } from "@player-tools/devtools-types";

export const PLUGIN_ID = "player-ui-basic-devtools-plugin";

export const PLUGIN_NAME = "Standard Devtools";

export const PLUGIN_DESCRIPTION = "Standard Player UI Devtools";

export const PLUGIN_VERSION = "0.0.1";

export const VIEWS_IDS = {
  CONFIG: "Config",
  FLOW: "Flow",
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

export const PLUGIN_INACTIVE_WARNING =
  "The plugin has been registered, but the Player development tools are not active. If you are working in a production environment, it is recommended to remove the plugin. Either way, you can activate the Player development tools by clicking on the extension popup and refreshing the page.";
