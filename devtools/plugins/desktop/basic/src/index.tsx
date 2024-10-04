import type {
  DataController,
  ExpressionEvaluator,
  Flow,
  Player,
  ReactPlayer,
  ReactPlayerPlugin,
  ViewInstance,
} from "@player-ui/react";
import set from "lodash.set";
import { merge } from "ts-deepmerge";
import { produce } from "immer";
import React from "react";
import { WrapperComponent } from "./WrapperComponent";
import { PLUGIN_ID, PLUGIN_INACTIVE_WARNING } from "./constants";

/** Taps into the Player and ReactPlayer hooks and leverage the WrapperComponent to define and process the content. */
export class BasicWevDevtoolsPlugin implements ReactPlayerPlugin {
  private id: string;

  constructor(id?: string) {
    this.id = id ?? "default-id";
  }

  name = PLUGIN_ID;

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

  overrideFlow?: ReactPlayer["start"];

  checkIfDevtoolsIsActive() {
    return localStorage.getItem("player-ui-devtools-active") === "true";
  }

  apply(player: Player) {
    if (!this.checkIfDevtoolsIsActive()) {
      console.log(PLUGIN_INACTIVE_WARNING);
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
            set(draft, ["data", ...binding.asArray()], newValue);
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

    // Override flow
    this.overrideFlow = player.start.bind(player);
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
          overrideFlow={this.overrideFlow}
          expressionEvaluator={this.expressionEvaluator}
          id={this.id}
        >
          <Component />
        </WrapperComponent>
      );
    });
  }
}
