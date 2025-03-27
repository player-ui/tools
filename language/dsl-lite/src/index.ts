// Re-export DSL runtime
export { createElement, Fragment } from "./jsx-runtime.js";

// Re-export AST node types and utilities
export {
  createObjectNode,
  createArrayNode,
  createPropertyNode,
  createValueNode,
  insertNode,
  removeNode,
  toJSON,
} from "./nodes.js";

// Re-export AST node types
export type {
  ASTNode,
  ObjectASTNode,
  ArrayASTNode,
  PropertyASTNode,
  ValueASTNode,
} from "./types.js";

// Re-export tagged-template utilities
export { binding, expression } from "./tagged-templates.js";

// Re-export render function
export { render } from "./render.js";
