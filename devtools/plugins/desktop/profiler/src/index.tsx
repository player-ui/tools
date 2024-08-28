import type { ReactPlayer, ReactPlayerPlugin } from "@player-ui/react";
import React from "react";
import { PLUGIN_ID } from "./constants";
import { ProfilerNode } from "./types";
import { WrapperComponent } from "./WrapperComponent";
import { profiler } from "./helpers";

export class ProfilerPlugin implements ReactPlayerPlugin {
  private id: string;

  constructor(id?: string) {
    this.id = id ?? "default-id";
  }

  name = PLUGIN_ID;

  checkIfDevtoolsIsActive() {
    return localStorage.getItem("player-ui-devtools-active") === "true";
  }

  applyReact({ player, hooks: { webComponent } }: ReactPlayer) {
    if (!this.checkIfDevtoolsIsActive()) {
      return;
    }

    const { start, startTimer, endTimer, stopProfiler } = profiler();

    /** function to tap into hooks and start the profiler */
    const startProfiler = () => {
      start();

      player.hooks.onStart.intercept({
        call: () => {
          startTimer("onStart");
        },
      });

      player.hooks.onStart.tap(this.name, () => {
        endTimer({ hookName: "onStart" });
      });

      player.hooks.flowController.intercept({
        call: (fc) => {
          startTimer("flowController");
          fc.hooks.flow.intercept({
            call: () => {
              startTimer("flow");
            },
          });
        },
      });

      player.hooks.flowController.tap(this.name, (fc) => {
        let flowControllerNode: ProfilerNode = {
          name: "flowController",
          children: [],
        };

        fc.hooks.flow.tap(this.name, () => {
          endTimer({ hookName: "flow", parentNode: flowControllerNode });
        });

        flowControllerNode = endTimer({
          hookName: flowControllerNode.name,
          children: flowControllerNode.children,
        });
      });

      player.hooks.viewController.intercept({
        call: (vc) => {
          startTimer("viewController");
          vc.hooks.resolveView.intercept({
            call: () => {
              startTimer("resolveView");
            },
          });
          vc.hooks.view.intercept({
            call: () => {
              startTimer("view");
            },
          });
        },
      });

      player.hooks.viewController.tap(this.name, (vc) => {
        let viewControllerNode: ProfilerNode = {
          name: "viewController",
          children: [],
        };

        vc.hooks.resolveView.tap(this.name, (asset) => {
          endTimer({ hookName: "resolveView", parentNode: viewControllerNode });
          return asset;
        });

        viewControllerNode = endTimer({
          hookName: viewControllerNode.name,
          children: viewControllerNode.children,
        });
      });

      player.hooks.view.intercept({
        call: (view) => {
          startTimer("view");

          view.hooks.onUpdate.intercept({
            call: () => {
              startTimer("onUpdate");
            },
          });

          view.hooks.parser.intercept({
            call: () => {
              startTimer("parser");
            },
          });

          view.hooks.resolver.intercept({
            call: () => {
              startTimer("resolver");
            },
          });

          view.hooks.templatePlugin.intercept({
            call: () => {
              startTimer("templatePlugin");
            },
          });
        },
      });

      player.hooks.view.tap(this.name, (view) => {
        let viewNode: ProfilerNode = {
          name: "view",
          children: [],
        };

        view.hooks.onUpdate.tap(this.name, () => {
          endTimer({ hookName: "onUpdate", parentNode: viewNode });
        });

        view.hooks.parser.tap(this.name, () => {
          endTimer({ hookName: "parser", parentNode: viewNode });
        });

        view.hooks.resolver.tap(this.name, () => {
          endTimer({ hookName: "resolver", parentNode: viewNode });
        });

        view.hooks.templatePlugin.tap(this.name, () => {
          endTimer({ hookName: "templatePlugin", parentNode: viewNode });
        });

        viewNode = endTimer({
          hookName: viewNode.name,
          children: viewNode.children,
        });
      });

      player.hooks.expressionEvaluator.intercept({
        call: (ev) => {
          startTimer("expressionEvaluator");

          ev.hooks.resolve.intercept({
            call: () => {
              startTimer("resolve");
            },
          });

          ev.hooks.onError.intercept({
            call: () => {
              startTimer("onError");
            },
          });
        },
      });

      player.hooks.expressionEvaluator.tap(this.name, (ev) => {
        let expressionEvaluatorNode: ProfilerNode = {
          name: "expressionEvaluator",
          children: [],
        };

        ev.hooks.resolve.tap(this.name, () => {
          endTimer({
            hookName: "resolve",
            parentNode: expressionEvaluatorNode,
          });
        });

        ev.hooks.onError.tap(this.name, () => {
          endTimer({
            hookName: "onError",
            parentNode: expressionEvaluatorNode,
          });
          return undefined;
        });

        expressionEvaluatorNode = endTimer({
          hookName: expressionEvaluatorNode.name,
          children: expressionEvaluatorNode.children,
        });
      });

      player.hooks.dataController.intercept({
        call: (dc) => {
          startTimer("dataController");

          dc.hooks.resolve.intercept({
            call: () => {
              startTimer("resolve");
            },
          });
          dc.hooks.resolveDataStages.intercept({
            call: () => {
              startTimer("resolveDataStages");
            },
          });
          dc.hooks.resolveDefaultValue.intercept({
            call: () => {
              startTimer("resolveDefaultValue");
            },
          });
          dc.hooks.onDelete.intercept({
            call: () => {
              startTimer("onDelete");
            },
          });
          dc.hooks.onSet.intercept({
            call: () => {
              startTimer("onSet");
            },
          });
          dc.hooks.onGet.intercept({
            call: () => {
              startTimer("onGet");
            },
          });
          dc.hooks.onUpdate.intercept({
            call: () => {
              startTimer("onUpdate");
            },
          });
          dc.hooks.format.intercept({
            call: () => {
              startTimer("resolve");
            },
          });
          dc.hooks.deformat.intercept({
            call: () => {
              startTimer("deformat");
            },
          });
          dc.hooks.serialize.intercept({
            call: () => {
              startTimer("serialize");
            },
          });
        },
      });

      player.hooks.dataController.tap(this.name, (dc) => {
        let dataControllerNode: ProfilerNode = {
          name: "dataController",
          children: [],
        };

        dc.hooks.resolve.tap(this.name, () => {
          endTimer({ hookName: "resolve", parentNode: dataControllerNode });
        });

        dc.hooks.resolveDataStages.tap(this.name, (dataPipeline) => {
          endTimer({
            hookName: "resolveDataStages",
            parentNode: dataControllerNode,
          });
          return dataPipeline;
        });

        dc.hooks.resolveDefaultValue.tap(this.name, () => {
          endTimer({
            hookName: "resolveDefaultValue",
            parentNode: dataControllerNode,
          });
        });

        dc.hooks.onDelete.tap(this.name, () => {
          endTimer({ hookName: "onDelete", parentNode: dataControllerNode });
        });

        dc.hooks.onSet.tap(this.name, () => {
          endTimer({ hookName: "onSet", parentNode: dataControllerNode });
        });

        dc.hooks.onGet.tap(this.name, () => {
          endTimer({ hookName: "onGet", parentNode: dataControllerNode });
        });

        dc.hooks.onUpdate.tap(this.name, () => {
          endTimer({ hookName: "onUpdate", parentNode: dataControllerNode });
        });

        dc.hooks.format.tap(this.name, () => {
          endTimer({ hookName: "format", parentNode: dataControllerNode });
        });

        dc.hooks.deformat.tap(this.name, () => {
          endTimer({ hookName: "deformat", parentNode: dataControllerNode });
        });

        dc.hooks.serialize.tap(this.name, () => {
          endTimer({ hookName: "serialize", parentNode: dataControllerNode });
        });

        dataControllerNode = endTimer({
          hookName: dataControllerNode.name,
          children: dataControllerNode.children,
        });
      });

      player.hooks.schema.intercept({
        call: (sc) => {
          startTimer("schema");
          sc.hooks.resolveTypeForBinding.intercept({
            call: () => {
              startTimer("resolveTypeForBinding");
            },
          });
        },
      });

      player.hooks.schema.tap(this.name, (sc) => {
        let schemaNode: ProfilerNode = {
          name: "schema",
          children: [],
        };

        sc.hooks.resolveTypeForBinding.tap(this.name, (dataType) => {
          endTimer({
            hookName: "resolveTypeForBinding",
            parentNode: schemaNode,
          });
          return dataType;
        });

        schemaNode = endTimer({
          hookName: schemaNode.name,
          children: schemaNode.children,
        });
      });

      player.hooks.validationController.intercept({
        call: (vc) => {
          startTimer("validationController");

          vc.hooks.createValidatorRegistry.intercept({
            call: () => {
              startTimer("createValidatorRegistry");
            },
          });
          vc.hooks.onAddValidation.intercept({
            call: () => {
              startTimer("onAddValidation");
            },
          });
          vc.hooks.onRemoveValidation.intercept({
            call: () => {
              startTimer("onRemoveValidation");
            },
          });
        },
      });

      player.hooks.validationController.tap(this.name, (vc) => {
        let validationControllerNode: ProfilerNode = {
          name: "validationController",
          children: [],
        };

        vc.hooks.createValidatorRegistry.tap(this.name, () => {
          endTimer({
            hookName: "createValidatorRegistry",
            parentNode: validationControllerNode,
          });
        });

        vc.hooks.onAddValidation.tap(this.name, (validationResponse) => {
          endTimer({
            hookName: "onAddValidation",
            parentNode: validationControllerNode,
          });
          return validationResponse;
        });

        vc.hooks.onRemoveValidation.tap(this.name, (validationResponse) => {
          endTimer({
            hookName: "onRemoveValidation",
            parentNode: validationControllerNode,
          });
          return validationResponse;
        });

        validationControllerNode = endTimer({
          hookName: validationControllerNode.name,
          children: validationControllerNode.children,
        });
      });

      player.hooks.bindingParser.intercept({
        call: (bp) => {
          startTimer("bindingParser");
          bp.hooks.skipOptimization.intercept({
            call: () => {
              startTimer("skipOptimization");
            },
          });
          bp.hooks.beforeResolveNode.intercept({
            call: () => {
              startTimer("beforeResolveNode");
            },
          });
        },
      });

      player.hooks.bindingParser.tap(this.name, (bp) => {
        let bindingParserNode: ProfilerNode = {
          name: "bindingParser",
          children: [],
        };

        bp.hooks.skipOptimization.tap(this.name, () => {
          endTimer({
            hookName: "skipOptimization",
            parentNode: bindingParserNode,
          });
          return undefined;
        });
        bp.hooks.beforeResolveNode.tap(this.name, (node) => {
          endTimer({
            hookName: "beforeResolveNode",
            parentNode: bindingParserNode,
          });
          return node;
        });

        bindingParserNode = endTimer({
          hookName: bindingParserNode.name,
          children: bindingParserNode.children,
        });
      });

      player.hooks.state.intercept({
        call: () => {
          startTimer("state");
        },
      });

      player.hooks.state.tap(this.name, () => {
        endTimer({ hookName: "state" });
      });

      player.hooks.onEnd.intercept({
        call: () => {
          startTimer("onEnd");
        },
      });

      player.hooks.onEnd.tap(this.name, () => {
        endTimer({ hookName: "onEnd" });
      });

      player.hooks.resolveFlowContent.intercept({
        call: () => {
          startTimer("resolveFlowContent");
        },
      });

      player.hooks.resolveFlowContent.tap(this.name, (flow) => {
        endTimer({ hookName: "resolveFlowContent" });
        return flow;
      });
    };

    // eslint-disable-next-line react/display-name
    webComponent.tap(this.name, (Comp) => () => {
      return (
        <WrapperComponent
          startProfiler={startProfiler}
          stopProfiler={stopProfiler}
          id={this.id}
        >
          <Comp />
        </WrapperComponent>
      );
    });
  }
}
