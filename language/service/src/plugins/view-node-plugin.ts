import {
  CompletionItemKind,
  DiagnosticSeverity,
} from 'vscode-languageserver-types';
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from '..';
import type { PropertyASTNode, StringASTNode } from '../parser';
import { isPropertyNode, isStateNode, isViewNode } from '../parser';
import type { ASTVisitor, DocumentContext, ValidationContext } from '../types';
import { getLSLocationOfNode, getProperty, isValueCompletion } from '../utils';

interface DocumentViewInfo {
  /** list of views */
  views: Map<
    string,
    {
      /** view id */
      id: string;

      /** view id prop */
      idProp: PropertyASTNode<StringASTNode>;
    }
  >;

  /** list of view nodes */
  nodes: Map<
    string,
    {
      /** id of the view */
      id: string;

      /** view ref  */
      refProp: PropertyASTNode<StringASTNode>;
    }
  >;
}

/** create a visitor to handle view nodes */
const createValidationVisitor = (
  ctx: ValidationContext,
  viewInfo: DocumentViewInfo
): ASTVisitor => {
  return {
    FlowStateNode: (flowState) => {
      if (flowState.stateType?.valueNode?.value === 'VIEW') {
        const refNode = getProperty(flowState, 'ref');
        if (!refNode || refNode.valueNode?.type !== 'string') {
          return;
        }

        const refID = refNode.valueNode.value;

        if (viewInfo.views.has(refID)) {
          return;
        }

        ctx.addViolation({
          node: refNode.valueNode,
          message: `View with id: ${refID} does not exist.`,
          severity: DiagnosticSeverity.Error,
        });
      }
    },
    ViewNode: (viewNode) => {
      if (viewNode.id && viewNode.id.valueNode?.value !== undefined) {
        if (!viewInfo.nodes.get(viewNode.id.valueNode?.value)) {
          ctx.addViolation({
            node: viewNode.id.valueNode,
            message: `View is not reachable`,
            severity: DiagnosticSeverity.Warning,
          });
        }
      }
    },
  };
};

/** get the info for a given view */
const getViewInfo = (ctx: DocumentContext): DocumentViewInfo => {
  const views = new Map<
    string,
    {
      /** view id */
      id: string;

      /** view id prop */
      idProp: PropertyASTNode<StringASTNode>;
    }
  >();

  const nodes = new Map<
    string,
    {
      /** id of the view */
      id: string;

      /** view ref  */
      refProp: PropertyASTNode<StringASTNode>;
    }
  >();

  // Go through the views array and fetch the ID

  const { root } = ctx.PlayerContent;

  if (root.type === 'content') {
    root.views?.valueNode?.children.forEach((c) => {
      if (isViewNode(c) && c.id?.valueNode) {
        views.set(c.id.valueNode.value, {
          id: c.id.valueNode.value,
          idProp: c.id,
        });
      }
    });

    root.navigation?.valueNode?.flows.forEach((flow) => {
      flow.valueNode?.states?.forEach((state) => {
        if (state.valueNode?.stateType?.valueNode?.value === 'VIEW') {
          const ref = state.valueNode.properties.find(
            (p) => p.keyNode.value === 'ref'
          );
          if (ref?.valueNode?.type === 'string') {
            const refVal = ref.valueNode.value;
            nodes.set(refVal, {
              id: refVal,
              refProp: ref as PropertyASTNode<StringASTNode>,
            });
          }
        }
      });
    });
  }

  return {
    views,
    nodes,
  };
};

/**
 * Handles everything associated with the VIEW node type (definition, validation, auto-complete)
 */
export class ViewNodePlugin implements PlayerLanguageServicePlugin {
  name = 'view-node';

  apply(service: PlayerLanguageService) {
    let viewInfo: DocumentViewInfo | undefined;

    service.hooks.validate.tap(this.name, async (ctx, validation) => {
      if (!viewInfo) {
        return;
      }

      validation.useASTVisitor(createValidationVisitor(validation, viewInfo));
    });

    service.hooks.onDocumentUpdate.tap(this.name, (ctx) => {
      // Update the parsing for the locations of view info across the document
      viewInfo = getViewInfo(ctx);
    });

    service.hooks.complete.tap(this.name, async (ctx, completionCtx) => {
      // Auto-complete ViewNode refs and view-ids based on the document

      if (!isValueCompletion(ctx.node)) {
        return;
      }

      if (
        ctx.node.type === 'string' &&
        isPropertyNode(ctx.node.parent) &&
        isStateNode(ctx.node.parent.parent) &&
        ctx.node.parent.keyNode.value === 'ref'
      ) {
        Array.from(viewInfo?.views.keys() ?? []).forEach((vID) => {
          completionCtx.addCompletionItem({
            kind: CompletionItemKind.Value,
            label: vID,
          });
        });
      } else if (
        ctx.node.type === 'string' &&
        isPropertyNode(ctx.node.parent) &&
        isViewNode(ctx.node.parent.parent) &&
        ctx.node.parent.keyNode.value === 'id'
      ) {
        Array.from(viewInfo?.nodes.keys() ?? []).forEach((vID) => {
          completionCtx.addCompletionItem({
            kind: CompletionItemKind.Value,
            label: vID,
          });
        });
      }
    });

    service.hooks.definition.tap(this.name, (ctx) => {
      // Jump between view-refs and ViewNode's

      if (!isValueCompletion(ctx.node)) {
        return;
      }

      if (ctx.node.type === 'string' && isPropertyNode(ctx.node.parent)) {
        if (
          isViewNode(ctx.node.parent.parent) &&
          ctx.node.parent.keyNode.value === 'id'
        ) {
          const { value } = ctx.node;
          const stateNode = viewInfo?.nodes.get(value);
          if (stateNode) {
            return getLSLocationOfNode(ctx.document, stateNode.refProp);
          }
        } else if (
          isStateNode(ctx.node.parent.parent) &&
          ctx.node.parent.keyNode.value === 'ref'
        ) {
          const { value } = ctx.node;
          const viewNode = viewInfo?.views.get(value);
          if (viewNode) {
            return getLSLocationOfNode(ctx.document, viewNode.idProp);
          }
        }
      }
    });
  }
}
