export interface Annotations {
  /** The name used to reference this type */
  name?: string;
  /** The path within a type to this type (may be the same as `name` ) */
  title?: string;
  /** The JSDoc string for this type */
  description?: string;
  /** The JSDoc `@example` string for this type */
  examples?: string | Array<string>;
  /** The JSDoc `@default` string for this type */
  default?: string;
  /** The JSDoc `@see` string for this type */
  see?: string | Array<string>;
  /** The Typescript comment associated with the type */
  comment?: string;
  /** The JSDoc `@meta` string for this type */
  meta?: Record<string, string>;
}

export interface Const<T> {
  /** The literal value for the node */
  const?: T;
}
export interface Enum<T> {
  /** The list of enums for the node */
  enum?: Array<T>;
}
export type CommonTypeInfo<T> = Const<T> & Enum<T>;

export interface TypeNode<Name = string> {
  /** The type of Node */
  type: Name;
}

export type AnyType = TypeNode<"any"> & CommonTypeInfo<any> & Annotations;

export type UnknownType = TypeNode<"unknown"> &
  CommonTypeInfo<unknown> &
  Annotations;
export type UndefinedType = TypeNode<"undefined"> &
  CommonTypeInfo<undefined> &
  Annotations;
export type NullType = TypeNode<"null"> & CommonTypeInfo<null> & Annotations;
export type VoidType = TypeNode<"void"> & CommonTypeInfo<void> & Annotations;
export type StringType = TypeNode<"string"> &
  CommonTypeInfo<string> &
  Annotations;
export type NumberType = TypeNode<"number"> &
  CommonTypeInfo<number> &
  Annotations;
export type BooleanType = TypeNode<"boolean"> &
  CommonTypeInfo<boolean> &
  Annotations;
export type NeverType = TypeNode<"never"> & CommonTypeInfo<never> & Annotations;

export interface RefNode extends TypeNode<"ref"> {
  /** Name of the referenced Type */
  ref: string;
  /** Parameters to potentially fill in a generic when it is resolved. Position is preserved */
  genericArguments?: Array<NodeType>;
  /** Optional property to access when the reference is resolved */
  property?: string;
}
export type RefType = RefNode & Annotations;

export interface ObjectProperty {
  /** If this property is required */
  required: boolean;
  /** The type of the property */
  node: NodeType;
}
export interface ObjectNode extends TypeNode<"object"> {
  /** The properties associated with an object */
  properties: {
    [name: string]: ObjectProperty;
  };
  /** A custom primitive that this object extends that is to be resolved when used */
  extends?: RefType;
  /** What type, if any, of additional properties are allowed on the object */
  additionalProperties: false | NodeType;
}
export type ObjectType = ObjectNode & CommonTypeInfo<object> & Annotations;

export interface ArrayNode extends TypeNode<"array"> {
  /** What types are allowed in the array */
  elementType: NodeType;
}
export type ArrayType<T = unknown> = ArrayNode &
  CommonTypeInfo<Array<T>> &
  Annotations;

export interface ConditionalNode extends TypeNode<"conditional"> {
  /** The check arguments */
  check: {
    /** operator */
    left: NodeType;
    /** operand */
    right: NodeType;
  };
  /** The resulting values to use */
  value: {
    /** If the conditional is true */
    true: NodeType;
    /** If the conditional is false */
    false: NodeType;
  };
}

export type ConditionalType = ConditionalNode & Annotations;

export interface TupleMember {
  /** Optional Name of the Tuple Member */
  name?: string;
  /** Type constraint of the Tuple Member */
  type: NodeType;
  /** Is the Tuple Member Optional */
  optional?: boolean;
}

export interface TupleNode extends TypeNode<"tuple"> {
  /** The types in the tuple */
  elementTypes: Array<TupleMember>;
  /** The minimum number of items */
  minItems: number;
  /** What, if any, additional types can be provided */
  additionalItems: false | NodeType;
}
export type TupleType<T extends unknown[] = unknown[]> = TupleNode &
  CommonTypeInfo<T> &
  Annotations;

export type AndType = TypeNode<"and"> &
  Annotations & {
    /** Nodes in intersection */
    and: NodeType[];
  };
export type OrType = TypeNode<"or"> &
  Annotations & {
    /** Nodes in the union */
    or: NodeType[];
  };

export type TemplateLiteralType = TypeNode<"template"> &
  Annotations & {
    /** String version of regex used to validate template */
    format: string;
  };

export type RecordType = TypeNode<"record"> &
  Annotations & {
    /** Key types for the Record */
    keyType: NodeType;
    /** Value types for the Record */
    valueType: NodeType;
  };

export type FunctionTypeParameters = {
  /** String name of the function parameter */
  name: string;
  /** The type constraint of the parameter */
  type: NodeType;
  /** Indicates that the parameter is optional */
  optional?: true;
  /** Default value for the parameter if nothing is supplied */
  default?: NodeType;
};

export type FunctionType = TypeNode<"function"> &
  Annotations & {
    /** Types for the parameters, in order, for the function */
    parameters: Array<FunctionTypeParameters>;
    /** Return type of the function */
    returnType?: NodeType;
  };

/** Primitive Type Nodes */
export type PrimitiveTypes =
  | NeverType
  | NullType
  | StringType
  | NumberType
  | BooleanType
  | AnyType
  | UnknownType
  | UndefinedType
  | VoidType;

/** Set of all Node Types */
export type NodeType =
  | AnyType
  | UnknownType
  | UndefinedType
  | NullType
  | NeverType
  | StringType
  | TemplateLiteralType
  | NumberType
  | BooleanType
  | ObjectType
  | ArrayType
  | TupleType
  | RecordType
  | AndType
  | OrType
  | RefType
  | FunctionType
  | ConditionalType
  | VoidType;

export type NodeTypeStrings = Pick<NodeType, "type">["type"];

export type NodeTypeMap = {
  [K in NodeTypeStrings]: Extract<NodeType, { type: K }>;
};

export type NamedType<T extends NodeType = NodeType> = T & {
  /** Name of the exported interface/type */
  name: string;

  /** File the type was exported from */
  source: string;
};

export interface ParamTypeNode {
  /** Symbol used to identify the generic in the interface/type */
  symbol: string;
  /** The type constraint for the generic */
  constraints?: NodeType;
  /** The default value for the generic if no value is provided */
  default?: NodeType;
}

export type NamedTypeWithGenerics<T extends NodeType = NodeType> =
  NamedType<T> & {
    /** Generics for the Named Type that need to be filled in */
    genericTokens: Array<ParamTypeNode>;
  };

export type NodeTypeWithGenerics<T extends NodeType = NodeType> = T & {
  /** Generics for the Node that need to be filled in */
  genericTokens: Array<ParamTypeNode>;
};
