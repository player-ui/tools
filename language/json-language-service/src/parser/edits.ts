import type { TextDocument } from "vscode-languageserver-textdocument";
import { TextEdit, Range } from "vscode-languageserver-types";
import type { StringASTNode, NodeEdit, ASTNode } from "./types";

/** Create a NodeEdit by replacing a string */
export function replaceString(node: StringASTNode, newText: string): NodeEdit {
  return {
    type: "replace",
    node,
    value: newText,
  };
}

/** Get the range for a given node */
export function toRange(document: TextDocument, node: ASTNode): Range {
  return Range.create(
    document.positionAt(node.jsonNode.offset),
    document.positionAt(node.jsonNode.offset + node.jsonNode.length)
  );
}

/** Convert a NodeEdit to a TextEdit */
export function toTextEdit(document: TextDocument, edit: NodeEdit): TextEdit {
  switch (edit.type) {
    case "replace":
      return TextEdit.replace(toRange(document, edit.node), edit.value);

    default:
      throw new Error("Dont know how to convert this to a TextEdit");
  }
}
