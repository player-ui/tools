import { DiagnosticSeverity } from "vscode-languageserver-types";
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from "..";
import type { ASTNode, ObjectASTNode } from "../parser";
import {
  getNodeValue,
  isKeyNode,
  isObjectNode,
  isPropertyNode,
} from "../parser";
import { formatLikeNode } from "../utils";

/** Get the JSON object that the validation targets */
const getObjectTarget = (node?: ASTNode): ObjectASTNode | undefined => {
  if (isObjectNode(node)) {
    return node;
  }

  if (
    isKeyNode(node) &&
    isPropertyNode(node.parent) &&
    isObjectNode(node.parent.valueNode)
  ) {
    return node.parent.valueNode;
  }
};

/**
 * A plugin to help identify and fix the issue of forgetting the "asset" wrapper object
 */
export class MissingAssetWrapperPlugin implements PlayerLanguageServicePlugin {
  name = "missing-asset-wrapper";

  apply(languageService: PlayerLanguageService): void {
    languageService.hooks.onValidateEnd.tap(
      this.name,
      (diagnostics, { addFixableViolation, documentContext }) => {
        // Just be naive here
        // If there's an error for "expected asset" + an unexpected `id` and `type`, replace that with our own

        let filteredDiags = diagnostics;

        const expectedAssetDiags = filteredDiags.filter((d) => {
          const originalNode = documentContext.PlayerContent.getNodeFromOffset(
            documentContext.document.offsetAt(d.range.start)
          );

          if (!originalNode) {
            return false;
          }

          const isAssetWrapperOrSwitch =
            documentContext.PlayerContent.getXLRNode?.name ===
            "AssetWrapperOrSwitch";

          // If it's missing, then it should return the proper diagnostics
          if (!isAssetWrapperOrSwitch) {
            return true;
          }

          const hasAssetProperty =
            originalNode.jsonNode.type === "object" &&
            originalNode.jsonNode.children?.some(
              (child) =>
                child.type === "property" &&
                child.children?.[0]?.value === "asset"
            );

          return !hasAssetProperty;
        });

        expectedAssetDiags.forEach((d) => {
          const originalNode = documentContext.PlayerContent.getNodeFromOffset(
            documentContext.document.offsetAt(d.range.start)
          );

          const objectNode = getObjectTarget(originalNode);

          if (objectNode && originalNode) {
            // This "expected property" diag is for the key of a property, where the value is the stubbed out asset
            // Check for diags for keys in that nested object

            // Now group the other diagnostics that are for unexpected props underneath that object
            // We"ll suppress these for now since they are bound to be wrong until they"re wrapped in an asset
            const associatedDiags = filteredDiags.filter((nestedDiag) => {
              const diagNode = documentContext.PlayerContent.getNodeFromOffset(
                documentContext.document.offsetAt(nestedDiag.range.start)
              );

              return objectNode.properties.some((p) => p.keyNode === diagNode);
            });

            addFixableViolation(d, {
              node: originalNode,
              message: d.message,
              severity: d.severity ?? DiagnosticSeverity.Error,
              fix: () => ({
                name: `Wrap in "asset"`,
                edit: {
                  type: "replace",
                  node: objectNode,
                  value: formatLikeNode(documentContext.document, objectNode, {
                    asset: getNodeValue(objectNode),
                  }),
                },
              }),
            });

            filteredDiags = filteredDiags.filter(
              (filteredD) => !associatedDiags.includes(filteredD)
            );
          }
        });

        return filteredDiags;
      }
    );
  }
}
