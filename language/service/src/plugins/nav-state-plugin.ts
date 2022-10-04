import {
  CompletionItemKind,
  DiagnosticSeverity,
} from 'vscode-languageserver-types';
import type { PlayerLanguageService, PlayerLanguageServicePlugin } from '..';
import type { ASTNode, FlowASTNode } from '../parser';
import { isFlowNode, isPropertyNode, isStateNode } from '../parser';
import type { ASTVisitor, ValidationContext } from '../types';
import type { PropertyASTNode } from '..';
import { getLSLocationOfNode, isValueCompletion } from '../utils';

/** Create a validation visitor for dealing with transition states */
const createValidationVisitor = (ctx: ValidationContext): ASTVisitor => {
  const validTransitions = new Map<string, Set<string>>();

  return {
    FlowNode: (flowNode) => {
      const flowNodeId = (flowNode.parent as PropertyASTNode)?.keyNode.value;

      flowNode.states.forEach((p) => {
        if (!validTransitions.has(flowNodeId)) {
          validTransitions.set(flowNodeId, new Set());
        }

        validTransitions.get(flowNodeId)?.add(p.keyNode.value);
      });
    },

    FlowStateNode: (flowState) => {
      const transitions = flowState.properties.find(
        (p) => p.keyNode.value === 'transitions'
      );

      let flowNode = flowState.parent;
      while (flowNode && !isFlowNode(flowNode)) {
        flowNode = flowNode?.parent;
      }

      const flowNodeId = (flowNode?.parent as PropertyASTNode)?.keyNode.value;

      transitions?.valueNode?.children?.forEach((transitionObjects) => {
        if (
          transitionObjects.type === 'property' &&
          transitionObjects.valueNode?.type === 'string'
        ) {
          // Validate that the target is valid

          if (
            !validTransitions
              .get(flowNodeId)
              ?.has(transitionObjects.valueNode.value)
          ) {
            ctx.addViolation({
              node: transitionObjects.valueNode,
              severity: DiagnosticSeverity.Error,
              message: `Node '${transitionObjects.valueNode.value}' not found`,
            });
          }
        }
      });
    },
  };
};

/** Check that the node is a string completion of a transition state */
const isTransitionValue = (node: ASTNode): boolean => {
  return (
    node.type === 'string' &&
    isPropertyNode(node.parent) &&
    node.parent.parent?.type === 'object' &&
    isPropertyNode(node.parent.parent.parent) &&
    node.parent.parent.parent.keyNode.value === 'transitions' &&
    isStateNode(node.parent.parent.parent.parent) &&
    isPropertyNode(node.parent.parent.parent.parent.parent) &&
    isFlowNode(node.parent.parent.parent.parent.parent.parent)
  );
};

/** Find the first parent flow node  */
const getFlowNode = (node: ASTNode): FlowASTNode | undefined => {
  if (isFlowNode(node)) {
    return node;
  }

  if (node.parent) {
    return getFlowNode(node.parent);
  }
};

/**
 * Handles everything associated with navigation nodes (transitions, jump-to-def, reachability)
 */
export class NavStatePlugin implements PlayerLanguageServicePlugin {
  name = 'nav-state';

  apply(service: PlayerLanguageService) {
    service.hooks.validate.tap(this.name, async (ctx, validation) => {
      validation.useASTVisitor(createValidationVisitor(validation));
    });

    service.hooks.complete.tap(this.name, async (ctx, completionCtx) => {
      // auto-complete any transition nodes

      if (!isValueCompletion(ctx.node)) {
        return;
      }

      if (isTransitionValue(ctx.node)) {
        const flowNode = getFlowNode(ctx.node);

        flowNode?.states.forEach((p) => {
          completionCtx.addCompletionItem({
            kind: CompletionItemKind.Value,
            label: p.keyNode.value,
          });
        });
      }
    });

    service.hooks.definition.tap(this.name, (ctx) => {
      if (!isValueCompletion(ctx.node)) {
        return;
      }

      if (ctx.node.type === 'string' && isTransitionValue(ctx.node)) {
        const flowNode = getFlowNode(ctx.node);
        const { value } = ctx.node;

        const flowProp = flowNode?.states.find(
          (n) => n.keyNode.value === value
        );

        if (flowProp) {
          return getLSLocationOfNode(ctx.document, flowProp.keyNode);
        }
      }
    });
  }
}
