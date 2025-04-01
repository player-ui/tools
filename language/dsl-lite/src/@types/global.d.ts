/* eslint-disable @typescript-eslint/no-explicit-any */

/*
DSL JSX types that don't include React-specific or DOM-specific interfaces
This provides the minimal global types needed for our JSX compiler
*/

// Basic event type for event handlers if needed
export interface EventBase {
  type: string;
}

// The root node type for our AST
export interface ASTNode {
  kind: string;
  props: Map<string, any>;
  parent: ASTNode | null;
  children: ASTNode[];
}

// Our specialized node types
export interface ObjectASTNode extends ASTNode {
  kind: "obj";
}

export interface ArrayASTNode extends ASTNode {
  kind: "array";
}

export interface PropertyASTNode extends ASTNode {
  kind: "property";
  name: string;
  value?: any;
}

export interface ValueASTNode extends ASTNode {
  kind: "value";
  value?: any;
}
