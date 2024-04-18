import type {
  DataController,
  ExpressionEvaluator,
  Flow,
  Player,
  ReactPlayer,
  ReactPlayerPlugin,
  ViewInstance,
} from "@player-ui/react";
import { dset } from "dset/merge";
import { produce } from "immer";
import React from "react";
import { WrapperComponent } from "./WrapperComponent";

/** Basic Web Devtools Plugin */
export class BasicWevDevtoolsPlugin implements ReactPlayerPlugin {
  name = "player_ui_basic_devtools_plugin";

  data: Record<string, unknown> = {};

  playerConfig: Record<string, unknown> = {};

  logs: {
    severity: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any;
  }[] = [];

  flow?: Flow;

  expressionEvaluator?: WeakRef<ExpressionEvaluator>;

  view?: WeakRef<ViewInstance>;

  dataController?: WeakRef<DataController>;

  checkIfDevtoolsIsActive() {
    return localStorage.getItem("player-ui-devtools-active") === "true";
  }

  apply(player: Player) {
    if (!this.checkIfDevtoolsIsActive()) {
      console.log(
        "The plugin has been registered, but the Player development tools are not active. If you are working in a production environment, it is recommended to remove the plugin. Either way, you can activate the Player development tools by clicking on the extension popup and refreshing the page."
      );
      return;
    }

    // Config
    this.playerConfig = {
      version: player.getVersion(),
      plugins: player.getPlugins().map((plugin) => plugin.name),
    };

    // Data
    player.hooks.dataController.tap(this.name, (dataController) => {
      dataController.hooks.onUpdate.tap(this.name, (updates) => {
        const newPlayerState = produce(this.data, (draft) => {
          updates.forEach(({ binding, newValue }) => {
            dset(draft, ["data", ...binding.asArray()], newValue);
          });
        });
        this.data = newPlayerState;
      });
    });

    // Logs
    player.logger.hooks.log.tap(this.name, (severity, message) => {
      this.logs = [...this.logs, { severity, message }];
    });

    // Flow
    player.hooks.onStart.tap(this.name, (f) => {
      this.flow = f;
    });

    // View
    player.hooks.view.tap(this.name, (view) => {
      this.view = new WeakRef(view);
    });

    // Expression evaluator
    player.hooks.expressionEvaluator.tap(this.name, (evaluator) => {
      this.expressionEvaluator = new WeakRef(evaluator);
    });
  }

  applyReact(reactPlayer: ReactPlayer) {
    if (!this.checkIfDevtoolsIsActive()) {
      return;
    }

    // eslint-disable-next-line react/display-name
    reactPlayer.hooks.webComponent.tap(this.name, (Comp) => () => {
      const Component = Comp as React.FC;

      return (
        <WrapperComponent
          playerConfig={this.playerConfig}
          data={this.data}
          logs={this.logs}
          flow={this.flow}
          view={this.view}
          expressionEvaluator={this.expressionEvaluator}
        >
          <Component />
        </WrapperComponent>
      );
    });
  }
}
