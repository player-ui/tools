export type JsonType =
  | string
  | number
  | boolean
  | null
  | JsonType[]
  | { [key: string]: JsonType };

export const TaggedTemplateValueSymbol: unique symbol = Symbol(
  "TaggedTemplateValue",
);

export interface TemplateRefOptions {
  nestedContext?: "binding" | "expression";
}

export interface TaggedTemplateValue {
  [TaggedTemplateValueSymbol]: true;
  toValue(): string;
  toRefString(options?: TemplateRefOptions): string;
  toString(): string;
}

export function isTaggedTemplateValue(
  value: unknown,
): value is TaggedTemplateValue {
  return (
    typeof value === "object" &&
    value !== null &&
    TaggedTemplateValueSymbol in value
  );
}

export interface BaseASTNode {
  kind: string;
  props: Map<string, JsonType>;
  parent: ASTNode | null;
  children: ASTNode[];
}

export interface ObjectASTNode extends BaseASTNode {
  kind: "obj";
}

export interface ArrayASTNode extends BaseASTNode {
  kind: "array";
}

export interface PropertyASTNode extends BaseASTNode {
  kind: "property";
  name: string;
  value?: JsonType | ASTNode;
}

export interface ValueASTNode extends BaseASTNode {
  kind: "value";
  value?: JsonType;
}

export type ASTNode =
  | ObjectASTNode
  | ArrayASTNode
  | PropertyASTNode
  | ValueASTNode;

export function isASTNode(value: unknown): value is ASTNode {
  return Boolean(
    value &&
      typeof value === "object" &&
      "kind" in value &&
      (value.kind === "obj" ||
        value.kind === "array" ||
        value.kind === "property" ||
        value.kind === "value"),
  );
}

export interface JSXElement {
  type:
    | string
    | ((...args: unknown[]) => unknown)
    | symbol
    | { $$typeof: symbol; _context?: unknown };
  props: Record<string, unknown>;
  $$typeof: symbol;
}

export function isJSXElement(value: unknown): value is JSXElement {
  return (
    typeof value === "object" &&
    value !== null &&
    "$$typeof" in value &&
    typeof (value as { $$typeof: symbol }).$$typeof === "symbol" &&
    "props" in value &&
    typeof (value as { props: object }).props === "object" &&
    "type" in value
  );
}

export interface JSXComponent<P> {
  (props: P): JSXElement;
  // supports named slots
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RefObject<T> {
  current: T;
}

export interface FragmentProps {
  children?: JSXElement | JSXElement[];
}

export interface IntrinsicElementProps {
  children?: JSXElement | JSXElement[];
  ref?: RefObject<ASTNode>;
  name?: string;
  value?: JsonType;
  [key: string]: unknown;
}
