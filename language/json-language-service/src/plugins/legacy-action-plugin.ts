import { DiagnosticSeverity } from "vscode-languageserver-types";
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from "..";
import type { ASTNode } from "../parser";
import { getNodeValue } from "../parser";
import type { ASTVisitor, ValidationContext } from "../types";

/** Create an AST visitor for checking the legacy action */
function createRuleVisitor(context: ValidationContext): ASTVisitor {
  /** Check if a node is using the action asset or not */
  const checkForLegacyAction = (node: ASTNode) => {
    if (node.type === "asset") {
      return;
    }

    if (
      node.type === "object" &&
      !node.properties.some(
        (p) =>
          p.keyNode.value === "asset" ||
          p.keyNode.value === "dynamicSwitch" ||
          p.keyNode.value === "staticSwitch"
      )
    ) {
      context.addViolation({
        message: "Migrate to an action-asset",
        node,
        severity: DiagnosticSeverity.Warning,
        fix: () => {
          const newActionAsset = {
            asset: {
              type: "action",
              ...getNodeValue(node),
            },
          };

          return {
            name: "Convert to Asset",
            edit: {
              type: "replace",
              node,
              value: JSON.stringify(newActionAsset, null, 2),
            },
          };
        },
      });
    }
  };

  return {
    ViewNode: (viewNode) => {
      // Check for an `actions` array of non-assets

      const actionsProp = viewNode.properties.find(
        (p) => p.keyNode.value === "actions"
      );

      if (!actionsProp || actionsProp.valueNode?.type !== "array") {
        return;
      }

      // Go through the array and add a violation/fix for anything that's not an asset

      actionsProp.valueNode.children.forEach((action) => {
        checkForLegacyAction(action);
      });
    },
  };
}

/** A plugin that validates and corrects the usage of non-asset actions in a view */
export class LegacyActionPlugin implements PlayerLanguageServicePlugin {
  name = "legacy-action";

  apply(service: PlayerLanguageService) {
    service.hooks.validate.tap(this.name, async (ctx, validationContext) => {
      validationContext.useASTVisitor(createRuleVisitor(validationContext));
    });
  }
}
