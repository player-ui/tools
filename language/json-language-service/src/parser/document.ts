import { parseTree, findNodeAtOffset } from "jsonc-parser";
import type { Node, ParseError } from "jsonc-parser";
import type { Diagnostic } from "vscode-languageserver-types";
import type { TextDocument } from "vscode-languageserver-textdocument";
import type {
  ASTNode,
  ContentASTNode,
  PropertyASTNode,
  ViewASTNode,
  AssetASTNode,
  StringASTNode,
  ArrayASTNode,
  NavigationASTNode,
  FlowASTNode,
  FlowStateASTNode,
} from "./types";
import {
  ViewASTNodeImpl,
  StringASTNodeImpl,
  PropertyASTNodeImpl,
  NullASTNodeImpl,
  BooleanASTNodeImpl,
  NumberASTNodeImpl,
  ArrayASTNodeImpl,
  AssetASTNodeImpl,
  ObjectASTNodeImpl,
  ContentASTNodeImpl,
  NavigationASTNodeImpl,
  FlowASTNodeImpl,
  FlowStateASTNodeImpl,
} from "./types";
import { convertErrorsToDiags } from "./jsonParseErrors";

/** Check if the property is a string */
function isStringProperty(
  node: PropertyASTNode
): node is PropertyASTNode<StringASTNode> {
  return node.valueNode?.type === "string";
}

/**
 * The top level document
 */
export class PlayerContent {
  public readonly root: ASTNode;
  public readonly syntaxErrors: Array<Diagnostic>;
  private readonly jsonNodeToNode: Map<Node, ASTNode>;

  constructor(
    root: ASTNode,
    errors: Array<Diagnostic>,
    jsonToNodeMap: Map<Node, ASTNode>
  ) {
    this.root = root;
    this.jsonNodeToNode = jsonToNodeMap;
    this.syntaxErrors = errors;
  }

  getNodeFromOffset(offset: number): ASTNode | undefined {
    const jsonNode = findNodeAtOffset(this.root.jsonNode, offset);
    if (!jsonNode) {
      return;
    }

    if (this.jsonNodeToNode.has(jsonNode)) {
      return this.jsonNodeToNode.get(jsonNode);
    }

    // walk up one level to see if you're at an empty property line
    const parentNode = jsonNode.parent as Node;
    if (this.jsonNodeToNode.has(parentNode)) {
      return this.jsonNodeToNode.get(parentNode);
    }

    // Check for a (great)-grand-parent match
    // This means we're completing a property on one of these nodes
    const grandparentNode = parentNode.parent as Node;
    if (this.jsonNodeToNode.has(grandparentNode)) {
      return this.jsonNodeToNode.get(grandparentNode);
    }

    const greatGrandparentNode = grandparentNode.parent as Node;
    if (this.jsonNodeToNode.has(greatGrandparentNode)) {
      return this.jsonNodeToNode.get(greatGrandparentNode);
    }
  }
}

export enum ObjType {
  FLOW,
  ASSET,
  ASSET_WRAPPER,
  UNKNOWN,
}

/** Try to identify any object as an Asset or Flow  */
export default function identify(node: Node): ObjType {
  if (node === undefined || node.type !== "object") {
    return ObjType.UNKNOWN;
  }

  const knownProps = node.children?.reduce((props, childNode) => {
    if (childNode.type === "property" && childNode.children) {
      const [key] = childNode.children;
      props.add(key.value);
    }

    return props;
  }, new Set<string>());

  if (knownProps?.has("type")) {
    return ObjType.ASSET;
  }

  return ObjType.FLOW;
}

/** parse a text document into a player one */
export function parse(document: TextDocument): PlayerContent {
  const errors: Array<ParseError> = [];
  const jsonToNode = new Map<Node, ASTNode>();
  const root = parseTree(document.getText(), errors, {
    disallowComments: true,
  });

  // TODO: convert runtime errors to diags
  const diags: Diagnostic[] = convertErrorsToDiags(document, errors);

  /** parse an asset */
  function parseAsset(node: Node, parent?: ASTNode): AssetASTNode {
    const assetNode = new AssetASTNodeImpl(node, parent);
    node.children?.forEach((prop) => {
      if (prop.type === "property" && prop.children?.length) {
        const [key, val] = prop.children;

        const keyNode = new StringASTNodeImpl(key);
        const property = new PropertyASTNodeImpl(prop, assetNode, keyNode);
        property.keyNode = new StringASTNodeImpl(key, property);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        property.valueNode = parseUnknownNode(val, property);

        if (key.value === "id" && isStringProperty(property)) {
          assetNode.id = property;
        } else if (key.value === "type" && isStringProperty(property)) {
          assetNode.assetType = property;
        }

        assetNode.properties.push(property);

        jsonToNode.set(prop, property);
        jsonToNode.set(key, property.keyNode);
        if (property.valueNode) {
          jsonToNode.set(val, property.valueNode);
        }
      }
    });
    return assetNode;
  }

  /** parse a node that we don't know about */
  function parseUnknownNode(
    node?: Node,
    parent?: ASTNode
  ): ASTNode | undefined {
    switch (node?.type) {
      case "string": {
        const newNode = new StringASTNodeImpl(node, parent);
        jsonToNode.set(node, newNode);
        return newNode;
      }

      case "null": {
        const newNode = new NullASTNodeImpl(node, parent);
        jsonToNode.set(node, newNode);
        return newNode;
      }

      case "boolean": {
        const newNode = new BooleanASTNodeImpl(node, parent);
        jsonToNode.set(node, newNode);
        return newNode;
      }

      case "number": {
        const newNode = new NumberASTNodeImpl(node, parent);
        jsonToNode.set(node, newNode);
        return newNode;
      }

      case "array": {
        const arr = new ArrayASTNodeImpl(node, parent);
        node.children?.forEach((arrChild) => {
          const child = parseUnknownNode(arrChild, arr);
          if (child) {
            jsonToNode.set(arrChild, child);
            arr.items.push(child);
          }
        });
        jsonToNode.set(node, arr);
        return arr;
      }

      case "object": {
        const obj = new ObjectASTNodeImpl(node, parent);
        jsonToNode.set(node, obj);
        node.children?.forEach((prop) => {
          if (prop.type === "property" && prop.children?.length) {
            const [key, val] = prop.children;
            const keyNode = new StringASTNodeImpl(key);
            const propNode = new PropertyASTNodeImpl(prop, obj, keyNode);
            propNode.keyNode = new StringASTNodeImpl(key, propNode);

            if (val) {
              if (keyNode.value === "asset") {
                propNode.valueNode = parseAsset(val, propNode);
              } else {
                propNode.valueNode = parseUnknownNode(val, propNode);
              }
            }

            jsonToNode.set(prop, propNode);
            jsonToNode.set(key, propNode.keyNode);
            if (propNode.valueNode) {
              jsonToNode.set(val, propNode.valueNode);
            }

            obj.properties.push(propNode);
          }
        });
        return obj;
      }

      default:
    }
  }

  /** parse a view */
  function parseView(node: Node, parent?: ASTNode): ViewASTNode {
    const viewNode = new ViewASTNodeImpl(node, parent);

    node.children?.forEach((prop) => {
      if (prop.type === "property" && (prop.children?.length ?? 0) > 0) {
        const [key, val] = prop.children ?? [];

        const keyNode = new StringASTNodeImpl(key);
        const property = new PropertyASTNodeImpl(prop, viewNode, keyNode);
        property.keyNode = new StringASTNodeImpl(key, property);

        if (val) {
          property.valueNode = parseUnknownNode(val, property);
          if (key.value === "id" && isStringProperty(property)) {
            viewNode.id = property;
          } else if (key.value === "type" && isStringProperty(property)) {
            viewNode.viewType = property;
          }
        }

        jsonToNode.set(prop, property);
        jsonToNode.set(key, property.keyNode);
        if (property.valueNode) {
          jsonToNode.set(val, property.valueNode);
        }

        viewNode.properties.push(property);
      }
    });

    jsonToNode.set(node, viewNode);
    return viewNode;
  }

  /** parse a flow state */
  function parseFlowState(node: Node, parent?: ASTNode): FlowStateASTNode {
    const state = new FlowStateASTNodeImpl(node, parent);
    jsonToNode.set(node, state);

    if (node.type === "object") {
      node.children?.forEach((prop) => {
        if (prop.type === "property" && prop.children?.length) {
          const [key, val] = prop.children;

          const keyNode = new StringASTNodeImpl(key);
          const property = new PropertyASTNodeImpl(prop, state, keyNode);
          property.keyNode = new StringASTNodeImpl(key, property);

          if (key.value === "state_type" && val?.type === "string") {
            property.valueNode = parseUnknownNode(val, property);
            state.stateType = property as PropertyASTNode<StringASTNode>;
          } else {
            property.valueNode = parseUnknownNode(val, property);
          }

          jsonToNode.set(prop, property);
          jsonToNode.set(key, property.keyNode);
          if (property.valueNode) {
            jsonToNode.set(val, property.valueNode);
          }

          state.properties.push(property);
        }
      });
    }

    return state;
  }

  /** parse a flow */
  function parseFlow(node: Node, parent?: ASTNode): FlowASTNode {
    const flow = new FlowASTNodeImpl(node, parent);
    jsonToNode.set(node, flow);

    if (node.type === "object") {
      node.children?.forEach((prop) => {
        if (prop.type === "property" && prop.children?.length) {
          const [key, val] = prop.children;

          const keyNode = new StringASTNodeImpl(key);
          const property = new PropertyASTNodeImpl(prop, flow, keyNode);
          property.keyNode = new StringASTNodeImpl(key, property);

          if (key.value === "startState" && val?.type === "string") {
            property.valueNode = parseUnknownNode(val, property);
            flow.start = property as PropertyASTNode<StringASTNode>;
          } else if (
            val?.type === "object" &&
            property.keyNode.value !== "onStart" &&
            property.keyNode.value !== "onEnd"
          ) {
            // Anything else in here is a state-type
            property.valueNode = parseFlowState(val, property);
            flow.states.push(property as PropertyASTNode<FlowStateASTNode>);
          } else {
            property.valueNode = parseUnknownNode(val, property);
          }

          jsonToNode.set(prop, property);
          jsonToNode.set(key, property.keyNode);
          if (property.valueNode) {
            jsonToNode.set(val, property.valueNode);
          }

          flow.properties.push(property);
        }
      });
    }

    return flow;
  }

  /** parse a nav node */
  function parseNavigation(node: Node, parent?: ASTNode): NavigationASTNode {
    const navNode = new NavigationASTNodeImpl(node, parent);
    jsonToNode.set(node, navNode);
    if (node.type === "object") {
      node.children?.forEach((prop) => {
        if (prop.type === "property" && prop.children?.length) {
          const [key, val] = prop.children;

          const keyNode = new StringASTNodeImpl(key);
          const property = new PropertyASTNodeImpl(prop, navNode, keyNode);
          property.keyNode = new StringASTNodeImpl(key, property);

          if (key.value === "BEGIN" && val?.type === "string") {
            property.valueNode = parseUnknownNode(val, property);
            navNode.begin = property as PropertyASTNode<StringASTNode>;
          } else if (val?.type === "object") {
            // Anything else in here is a state-type
            property.valueNode = parseFlow(val, property);
            navNode.flows.push(property as PropertyASTNode<FlowASTNode>);
          }

          jsonToNode.set(prop, property);
          jsonToNode.set(key, property.keyNode);
          if (property.valueNode) {
            jsonToNode.set(val, property.valueNode);
          }

          navNode.properties.push(property);
        }
      });
    }

    return navNode;
  }

  /** parse a full doc */
  function parseContent(node: Node): ContentASTNode {
    const contentNode = new ContentASTNodeImpl(node, undefined);

    if (node.type === "object") {
      node.children?.forEach((childProp) => {
        if (childProp.type === "property" && childProp.children?.length) {
          const [key, val] = childProp.children;

          const keyNode = new StringASTNodeImpl(key);
          const property = new PropertyASTNodeImpl(
            childProp,
            contentNode,
            keyNode
          );
          property.keyNode = new StringASTNodeImpl(key, property);

          if (key.value === "views" && val?.type === "array") {
            const views = new ArrayASTNodeImpl(val, property);
            val.children?.forEach((view) => {
              const parsedV = parseView(view, views);
              jsonToNode.set(view, parsedV);
              views.items.push(parsedV);
            });
            property.valueNode = views;
            contentNode.views = property as PropertyASTNode<ArrayASTNode>;
          } else if (key.value === "navigation" && val) {
            const nav = parseNavigation(val, property);
            contentNode.navigation =
              property as PropertyASTNode<NavigationASTNode>;
            property.valueNode = nav;
          } else if (val) {
            property.valueNode = parseUnknownNode(val, property);
          }

          jsonToNode.set(childProp, property);
          jsonToNode.set(key, property.keyNode);
          if (property.valueNode) {
            jsonToNode.set(val, property.valueNode);
          }

          contentNode.properties.push(property);
        }
      });
    }

    jsonToNode.set(node, contentNode);
    return contentNode;
  }

  let rootASTNode: ASTNode = {
    type: "empty",
    value: undefined,
    jsonNode: root,
  };

  const objType = identify(root);

  switch (objType) {
    case ObjType.ASSET:
      rootASTNode = parseAsset(root);
      break;
    case ObjType.FLOW:
      rootASTNode = parseContent(root);
      break;
    default:
      break;
  }

  return new PlayerContent(rootASTNode, diags, jsonToNode);
}
