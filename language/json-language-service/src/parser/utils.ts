import type {
  ASTNode,
  PropertyASTNode,
  StringASTNode,
  ViewASTNode,
  ContentASTNode,
  FlowStateASTNode,
  ObjectASTNode,
  FlowASTNode,
  NavigationASTNode,
  AssetASTNode,
} from "./types";

/** check if the node is a property */
export function isPropertyNode(node?: ASTNode): node is PropertyASTNode {
  return node?.type === "property";
}

/** check if the node is an object ast */
export function isObjectNode(node?: ASTNode): node is ObjectASTNode {
  return node?.type === "object";
}

/** check if the node is a key */
export function isKeyNode(node?: ASTNode): node is StringASTNode {
  return isPropertyNode(node?.parent) && node?.parent.keyNode === node;
}

/** check if the node is a value */
export function isValueNode(node?: ASTNode): boolean {
  return isPropertyNode(node?.parent) && node?.parent.valueNode === node;
}

/** check if the node is a view */
export function isViewNode(node?: ASTNode): node is ViewASTNode {
  return node?.type === "view";
}

/** check if the node is a state */
export function isStateNode(node?: ASTNode): node is FlowStateASTNode {
  return node?.type === "state";
}

/** check if the node is a flow */
export function isFlowNode(node?: ASTNode): node is FlowASTNode {
  return node?.type === "flow";
}

/** check if the node is a nav */
export function isNavigationNode(node?: ASTNode): node is NavigationASTNode {
  return node?.type === "navigation";
}

/** get the value for a given key in the object */
export function getValForKey<T extends ObjectASTNode<any>>(
  node: T,
  key: string
): any {
  const prop = node.properties.find((k) => k.keyNode.value === key);
  return prop?.valueNode?.jsonNode.value;
}

/** get the key for the given value node */
export function getPropForValNode(node?: ASTNode): string | undefined {
  if (isValueNode(node) && isPropertyNode(node?.parent)) {
    return node?.parent.keyNode.value;
  }
}

/** find the view node */
export function getViewNode(
  node: ASTNode
): ViewASTNode | AssetASTNode | undefined {
  if (node.parent) {
    if (node.parent.type === "view") {
      return node.parent;
    }

    return getViewNode(node.parent);
  }

  if (node.type === "asset") {
    return node;
  }
}

/** traverse up until we find the root content node */
export function getContentNode(node: ASTNode): ContentASTNode | undefined {
  if (node.type === "content") {
    return node;
  }

  return node.parent ? getContentNode(node.parent) : undefined;
}
