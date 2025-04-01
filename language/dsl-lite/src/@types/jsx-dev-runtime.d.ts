import * as DSL from "./index";
import {
  ObjectASTNode,
  ArrayASTNode,
  PropertyASTNode,
  ValueASTNode,
} from "./global";

export { Fragment } from "./index";

/**
 * JSX namespace - provides types for JSX runtime in development mode
 */
export namespace JSX {
  // Element type definition - string or component function
  type ElementType = DSL.ElementType;

  // Represents a JSX element in our DSL
  type Element = DSL.ReactElement;

  // Base interface for component classes (not supported, but needed for TypeScript)
  interface ElementClass {
    $$typeof?: symbol;
  }

  // Used to determine the props type for a component
  interface ElementAttributesProperty {
    props: Record<string, unknown>;
  }

  // Used to determine the children prop type
  interface ElementChildrenAttribute {
    children: unknown;
  }

  // Base attributes for all elements
  type IntrinsicAttributes = DSL.Attributes;

  // Attributes for class components with refs
  type IntrinsicClassAttributes<T> = DSL.RefAttributes<T>;

  // Our DSL-specific intrinsic elements
  interface IntrinsicElements {
    obj: {
      type?: string;
      id?: string;
      children?: DSL.ReactNode;
      ref?: DSL.Ref<ObjectASTNode>;
      [key: string]: unknown;
    };
    array: {
      items?: unknown[];
      children?: DSL.ReactNode;
      ref?: DSL.Ref<ArrayASTNode>;
      [key: string]: unknown;
    };
    property: {
      name: string;
      value?: DSL.JsonType | unknown;
      children?: DSL.ReactNode;
      ref?: DSL.Ref<PropertyASTNode>;
    };
    value: {
      value?: DSL.JsonType | unknown;
      children?: DSL.ReactNode;
      ref?: DSL.Ref<ValueASTNode>;
    };
  }
}

/**
 * Source information for debugging
 */
export interface JSXSource {
  fileName?: string;
  lineNumber?: number;
  columnNumber?: number;
}

/**
 * Create a DSL element in development mode.
 * This is used by the JSX transpiler in development mode.
 */
export function jsxDEV(
  type: DSL.ElementType,
  props: unknown,
  key: DSL.Key | null,
  isStatic: boolean,
  source?: JSXSource,
  self?: unknown,
): DSL.ReactElement;
