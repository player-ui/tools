import * as DSL from "./index";
import {
  ObjectASTNode,
  ArrayASTNode,
  PropertyASTNode,
  ValueASTNode,
} from "./global";

export { Fragment } from "./index";

/**
 * JSX namespace - provides types for JSX runtime
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
 * Create a DSL element for non-spread attributes.
 * This is used by the JSX transpiler.
 */
export function jsx(
  type: DSL.ElementType,
  props: unknown,
  key?: DSL.Key | null,
): DSL.ReactElement;

/**
 * Create a DSL element for spread attributes.
 * This is used by the JSX transpiler.
 */
export function jsxs(
  type: DSL.ElementType,
  props: unknown,
  key?: DSL.Key | null,
): DSL.ReactElement;
