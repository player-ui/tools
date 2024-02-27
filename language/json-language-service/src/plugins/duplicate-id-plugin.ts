import { DiagnosticSeverity } from "vscode-languageserver-types";
import type { AssetASTNode, ASTNode, ViewASTNode } from "../parser";
import { getViewNode, replaceString } from "../parser";
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from "..";
import type { Violation, ValidationContext, ASTVisitor } from "../types";

/** Create an id for the node given it's path */
const generateID = (node?: ASTNode): string => {
  if (!node || node.type === "view") {
    return "";
  }

  const prefix = generateID(node.parent);
  let current = "";

  if (node.type === "property") {
    current = node.keyNode.value;
  } else if (node.type === "asset" && node.assetType?.valueNode?.value) {
    current = node.assetType.valueNode?.value;
  }

  return [prefix, current].filter(Boolean).join("-");
};

/** Create a duplicate id violation for the given node */
const createViolation = (node: AssetASTNode): Violation | undefined => {
  const valueNode = node.id?.valueNode;

  if (!valueNode) {
    return;
  }

  return {
    node: valueNode,
    severity: DiagnosticSeverity.Error,
    message: `The id "${node.id?.valueNode?.value}" is already in use in this view.`,
    fix: () => {
      return {
        name: "Generate new ID",
        edit: replaceString(valueNode, `"${generateID(node)}"`),
      };
    },
  };
};

/** visit each of the assets in a view and check for duplicate ids */
const createValidationVisitor = (ctx: ValidationContext): ASTVisitor => {
  const viewInfo = new Map<
    ViewASTNode | AssetASTNode,
    Map<
      string,
      {
        /** the original asset node */
        original: AssetASTNode;

        /** if we've accounted for this node already */
        handled: boolean;
      }
    >
  >();

  return {
    AssetNode: (assetNode) => {
      const view = getViewNode(assetNode);
      if (!view) {
        // not sure how you can get here
        throw new Error(
          "Asset found but not within a view. Something is wrong"
        );
      }

      const assetID = assetNode.id;

      if (!assetID || !assetID.valueNode?.value) {
        // Can"t check for dupe ids if the asset doesn"t have one
        return;
      }

      const id = assetID.valueNode?.value;
      if (!viewInfo.has(view)) {
        viewInfo.set(view, new Map());
      }

      const assetIDMap = viewInfo.get(view);
      const idInfo = assetIDMap?.get(id);

      if (idInfo) {
        if (!idInfo.handled) {
          const origViolation = createViolation(idInfo.original);
          if (origViolation) {
            ctx.addViolation(origViolation);
          }

          idInfo.handled = true;
        }

        const assetViolation = createViolation(assetNode);
        if (assetViolation) {
          ctx.addViolation(assetViolation);
        }
      } else {
        // not claimed yet so this is the first
        assetIDMap?.set(id, { original: assetNode, handled: false });
      }
    },
  };
};

/** The plugin to enable duplicate id checking/fixing */
export class DuplicateIDPlugin implements PlayerLanguageServicePlugin {
  name = "duplicate-id";

  apply(service: PlayerLanguageService) {
    service.hooks.validate.tap(this.name, async (ctx, validation) => {
      validation.useASTVisitor(createValidationVisitor(validation));
    });
  }
}
