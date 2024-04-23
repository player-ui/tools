import DevtoolsUIAssetsPlugin from "@devtools-ui/plugin";
import { PubSubPlugin } from "@player-ui/pubsub-plugin";
import type { ReactPlayerPlugin } from "@player-ui/react";

export const PUBSUB_PLUGIN = new PubSubPlugin();

export const PLAYER_PLUGINS: ReactPlayerPlugin[] = [
  new DevtoolsUIAssetsPlugin(),
  PUBSUB_PLUGIN,
];
