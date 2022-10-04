// https://github.com/microsoft/vscode-json-languageservice/blob/master/src/jsonLanguageTypes.ts
import type { Node } from 'jsonc-parser';

export type ASTNode =
  | StringASTNode
  | NumberASTNode
  | BooleanASTNode
  | ArrayASTNode
  | NullASTNode
  | PropertyASTNode
  | ObjectASTNode
  | AssetASTNode
  | ViewASTNode
  | ContentASTNode
  | NavigationASTNode
  | FlowASTNode
  | EmptyASTNode
  | FlowStateASTNode;

export interface BaseASTNode<T extends string> {
  /** The base type of the node */
  readonly type: T;

  /** an optional parent */
  readonly parent?: ASTNode;

  /** the underlying json node */
  readonly jsonNode: Node;

  /** any children of the node */
  readonly children?: ASTNode[];
}

// Base JSON types
export interface StringASTNode extends BaseASTNode<'string'> {
  /** the raw value */
  readonly value: string;
}

export interface NumberASTNode extends BaseASTNode<'number'> {
  /** the raw value */
  readonly value: number;
}

export interface BooleanASTNode extends BaseASTNode<'boolean'> {
  /** the raw value */
  readonly value: boolean;
}

export interface ArrayASTNode extends BaseASTNode<'array'> {
  /** the array items */
  readonly children: Array<ASTNode>;
}

export interface NullASTNode extends BaseASTNode<'null'> {
  /** the raw value */
  readonly value: null;
}

export interface EmptyASTNode extends BaseASTNode<'empty'> {
  /** the raw value */
  readonly value: undefined;
}

export interface PropertyASTNode<T extends ASTNode = ASTNode>
  extends BaseASTNode<'property'> {
  /** the key of the property */
  readonly keyNode: StringASTNode;

  /** the value of the property */
  readonly valueNode?: T;
}

// Object like things
export interface ObjectASTNode<T extends string = 'object'>
  extends BaseASTNode<T> {
  /** an array of properties of this object */
  properties: Array<PropertyASTNode>;
}

// Player Semantic Nodes
export interface AssetASTNode extends ObjectASTNode<'asset'> {
  /** The id property for this asset */
  readonly id?: PropertyASTNode<StringASTNode>;

  /** The type property for this asset */
  readonly assetType?: PropertyASTNode<StringASTNode>;
}

export interface ViewASTNode extends ObjectASTNode<'view'> {
  /** the id property for this view */
  readonly id?: PropertyASTNode<StringASTNode>;

  /** the type of the view */
  readonly viewType?: PropertyASTNode<StringASTNode>;
}

export interface ContentASTNode extends ObjectASTNode<'content'> {
  /** the views prop of the flow */
  readonly views?: PropertyASTNode<ArrayASTNode>;

  /** the nav prop of the flow */
  readonly navigation?: PropertyASTNode<NavigationASTNode>;
}

export interface NavigationASTNode extends ObjectASTNode<'navigation'> {
  /** the begin prop of the navigation node */
  readonly begin?: PropertyASTNode;

  /** the flows of the navigation node */
  readonly flows: Array<PropertyASTNode<FlowASTNode>>;
}

export interface FlowASTNode extends ObjectASTNode<'flow'> {
  /** the start prop of the node */
  readonly start?: PropertyASTNode<StringASTNode>;

  /** the defined states */
  readonly states: Array<PropertyASTNode<FlowStateASTNode>>;
}

export interface FlowStateASTNode extends ObjectASTNode<'state'> {
  /** the type of the flow state */
  readonly stateType?: PropertyASTNode<StringASTNode>;
}

/** The base class for any node implementation */
export abstract class ASTNodeImpl {
  public readonly parent: ASTNode | undefined;
  public readonly jsonNode: Node;

  constructor(jsonNode: Node, parent: ASTNode | undefined) {
    this.jsonNode = jsonNode;
    this.parent = parent;
  }
}

/** An implementation of a string node */
export class StringASTNodeImpl extends ASTNodeImpl implements StringASTNode {
  public type = 'string' as const;
  public value: string;

  constructor(jsonNode: Node, parent?: ASTNode) {
    super(jsonNode, parent);
    this.value = jsonNode.value;
  }
}

/** An implementation of the number node */
export class NumberASTNodeImpl extends ASTNodeImpl implements NumberASTNode {
  public type = 'number' as const;
  public value: number;

  constructor(jsonNode: Node, parent?: ASTNode) {
    super(jsonNode, parent);
    this.value = jsonNode.value;
  }
}

/** An implementation of a boolean node */
export class BooleanASTNodeImpl extends ASTNodeImpl implements BooleanASTNode {
  public type = 'boolean' as const;
  public value: boolean;

  constructor(jsonNode: Node, parent?: ASTNode) {
    super(jsonNode, parent);
    this.value = jsonNode.value;
  }
}

/** An implementation of a null node */
export class NullASTNodeImpl extends ASTNodeImpl implements NullASTNode {
  public type = 'null' as const;
  public value = null;
}

/** An implementation of a property node */
export class PropertyASTNodeImpl
  extends ASTNodeImpl
  implements PropertyASTNode
{
  public type = 'property' as const;
  public keyNode: StringASTNode;
  public valueNode?: ASTNode;

  constructor(
    jsonNode: Node,
    parent: ASTNode | undefined,
    keyNode: StringASTNode
  ) {
    super(jsonNode, parent);
    this.keyNode = keyNode;
  }

  public get children() {
    return this.valueNode ? [this.keyNode, this.valueNode] : [this.keyNode];
  }
}

/** An implementation of a view node */
export class ViewASTNodeImpl extends ASTNodeImpl implements ViewASTNode {
  public type = 'view' as const;
  public properties: PropertyASTNode[] = [];
  public id?: PropertyASTNode<StringASTNode> = undefined;
  public viewType?: PropertyASTNode<StringASTNode> = undefined;

  public get children() {
    return this.properties;
  }
}

/** An implementation of a top flow node */
export class ContentASTNodeImpl extends ASTNodeImpl implements ContentASTNode {
  public type = 'content' as const;
  public properties: PropertyASTNode[] = [];
  public views?: PropertyASTNode<ArrayASTNode> = undefined;
  public navigation?: PropertyASTNode<NavigationASTNode> = undefined;

  public get children() {
    return this.properties;
  }
}

/** An implementation of a navigation node */
export class NavigationASTNodeImpl
  extends ASTNodeImpl
  implements NavigationASTNode
{
  public type = 'navigation' as const;
  public properties: PropertyASTNode[] = [];
  public begin?: PropertyASTNode<StringASTNode> = undefined;
  public flows: Array<PropertyASTNode<FlowASTNode>> = [];

  public get children() {
    return this.properties;
  }
}

/** An implementation of a flow node */
export class FlowASTNodeImpl extends ASTNodeImpl implements FlowASTNode {
  public type = 'flow' as const;
  public properties: PropertyASTNode[] = [];
  public start?: PropertyASTNode<StringASTNode> = undefined;
  public states: Array<PropertyASTNode<FlowStateASTNode>> = [];

  public get children() {
    return this.properties;
  }
}

/** An implementation of a flow-state node */
export class FlowStateASTNodeImpl
  extends ASTNodeImpl
  implements FlowStateASTNode
{
  public type = 'state' as const;
  public properties: PropertyASTNode[] = [];
  public stateType?: PropertyASTNode<StringASTNode> = undefined;

  public get children() {
    return this.properties;
  }
}

/** An implementation of an asset node */
export class AssetASTNodeImpl extends ASTNodeImpl implements AssetASTNode {
  public type = 'asset' as const;
  public properties: PropertyASTNode[] = [];
  public id?: PropertyASTNode<StringASTNode> = undefined;
  public assetType?: PropertyASTNode<StringASTNode> = undefined;

  public get children() {
    return this.properties;
  }
}

/** An implementation of a array node */
export class ArrayASTNodeImpl extends ASTNodeImpl implements ArrayASTNode {
  public type = 'array' as const;
  public items: ASTNode[] = [];

  public get children() {
    return this.items;
  }
}

/** An implementation of an object node */
export class ObjectASTNodeImpl extends ASTNodeImpl implements ObjectASTNode {
  public type = 'object' as const;
  public properties: PropertyASTNode[] = [];

  public get children() {
    return this.properties;
  }
}

// Edits

export type NodeEdit = ReplaceEdit;

export interface BaseNodeEdit<T extends string> {
  /** The type of node edit */
  type: T;

  /** the node to edit */
  node: ASTNode;
}

export interface ReplaceEdit extends BaseNodeEdit<'replace'> {
  /** the new value to replace with */
  value: any;
}
