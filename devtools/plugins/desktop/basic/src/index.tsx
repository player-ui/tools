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

  logs: {
    severity: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    message: any;
  }[] = [];

  flow?: Flow;

  expressionEvaluator?: WeakRef<ExpressionEvaluator>;

  view?: WeakRef<ViewInstance>;

  dataController?: WeakRef<DataController>;

  apply(player: Player) {
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
    // eslint-disable-next-line react/display-name
    reactPlayer.hooks.webComponent.tap(this.name, (Comp) => () => {
      const Component = Comp as React.FC;

      return (
        <WrapperComponent
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
