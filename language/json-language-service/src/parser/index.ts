import type { TextDocument } from "vscode-languageserver-textdocument";
import { getNodeValue as getJSONNodeValue } from "jsonc-parser";
import type { PlayerContent } from "./document";
import type { ASTNode } from "./types";

export * from "./utils";
export { parse } from "./document";
export * from "./types";
export * from "./document";

export interface PlayerContentProvider {
  parse(document: TextDocument): PlayerContent;
}

/** traverse a node and call the visitor for each nested item */
export async function walk(
  node: ASTNode,
  visitor: (n: ASTNode) => Promise<boolean>
): Promise<void> {
  const queue: ASTNode[] = [node];
  let stop = false;

  while (queue.length > 0 && !stop) {
    const nodeToVisit = queue.shift();
    if (nodeToVisit?.children) {
      queue.push(...nodeToVisit.children);
    }

    /* eslint-disable-next-line no-await-in-loop */
    stop = nodeToVisit ? await visitor(nodeToVisit) : true;
  }
}

/** Get the JSON value for a node */
export function getNodeValue(node: ASTNode): any {
  return getJSONNodeValue(node.jsonNode);
}

export * from "./edits";
