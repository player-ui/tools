import { addLast, omit, set } from "timm";
import { DiagnosticSeverity } from "vscode-languageserver-types";
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from "..";
import type { AssetASTNode, ObjectASTNode, ViewASTNode } from "../parser";
import { getNodeValue } from "../parser";
import type {
  ASTVisitor,
  DocumentContext,
  ValidationContext,
  Violation,
} from "../types";
import { formatLikeNode } from "../utils";

/** Create a visitor for handling old template syntax */
function createRuleVisitor(
  context: ValidationContext,
  docInfo: DocumentContext
): ASTVisitor {
  /** Check a node for any signs of a legacy-template */
  const checkForLegacyTemplate = (
    node: ObjectASTNode | AssetASTNode | ViewASTNode
  ) => {
    // check if it has any of the 3 props we care about

    const templateDataProp = node.properties.find(
      (p) => p.keyNode.value === "templateData"
    );
    const templateValueProp = node.properties.find(
      (p) => p.keyNode.value === "template"
    );
    const templateOutputProp = node.properties.find(
      (p) => p.keyNode.value === "templateOutput"
    );

    // If we don't have any of those props, or we just have the`template` prop and it points to an array, skip it all, we good.
    if (
      !templateDataProp &&
      !templateOutputProp &&
      (!templateValueProp || templateValueProp.valueNode?.type === "array")
    ) {
      return;
    }

    const templateViolation: Omit<Violation, "node"> = {
      severity: DiagnosticSeverity.Error,
      message: `Migrate to the template[] syntax.`,
      fix: () => {
        // Create the new template object;
        const path = [
          "template",
          templateValueProp?.valueNode?.type === "array"
            ? templateValueProp.valueNode.children.length
            : 0,
        ];

        const newTemplateObj = {
          value:
            templateValueProp?.valueNode?.type !== "array" &&
            templateValueProp?.valueNode
              ? getNodeValue(templateValueProp?.valueNode)
              : {},
          output: templateOutputProp?.valueNode?.jsonNode.value ?? "",
          data: templateDataProp?.valueNode?.jsonNode.value ?? "",
        };

        const oldValue = getNodeValue(node);
        let newValue = omit(oldValue, "templateData");
        newValue = omit(newValue, "templateOutput");

        if (templateValueProp?.valueNode?.type !== "array") {
          newValue = omit(newValue, "template");
        }

        newValue = set(
          newValue,
          "template",
          addLast(newValue.template ?? [], newTemplateObj)
        );

        return {
          edit: {
            type: "replace",
            path,
            node,
            value: formatLikeNode(docInfo.document, node, newValue),
          },
          name: "Convert to template[]",
        };
      },
    };

    if (templateDataProp) {
      context.addViolation({
        ...templateViolation,
        node: templateDataProp,
      });
    }

    if (templateOutputProp) {
      context.addViolation({
        ...templateViolation,
        node: templateOutputProp,
      });
    }
  };

  return {
    ViewNode: checkForLegacyTemplate,
    AssetNode: checkForLegacyTemplate,
    ObjectNode: checkForLegacyTemplate,
  };
}

/** A plugin that handles the old legacy template syntax */
export class LegacyTemplatePlugin implements PlayerLanguageServicePlugin {
  name = "legacy-template";

  apply(service: PlayerLanguageService) {
    service.hooks.validate.tap(this.name, async (ctx, validationContext) => {
      validationContext.useASTVisitor(
        createRuleVisitor(validationContext, ctx)
      );
    });
  }
}
