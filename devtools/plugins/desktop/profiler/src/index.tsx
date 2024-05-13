import type { ReactPlayer, ReactPlayerPlugin } from "@player-ui/react";
import React from "react";
import { PLUGIN_ID } from "./constants";
import { ProfilerNode } from "./types";
import { WrapperComponent } from "./WrapperComponent";

export class ProfilerPlugin implements ReactPlayerPlugin {
  name = PLUGIN_ID;

  checkIfDevtoolsIsActive() {
    return localStorage.getItem("player-ui-devtools-active") === "true";
  }

  applyReact({ player, hooks: { webComponent } }: ReactPlayer) {
    if (!this.checkIfDevtoolsIsActive()) {
      return;
    }

    const rootNode: ProfilerNode = {
      name: "root",
      children: [],
    };

    const record: { [key: string]: number[] } = {};

    let tapped = false;

    /** add newNode to its parent's children array */
    const addNodeToTree = (newNode: ProfilerNode, parentNode: ProfilerNode) => {
      parentNode.children.push(newNode);
      return newNode;
    };

    /** start timer and save start time in the record */
    const startTimer = (
      hookName: string,
      record: { [key: string]: number[] }
    ) => {
      /**
       * TODO: use context to pass start times
       * once tapable supports ts types for context property
       */
      const startTime = performance.now();
      if (!record[hookName] || record[hookName].length === 2) {
        // eslint-disable-next-line no-param-reassign
        record[hookName] = [];
        record[hookName].push(startTime);
      }
    };

    /** end timer and calculate duration */
    const endTimer = (
      hookName: string,
      record: { [key: string]: number[] },
      parentNode: ProfilerNode,
      children?: ProfilerNode[]
    ) => {
      let startTime;
      let duration;
      const endTime = performance.now();
      for (const key in record) {
        if (key === hookName && record[key].length === 1) {
          [startTime] = record[key];
          duration = endTime - startTime;
          record[key].push(endTime);
        }
      }

      const newNode: ProfilerNode = {
        name: hookName,
        startTime,
        endTime,
        value: duration === 0 ? 0.01 : duration,
        tooltip: `${hookName}, ${duration?.toFixed(4)} (ms)`,
        children: children ?? [],
      };

      addNodeToTree(newNode, parentNode);

      return newNode;
    };

    /** function to tap into hooks and start the profiler */
    const startProfiler = () => {
      // reset root node if profilers are already tapped
      if (tapped) {
        rootNode.children = [];
      }

      tapped = true;

      player.hooks.onStart.intercept({
        call: () => {
          startTimer("onStart", record);
        },
      });

      player.hooks.onStart.tap(this.name, () => {
        endTimer("onStart", record, rootNode);
      });

      player.hooks.flowController.intercept({
        call: (fc) => {
          startTimer("flowController", record);
          fc.hooks.flow.intercept({
            call: () => {
              startTimer("flow", record);
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
          endTimer("flow", record, flowControllerNode);
        });

        flowControllerNode = endTimer(
          flowControllerNode.name,
          record,
          rootNode,
          flowControllerNode.children
        );
      });

      player.hooks.viewController.intercept({
        call: (vc) => {
          startTimer("viewController", record);
          vc.hooks.resolveView.intercept({
            call: () => {
              startTimer("resolveView", record);
            },
          });
          vc.hooks.view.intercept({
            call: () => {
              startTimer("view", record);
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
          endTimer("resolveView", record, viewControllerNode);
          return asset;
        });

        viewControllerNode = endTimer(
          viewControllerNode.name,
          record,
          rootNode,
          viewControllerNode.children
        );
      });

      player.hooks.view.intercept({
        call: (view) => {
          startTimer("view", record);

          view.hooks.onUpdate.intercept({
            call: () => {
              startTimer("onUpdate", record);
            },
          });

          view.hooks.parser.intercept({
            call: () => {
              startTimer("parser", record);
            },
          });

          view.hooks.resolver.intercept({
            call: () => {
              startTimer("resolver", record);
            },
          });

          view.hooks.templatePlugin.intercept({
            call: () => {
              startTimer("templatePlugin", record);
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
          endTimer("onUpdate", record, viewNode);
        });

        view.hooks.parser.tap(this.name, () => {
          endTimer("parser", record, viewNode);
        });

        view.hooks.resolver.tap(this.name, () => {
          endTimer("resolver", record, viewNode);
        });

        view.hooks.templatePlugin.tap(this.name, () => {
          endTimer("templatePlugin", record, viewNode);
        });

        viewNode = endTimer(viewNode.name, record, rootNode, viewNode.children);
      });

      player.hooks.expressionEvaluator.intercept({
        call: (ev) => {
          startTimer("expressionEvaluator", record);

          ev.hooks.resolve.intercept({
            call: () => {
              startTimer("resolve", record);
            },
          });

          ev.hooks.onError.intercept({
            call: () => {
              startTimer("onError", record);
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
          endTimer("resolve", record, expressionEvaluatorNode);
        });

        ev.hooks.onError.tap(this.name, () => {
          endTimer("onError", record, expressionEvaluatorNode);
          return undefined;
        });

        expressionEvaluatorNode = endTimer(
          expressionEvaluatorNode.name,
          record,
          rootNode,
          expressionEvaluatorNode.children
        );
      });

      player.hooks.dataController.intercept({
        call: (dc) => {
          startTimer("dataController", record);

          dc.hooks.resolve.intercept({
            call: () => {
              startTimer("resolve", record);
            },
          });
          dc.hooks.resolveDataStages.intercept({
            call: () => {
              startTimer("resolveDataStages", record);
            },
          });
          dc.hooks.resolveDefaultValue.intercept({
            call: () => {
              startTimer("resolveDefaultValue", record);
            },
          });
          dc.hooks.onDelete.intercept({
            call: () => {
              startTimer("onDelete", record);
            },
          });
          dc.hooks.onSet.intercept({
            call: () => {
              startTimer("onSet", record);
            },
          });
          dc.hooks.onGet.intercept({
            call: () => {
              startTimer("onGet", record);
            },
          });
          dc.hooks.onUpdate.intercept({
            call: () => {
              startTimer("onUpdate", record);
            },
          });
          dc.hooks.format.intercept({
            call: () => {
              startTimer("resolve", record);
            },
          });
          dc.hooks.deformat.intercept({
            call: () => {
              startTimer("deformat", record);
            },
          });
          dc.hooks.serialize.intercept({
            call: () => {
              startTimer("serialize", record);
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
          endTimer("resolve", record, dataControllerNode);
        });

        dc.hooks.resolveDataStages.tap(this.name, (dataPipeline) => {
          endTimer("resolveDataStages", record, dataControllerNode);
          return dataPipeline;
        });

        dc.hooks.resolveDefaultValue.tap(this.name, () => {
          endTimer("resolveDefaultValue", record, dataControllerNode);
        });

        dc.hooks.onDelete.tap(this.name, () => {
          endTimer("onDelete", record, dataControllerNode);
        });

        dc.hooks.onSet.tap(this.name, () => {
          endTimer("onSet", record, dataControllerNode);
        });

        dc.hooks.onGet.tap(this.name, () => {
          endTimer("onGet", record, dataControllerNode);
        });

        dc.hooks.onUpdate.tap(this.name, () => {
          endTimer("onUpdate", record, dataControllerNode);
        });

        dc.hooks.format.tap(this.name, () => {
          endTimer("format", record, dataControllerNode);
        });

        dc.hooks.deformat.tap(this.name, () => {
          endTimer("deformat", record, dataControllerNode);
        });

        dc.hooks.serialize.tap(this.name, () => {
          endTimer("serialize", record, dataControllerNode);
        });

        dataControllerNode = endTimer(
          dataControllerNode.name,
          record,
          rootNode,
          dataControllerNode.children
        );
      });

      player.hooks.schema.intercept({
        call: (sc) => {
          startTimer("schema", record);
          sc.hooks.resolveTypeForBinding.intercept({
            call: () => {
              startTimer("resolveTypeForBinding", record);
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
          endTimer("resolveTypeForBinding", record, schemaNode);
          return dataType;
        });

        schemaNode = endTimer(
          schemaNode.name,
          record,
          rootNode,
          schemaNode.children
        );
      });

      player.hooks.validationController.intercept({
        call: (vc) => {
          startTimer("validationController", record);

          vc.hooks.createValidatorRegistry.intercept({
            call: () => {
              startTimer("createValidatorRegistry", record);
            },
          });
          vc.hooks.onAddValidation.intercept({
            call: () => {
              startTimer("onAddValidation", record);
            },
          });
          vc.hooks.onRemoveValidation.intercept({
            call: () => {
              startTimer("onRemoveValidation", record);
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
          endTimer("createValidatorRegistry", record, validationControllerNode);
        });

        vc.hooks.onAddValidation.tap(this.name, (validationResponse) => {
          endTimer("onAddValidation", record, validationControllerNode);
          return validationResponse;
        });

        vc.hooks.onRemoveValidation.tap(this.name, (validationResponse) => {
          endTimer("onRemoveValidation", record, validationControllerNode);
          return validationResponse;
        });

        validationControllerNode = endTimer(
          validationControllerNode.name,
          record,
          rootNode,
          validationControllerNode.children
        );
      });

      player.hooks.bindingParser.intercept({
        call: (bp) => {
          startTimer("bindingParser", record);
          bp.hooks.skipOptimization.intercept({
            call: () => {
              startTimer("skipOptimization", record);
            },
          });
          bp.hooks.beforeResolveNode.intercept({
            call: () => {
              startTimer("beforeResolveNode", record);
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
          endTimer("skipOptimization", record, bindingParserNode);
          return undefined;
        });
        bp.hooks.beforeResolveNode.tap(this.name, (node) => {
          endTimer("beforeResolveNode", record, bindingParserNode);
          return node;
        });

        bindingParserNode = endTimer(
          bindingParserNode.name,
          record,
          rootNode,
          bindingParserNode.children
        );
      });

      player.hooks.state.intercept({
        call: () => {
          startTimer("state", record);
        },
      });

      player.hooks.state.tap(this.name, () => {
        endTimer("state", record, rootNode);
      });

      player.hooks.onEnd.intercept({
        call: () => {
          startTimer("onEnd", record);
        },
      });

      player.hooks.onEnd.tap(this.name, () => {
        endTimer("onEnd", record, rootNode);
      });

      player.hooks.resolveFlowContent.intercept({
        call: () => {
          startTimer("resolveFlowContent", record);
        },
      });

      player.hooks.resolveFlowContent.tap(this.name, (flow) => {
        endTimer("resolveFlowContent", record, rootNode);
        return flow;
      });
    };

    const stopProfiler = () => {
      /**
       * TODO: untap from the hooks once repo is migrated to use tapable-ts
       * that supports untapping
       */
      rootNode.endTime = performance.now();
      if (rootNode.startTime) {
        const duration = rootNode.endTime - rootNode.startTime;
        rootNode.value = duration / 1000;
        rootNode.tooltip = `${rootNode.name}, ${duration.toFixed(4)} (ms)`;
      }
      return rootNode;
    };

    // eslint-disable-next-line react/display-name
    webComponent.tap(this.name, (Comp) => () => {
      return (
        <WrapperComponent
          startProfiler={startProfiler}
          stopProfiler={stopProfiler}
        >
          <Comp />
        </WrapperComponent>
      );
    });
  }
}
