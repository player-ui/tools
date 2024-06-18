import type { NodeType } from "@player-tools/xlr";
import { DiagnosticSeverity } from "vscode-languageserver-types";
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from "..";
import type { ASTNode, StringASTNode } from "../parser";
import { getNodeValue } from "../parser";
import { formatLikeNode } from "../utils";

/** Check if the node is defined within a view */
const isInView = (node: ASTNode): boolean => {
  if (node.type === "view") {
    return true;
  }

  if (!node.parent) {
    return false;
  }

  return isInView(node.parent);
};

/**
 * Checks to see if there is an AssetWrapper ref node somewhere at this level
 *
 * - @param nodes Array of nodes to check for an AssetWrapper ref
 */
const checkTypesForAssetWrapper = (nodes: Array<NodeType>): boolean => {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === "object" && node.title?.includes("AssetWrapper")) {
      return true;
    } else if (node.type === "or") {
      return checkTypesForAssetWrapper(node.or);
    } else if (node.type === "and") {
      return checkTypesForAssetWrapper(node.and);
    }
  }

  return false;
};

/**
 * Checks to see if the array's parent property is a switch statement
 */
const checkSwitchCase = (node: StringASTNode): boolean => {
  return node.value === "staticSwitch" || node.value === "dynamicSwitch";
};

/**
 * Looks for an array where there _should_ be an AssetWrapper
 */
export class AssetWrapperArrayPlugin implements PlayerLanguageServicePlugin {
  name = "asset-wrapper-to-array";

  apply(service: PlayerLanguageService) {
    service.hooks.validate.tap(
      this.name,
      async (documentInfo, validationContext) => {
        validationContext.useASTVisitor({
          ArrayNode: async (arrayNode) => {
            if (!isInView(arrayNode)) {
              return;
            }

            const xlrInfo = service.XLRService.getTypeInfoAtPosition(arrayNode);
            if (!xlrInfo) return;

            const isAssetWrapper = checkTypesForAssetWrapper(xlrInfo.nodes);

            const parentNode = arrayNode.parent;

            if (parentNode?.type !== "property") {
              return;
            }

            const targetLabel = parentNode.keyNode;

            // manual check because switch types have arrays of asset wrappers but don't extend asset wrapper
            const isSwitchCase = checkSwitchCase(targetLabel);

            if (isAssetWrapper && !isSwitchCase) {
              // This is an array node that _should_ be an asset wrapper.
              // Convert it to a collection

              let newAsset = {
                asset: {
                  id: "",
                  type: "collection",
                  values: getNodeValue(arrayNode),
                },
              };

              if (arrayNode.children.length === 1) {
                newAsset = getNodeValue(arrayNode.children[0]);
              }

              validationContext.addViolation({
                node: targetLabel,
                severity: DiagnosticSeverity.Error,
                message: `Implicit Array -> "collection" assets is not supported.`,
                fix: () => {
                  return {
                    name: `Convert to ${
                      arrayNode.children.length > 0 ? "collection" : "asset"
                    }`,
                    edit: {
                      type: "replace",
                      node: arrayNode,
                      value: formatLikeNode(
                        documentInfo.document,
                        arrayNode,
                        newAsset
                      ),
                    },
                  };
                },
              });
            }
          },
        });
      }
    );
  }
}
