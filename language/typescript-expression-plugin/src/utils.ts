import type { Position } from 'vscode-languageserver-types';
import type { ExpressionNode, NodeLocation } from '@player-ui/player';

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
