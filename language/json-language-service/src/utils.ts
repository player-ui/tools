import { Range, Location } from "vscode-languageserver-types";
import { TextDocument } from "vscode-languageserver-textdocument";
import detectIndent from "detect-indent";
import type {
  ASTNode,
  PlayerContent,
  ObjectASTNode,
  PropertyASTNode,
} from "./parser";
import type { ASTVisitor } from "./types";

export const typeToVisitorMap: Record<ASTNode["type"], keyof ASTVisitor> = {
  string: "StringNode",
  number: "NumberNode",
  boolean: "BooleanNode",
  array: "ArrayNode",
  null: "NullNode",
  empty: "EmptyNode",
  property: "PropertyNode",
  object: "ObjectNode",
  asset: "AssetNode",
  view: "ViewNode",
  content: "ContentNode",
  navigation: "NavigationNode",
  flow: "FlowNode",
  state: "FlowStateNode",
};

/** Check to see if the source range contains the target one */
export function containsRange(source: Range, range: Range): boolean {
  const { start, end } = range;
  const { start: srcStart, end: srcEnd } = source;

  return (
    start.line === srcStart.line &&
    end.line === srcEnd.line &&
    start.character >= srcStart.character &&
    end.character <= srcEnd.character
  );
}

/** Create a dummy TextDocument from the given string */
export function toTextDocument(str: string): TextDocument {
  return TextDocument.create("foo", "json", 1, str);
}

/** Check to see if the document successfully parsed into a known root type */
export function isKnownRootType(document: PlayerContent): boolean {
  const { type } = document.root;

  return type === "view" || type === "asset" || type === "content";
}

/** Check to see if the node is the value of an object */
export function isValueCompletion(node: ASTNode): boolean {
  return node.parent?.type === "property" && node.parent.valueNode === node;
}

/** Check to see if the node is the key of an object */
export function isPropertyCompletion(node: ASTNode): boolean {
  return node.parent?.type === "property" && node.parent.keyNode === node;
}

/** Search the object for a property with the given name */
export function getProperty<T extends ASTNode>(
  obj: T,
  name: string
): PropertyASTNode | undefined {
  if ("properties" in obj) {
    return (obj as ObjectASTNode).properties.find(
      (p) => p.keyNode.value === name
    );
  }
}

/** Get the LSP Location of an AST node in a document */
export function getLSLocationOfNode(
  document: TextDocument,
  node: ASTNode
): Location {
  const nodeRange = Range.create(
    document.positionAt(node.jsonNode.offset),
    document.positionAt(node.jsonNode.offset + node.jsonNode.length)
  );

  return Location.create(document.uri, nodeRange);
}

/** Get the depth of the property */
function getDepth(node: ASTNode): number {
  if (!node.parent) {
    return 0;
  }

  if (node.type === "property") {
    return getDepth(node.parent);
  }

  return 1 + getDepth(node.parent);
}

/** Format a new node like an existing one (including the indentation) */
export function formatLikeNode(
  document: TextDocument,
  originalNode: ASTNode,
  replacement: Record<string, unknown>
): string {
  const { indent } = detectIndent(document.getText());
  const depth = getDepth(originalNode);

  return JSON.stringify(replacement, null, indent)
    .split("\n")
    .map((l, index) => (index === 0 ? l : `${indent.repeat(depth)}${l}`))
    .join("\n");
}

/** Maps the string identifying the FlowType to the named type */
export function mapFlowStateToType(
  flowType: string | undefined
): string | undefined {
  let flowXLR;
  switch (flowType) {
    case "VIEW":
      flowXLR = "NavigationFlowViewState";
      break;
    case "END":
      flowXLR = "NavigationFlowEndState";
      break;
    case "ACTION":
      flowXLR = "NavigationFlowActionState";
      break;
    case "EXTERNAL":
      flowXLR = "NavigationFlowExternalState";
      break;
    case "FLOW":
      flowXLR = "NavigationFlowFlowState";
      break;
    default:
      break;
  }

  return flowXLR;
}
