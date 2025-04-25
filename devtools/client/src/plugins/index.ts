import DevtoolsUIAssetsPlugin from "@devtools-ui/plugin";
import { PubSubPlugin } from "@player-ui/pubsub-plugin";
import { CommonExpressionsPlugin } from "@player-ui/common-expressions-plugin";
import { CommonTypesPlugin } from "@player-ui/common-types-plugin";
import { DataChangeListenerPlugin } from "@player-ui/data-change-listener-plugin";
import type { ReactPlayerPlugin } from "@player-ui/react";

export const PUBSUB_PLUGIN = new PubSubPlugin();

export const PLAYER_PLUGINS: ReactPlayerPlugin[] = [
  new CommonTypesPlugin(),
  new CommonExpressionsPlugin(),
  new DataChangeListenerPlugin(),
  new DevtoolsUIAssetsPlugin(),
  PUBSUB_PLUGIN,
];
