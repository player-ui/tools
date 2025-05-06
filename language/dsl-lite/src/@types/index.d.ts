/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  ObjectASTNode,
  ArrayASTNode,
  PropertyASTNode,
  ValueASTNode,
} from "./global";

/// <reference path="global.d.ts" />

export = DSL;
export as namespace DSL;

declare namespace DSL {
  // Core types for our JSX elements

  /**
   * JSON-compatible primitive type
   */
  type JsonType =
    | string
    | number
    | boolean
    | null
    | JsonType[]
    | { [key: string]: JsonType };

  /**
   * Reference object for accessing AST nodes
   */
  interface RefObject<T> {
    readonly current: T | null;
  }

  /**
   * Callback-style ref
   */
  type RefCallback<T> = (instance: T | null) => void;

  /**
   * Ref that can be either an object or callback
   */
  type Ref<T> = RefObject<T> | RefCallback<T> | null;

  /**
   * Key type for elements
   */
  type Key = string | number;

  /**
   * Base attributes for all elements
   */
  interface Attributes {
    key?: Key | null | undefined;
  }

  /**
   * Attributes specific to elements that can accept refs
   */
  interface RefAttributes<T> extends Attributes {
    ref?: Ref<T> | undefined;
  }

  /**
   * Element type for components
   */
  type ElementType<P = any> = ComponentType<P> | string;

  /**
   * Component type - function components only since we don't support classes
   */
  type ComponentType<P = Record<string, unknown>> = FunctionComponent<P>;

  /**
   * Constructor for JSX elements
   */
  type JSXElementConstructor<P> = (props: P) => ReactElement;

  /**
   * Core React element structure
   */
  interface ReactElement<
    P = any,
    T extends string | JSXElementConstructor<any> =
      | string
      | JSXElementConstructor<any>,
  > {
    type: T;
    props: P;
    key?: string;
    $$typeof: symbol;
  }

  /**
   * Simple function component - only interface we support
   */
  interface FunctionComponent<P = Record<string, unknown>> {
    (props: P): ReactElement | null;
    displayName?: string | undefined;
  }

  /**
   * Shorthand for FunctionComponent
   */
  type FC<P = Record<string, unknown>> = FunctionComponent<P>;

  // Hooks

  /**
   * Type for setState actions in useState
   */
  type SetStateAction<S> = S | ((prevState: S) => S);

  /**
   * Dispatch function type for state updates
   */
  type Dispatch<A> = (value: A) => void;

  /**
   * Context type
   */
  interface Context<T> {
    Provider: Provider<T>;
    $$typeof: symbol;
    _defaultValue: T;
  }

  /**
   * Context provider component
   */
  interface Provider<T> {
    (props: ProviderProps<T>): ReactElement;
    $$typeof: symbol;
    _context: Context<T>;
  }

  /**
   * Props for context providers
   */
  interface ProviderProps<T> {
    value: T;
    children?: ReactNode;
  }

  // ReactNode types

  /**
   * ReactNode is anything that can be rendered
   */
  type ReactNode =
    | ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>;

  /**
   * Create a React element (JSX factory)
   */
  function createElement(
    type: ElementType,
    props?: any,
    ...children: ReactNode[]
  ): ReactElement;

  /**
   * Fragment component
   */
  const Fragment: unique symbol;

  /**
   * Create a context
   */
  function createContext<T>(defaultValue: T): Context<T>;

  /**
   * useState hook
   */
  function useState<S>(
    initialState: S | (() => S),
  ): [S, Dispatch<SetStateAction<S>>];

  /**
   * useRef hook
   */
  function useRef<T>(initialValue: T): RefObject<T>;

  /**
   * useContext hook
   */
  function useContext<T>(context: Context<T>): T;
}

// JSX namespace
declare global {
  namespace JSX {
    type Element = DSL.ReactElement;

    interface ElementClass {
      $$typeof?: symbol;
    }

    interface ElementAttributesProperty {
      props: Record<string, unknown>;
    }

    interface ElementChildrenAttribute {
      children: unknown;
    }

    type IntrinsicAttributes = DSL.Attributes;

    type IntrinsicClassAttributes<T> = DSL.RefAttributes<T>;

    // Define our specific intrinsic elements
    interface IntrinsicElements {
      obj: {
        type?: string;
        id?: string;
        children?: DSL.ReactNode;
        ref?: DSL.Ref<ObjectASTNode>;
        [key: string]: any;
      };
      array: {
        items?: any[];
        children?: DSL.ReactNode;
        ref?: DSL.Ref<ArrayASTNode>;
        [key: string]: any;
      };
      property: {
        name: string;
        value?: DSL.JsonType | any;
        children?: DSL.ReactNode;
        ref?: DSL.Ref<PropertyASTNode>;
      };
      value: {
        value?: DSL.JsonType | any;
        children?: DSL.ReactNode;
        ref?: DSL.Ref<ValueASTNode>;
      };
    }
  }
}
