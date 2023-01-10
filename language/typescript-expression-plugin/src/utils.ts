import type { Position } from 'vscode-languageserver-types';
import type { ExpressionNode, NodeLocation } from '@player-ui/player';
import { parseTree } from 'jsonc-parser';
import type { Node } from 'jsonc-parser';

/** Check if the vscode position overlaps with the expression location */
export function isInRange(position: Position, location: NodeLocation) {
  return (
    position.character >= location.start.character &&
    position.character <= location.end.character
  );
}

/** Find the closest marked token at the given position */
export function getTokenAtPosition(
  node: ExpressionNode,
  position: Position
): ExpressionNode | undefined {
  if (node.type === 'CallExpression') {
    const anyArgs = node.args.find((arg) => {
      return getTokenAtPosition(arg, position);
    });

    if (anyArgs) {
      return anyArgs;
    }

    const asTarget = getTokenAtPosition(node.callTarget, position);
    if (asTarget) {
      return asTarget;
    }
  }

  if (node.type === 'Assignment') {
    const asTarget =
      getTokenAtPosition(node.left, position) ??
      getTokenAtPosition(node.right, position);
    if (asTarget) {
      return asTarget;
    }
  }

  // Lastly check for yourself
  if (node.location && isInRange(position, node.location)) {
    return node;
  }
}

/** Get the location info that TS expects for it's diags */
export function toTSLocation(node: ExpressionNode): ts.TextSpan {
  const start = node.location?.start.character;
  const end = node.location?.end.character;
  if (start === undefined || end === undefined) {
    return {
      start: 0,
      length: 0,
    };
  }

  return {
    start,
    length: end - start,
  };
}

/** ExpressionNode -> raw value */
export function convertExprToValue(exprNode: ExpressionNode): any {
  let val;

  if (exprNode.type === 'Literal') {
    val = exprNode.value;
  } else if (exprNode.type === 'Object') {
    val = {};
    exprNode.attributes.forEach((prop) => {
      val[convertExprToValue(prop.key)] = convertExprToValue(prop.value);
    });
  } else if (exprNode.type === 'ArrayExpression') {
    val = exprNode.elements.map(convertExprToValue);
  }

  return val;
}

/** ExpressionNode -> JSONC Node */
export function convertExprToJSONNode(
  exprNode: ExpressionNode
): Node | undefined {
  const val = convertExprToValue(exprNode);
  if (val === undefined) {
    return undefined;
  }

  return parseTree(JSON.stringify(val));
}
