import type { PluginData } from "@player-tools/devtools-types";

export const PLUGIN_ID = "player-ui-profiler-plugin";

export const PLUGIN_NAME = "Player UI Profiler";

export const PLUGIN_DESCRIPTION = "Standard Player UI Profiler";

export const PLUGIN_VERSION = "0.0.1";

export const VIEWS_IDS = {
  PROFILER: "Profiler",
};

export const INTERACTIONS = {
  START_PROFILING: "start-profiling",
  STOP_PROFILING: "stop-profiling",
};

export const BASE_PLUGIN_DATA: Omit<PluginData, "flow"> = {
  id: PLUGIN_ID,
  name: PLUGIN_NAME,
  description: PLUGIN_DESCRIPTION,
  version: PLUGIN_VERSION,
};

export const PLUGIN_INACTIVE_WARNING =
  "The plugin has been registered, but the Player development tools are not active. If you are working in a production environment, it is recommended to remove the plugin. Either way, you can activate the Player development tools by clicking on the extension popup and refreshing the page.";
