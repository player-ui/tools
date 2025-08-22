import { Node } from "ts-morph";

/**
 * Extract JSDoc information from any node that supports JSDoc.
 */
export function extractJSDocFromNode(node: Node): string | undefined {
  if (!Node.isJSDocable(node)) {
    return undefined;
  }

  const jsDocs = node.getJsDocs();
  if (jsDocs.length === 0) {
    return undefined;
  }

  return jsDocs.reduce((acc, jsDoc) => {
    const innerText = jsDoc.getInnerText().trim();
    return acc ? `${acc}\n${innerText}` : innerText;
  }, "");
}
