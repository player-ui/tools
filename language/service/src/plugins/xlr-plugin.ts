import type { NodeType, ObjectType } from '@player-tools/xlr';
import type { XLRSDK } from '@player-tools/xlr-sdk';
import type { CompletionItem } from 'vscode-languageserver-types';
import {
  CompletionItemKind,
  DiagnosticSeverity,
  MarkupKind,
} from 'vscode-languageserver-types';
import type { Node } from 'jsonc-parser';
import type {
  ASTVisitor,
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
  ValidationContext,
} from '..';
import { mapFlowStateToType } from '../utils';
import type { ASTNode, ObjectASTNode, ViewASTNode } from '../parser';
import type { EnhancedDocumentContextWithPosition } from '../types';

/** BFS search to find a JSONC node in children of some AST Node */
const findErrorNode = (rootNode: ASTNode, nodeToFind: Node): ASTNode => {
  const children: Array<ASTNode> = [rootNode];

  while (children.length > 0) {
    const child = children.pop() as ASTNode;
    if (child.jsonNode === nodeToFind) {
      return child;
    }

    if (child.children) {
      children.push(...child.children);
    }
  }

  // if the node can't be found return the original
  return rootNode;
};

/**
 * Create Validation walkers
 */
function createValidationVisitor(
  ctx: ValidationContext,
  sdk: XLRSDK
): ASTVisitor {
  const nodesWithErrors = new Set<Node>();

  // TODO cache nodes for LSP usecase. Need to examine which nodes can be cached and how to cache complex objects
  return {
    AssetNode: (assetNode) => {
      // Try and find custom asset but fall back on just validating if its an valid asset if its not found.
      let expectedType = assetNode.assetType?.valueNode?.value as string;

      if (!sdk.hasType(expectedType)) {
        ctx.addViolation({
          node: assetNode,
          message: `Warning - Asset Type ${assetNode.assetType?.valueNode?.value} was not loaded into Validator definitions`,
          severity: DiagnosticSeverity.Warning,
        });
        expectedType = 'Asset';
      }

      const validationIssues = sdk.validateByName(
        expectedType,
        assetNode.jsonNode
      );
      validationIssues.forEach((issue) => {
        if (!nodesWithErrors.has(issue.node) || issue.type === 'missing') {
          nodesWithErrors.add(issue.node);
          ctx.addViolation({
            node: findErrorNode(assetNode, issue.node),
            message: `Asset Validation Error - ${issue.type}: ${issue.message}`,
            severity: DiagnosticSeverity.Error,
          });
        }
      });
    },
    ViewNode: (viewNode) => {
      let expectedType = viewNode.viewType?.valueNode?.value as string;

      if (!sdk.hasType(expectedType)) {
        ctx.addViolation({
          node: viewNode,
          message: `Warning - View Type ${viewNode.viewType?.valueNode?.value} was not loaded into Validator definitions`,
          severity: DiagnosticSeverity.Warning,
        });
        expectedType = 'View';
      }

      const validationIssues = sdk.validateByName(
        expectedType,
        viewNode.jsonNode
      );
      validationIssues.forEach((issue) => {
        if (!nodesWithErrors.has(issue.node) || issue.type === 'missing') {
          nodesWithErrors.add(issue.node);
          ctx.addViolation({
            node: findErrorNode(viewNode, issue.node),
            message: `View Validation Error - ${issue.type}: ${issue.message}`,
            severity: DiagnosticSeverity.Error,
          });
        }
      });
    },
    ContentNode: (contentNode) => {
      const flowType = sdk.getType('Flow');

      if (!flowType) {
        throw new Error(
          "Flow is not a registered type, can't validate content. Did you load a version of the base Player types?"
        );
      }

      /**
       * Since the `views.validation` property contains a runtime conditional that is validated anyways when we get to
       * the ViewNode, replace the reference to `View` with a basic `Asset` instead of trying to solve the generic
       * for every view present
       */

      const assetType = sdk.getType('Asset');
      if (!assetType) {
        throw new Error(
          "Asset is not a registered type, can't validate content. Did you load a version of the base Player types?"
        );
      }

      if (
        flowType.type === 'object' &&
        flowType.properties.views?.node.type === 'array'
      ) {
        flowType.properties.views.node.elementType = assetType;
      }

      const validationIssues = sdk.validateByType(
        flowType,
        contentNode.jsonNode
      );

      validationIssues.forEach((issue) => {
        if (!nodesWithErrors.has(issue.node) || issue.type === 'missing') {
          nodesWithErrors.add(issue.node);
          ctx.addViolation({
            node: findErrorNode(contentNode, issue.node),
            message: `Content Validation Error - ${issue.type}: ${issue.message}`,
            severity: DiagnosticSeverity.Error,
          });
        }
      });
    },
    NavigationNode: (navigationNode) => {
      const expectedType = 'Navigation';
      const validationIssues = sdk.validateByName(
        expectedType,
        navigationNode.jsonNode
      );
      validationIssues.forEach((issue) => {
        if (!nodesWithErrors.has(issue.node) || issue.type === 'missing') {
          nodesWithErrors.add(issue.node);
          ctx.addViolation({
            node: findErrorNode(navigationNode, issue.node),
            message: `Navigation Validation Error - ${issue.type}: ${issue.message}`,
            severity: DiagnosticSeverity.Error,
          });
        }
      });
    },
    FlowNode: (flowNode) => {
      const expectedType = 'NavigationFlow';
      const validationIssues = sdk.validateByName(
        expectedType,
        flowNode.jsonNode
      );
      validationIssues.forEach((issue) => {
        if (!nodesWithErrors.has(issue.node) || issue.type === 'missing') {
          nodesWithErrors.add(issue.node);
          ctx.addViolation({
            node: findErrorNode(flowNode, issue.node),
            message: `Navigation Flow Validation Error - ${issue.type}: ${issue.message}`,
            severity: DiagnosticSeverity.Error,
          });
        }
      });
    },
    FlowStateNode: (flowStateNode) => {
      const flowxlr = mapFlowStateToType(
        flowStateNode.stateType?.valueNode?.value
      );

      if (flowxlr) {
        const validationIssues = sdk.validateByName(
          flowxlr,
          flowStateNode.jsonNode
        );
        validationIssues.forEach((issue) => {
          if (!nodesWithErrors.has(issue.node) || issue.type === 'missing') {
            nodesWithErrors.add(issue.node);
            ctx.addViolation({
              node: findErrorNode(flowStateNode, issue.node),
              message: `Navigation Node Validation Error - ${issue.type}: ${issue.message}`,
              severity: DiagnosticSeverity.Error,
            });
          }
        });
      } else {
        ctx.addViolation({
          node: flowStateNode,
          message:
            'Unknown Flow Type, valid options are: VIEW, END, ACTION, EXTERNAL, FLOW',
          severity: DiagnosticSeverity.Error,
        });
      }
    },
  };
}

/** Gets object completions */
function getObjectCompletions(
  authoredNode: ASTNode,
  potentialTypes: Array<NodeType>
) {
  const completions: Array<CompletionItem> = [];

  const presentKeys = new Set();
  if ((authoredNode as ObjectASTNode).properties) {
    (authoredNode as ObjectASTNode).properties.forEach((propertyNode) =>
      presentKeys.add(propertyNode.keyNode.value)
    );
  }

  potentialTypes.forEach((node) => {
    if (node.type === 'object') {
      Object.keys(node.properties).forEach((prop) => {
        if (!presentKeys.has(prop)) {
          completions.push({
            label: prop,
            documentation:
              node.properties[prop].node.description ??
              node.properties[prop].node.title,
            kind: CompletionItemKind.Property,
          });
        }
      });
    } else if (node.type === 'and') {
      completions.push(...getObjectCompletions(authoredNode, node.and));
    } else if (node.type === 'or') {
      completions.push(...getObjectCompletions(authoredNode, node.or));
    }
  });

  return completions;
}

/** get value completions */
function getPropertyCompletions(
  propertyName: string,
  potentialTypes: Array<NodeType>
) {
  const completions: Array<CompletionItem> = [];
  potentialTypes.forEach((nodeType) => {
    if (nodeType.type === 'object') {
      const propertyNode = nodeType.properties[propertyName]?.node;
      if (
        propertyNode &&
        propertyNode.type === 'string' &&
        propertyNode.const
      ) {
        completions.push({
          label: propertyNode.const,
          kind: CompletionItemKind.Value,
        });
      }
    }
  });

  return completions;
}

/** returns completions for object properties */
function complete(
  ctx: EnhancedDocumentContextWithPosition
): Array<CompletionItem> {
  if (ctx.XLR?.nearestObjects) {
    if (ctx.node.type === 'string' && ctx.node?.parent?.type === 'property') {
      return getPropertyCompletions(
        ctx.node.parent.keyNode.value,
        ctx.XLR.nearestObjects
      );
    }

    return getObjectCompletions(ctx.node, ctx.XLR.nearestObjects);
  }

  return [];
}

/** gets hover docs */
function hover(ctx: EnhancedDocumentContextWithPosition) {
  if (ctx.XLR && ctx.node.type === 'string') {
    const docStrings: Array<string> = [];
    const prop = ctx.node.value;

    ctx.XLR.nearestObjects.forEach((typeNode) => {
      const docString =
        typeNode.properties[prop]?.node?.description ??
        typeNode.properties[prop]?.node?.title ??
        undefined;
      if (docString) {
        docStrings.push(docString);
      }
    });

    if (docStrings.length > 1) {
      return {
        contents: {
          kind: MarkupKind.PlainText,
          value:
            'Docs unavailable - More than one type could exist at this location',
        },
      };
    }

    return {
      contents: {
        kind: MarkupKind.PlainText,
        value: docStrings[0] ?? 'Error getting docs',
      },
    };
  }
}

/** The plugin to enable duplicate id checking/fixing */
export class XLRPlugin implements PlayerLanguageServicePlugin {
  name = 'xlr-plugin';

  apply(service: PlayerLanguageService) {
    service.hooks.validate.tap(this.name, async (ctx, validation) => {
      validation.useASTVisitor(
        createValidationVisitor(validation, service.XLRService.XLRSDK)
      );
    });
    service.hooks.complete.tap(this.name, async (ctx, completion) => {
      complete(ctx).map((i) => completion.addCompletionItem(i));
    });
    service.hooks.hover.tap(this.name, (ctx) => {
      return hover(ctx);
    });
  }
}
