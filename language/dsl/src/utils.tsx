import * as React from "react";
import {
  expression,
  ExpressionTemplateInstance,
  isTemplateStringInstance,
  TemplateStringComponent,
} from "./string-templates";
import type {
  ExpressionArray,
  toJsonOptions,
  WithTemplateTypes,
} from "./types";
import { ExpressionHandler } from "@player-ui/player";

/** Get an array version of the value */
export function toArray<T>(val: T | Array<T>): Array<T> {
  return Array.isArray(val) ? val : [val];
}

/** Create a component version  */
export function toJsonElement(
  value: any,
  indexOrKey?: number | string,
  options?: toJsonOptions,
): React.ReactElement {
  const indexProp = typeof indexOrKey === "number" ? { key: indexOrKey } : null;

  /** Allow users to pass in BindingTemplateInstance and ExpressionTemplateInstance directly without turning them into strings first */
  if (isTemplateStringInstance(value)) {
    if (
      typeof indexOrKey === "string" &&
      options?.propertiesToSkip?.includes(indexOrKey)
    ) {
      return <value {...indexProp}>{value.toValue()}</value>;
    }

    return <value {...indexProp}>{value.toRefString()}</value>;
  }

  if (Array.isArray(value)) {
    return (
      <array {...indexProp}>
        {value.map((item, idx) => toJsonElement(item, idx, options))}
      </array>
    );
  }

  if (typeof value === "object" && value !== null) {
    return (
      <obj {...indexProp}>
        {Object.keys(value).map((key) => (
          <property key={key} name={key}>
            {toJsonElement(value[key], key, options)}
          </property>
        ))}
      </obj>
    );
  }

  return <value {...indexProp} value={value} />;
}

/** Create a fragment for the properties */
export function toJsonProperties(
  value: Record<string, any>,
  options: toJsonOptions = { propertiesToSkip: ["applicability"] },
): React.JSX.Element[] {
  return Object.keys(value).map((key) => {
    return (
      <property key={key} name={key}>
        {toJsonElement(value[key], key, options)}
      </property>
    );
  });
}

/** Create a text asset if needed */
export function normalizeText(options: {
  /** The current node */
  node: React.ReactNode;

  /** A component to render a text asset */
  TextComp?: React.ComponentType<any>;
}): React.ReactNode {
  const { node, TextComp } = options;

  const nodeArr = React.Children.toArray(node);

  if (
    nodeArr.every(
      (n) => React.isValidElement(n) && n.type !== TemplateStringComponent,
    )
  ) {
    return node;
  }

  if (TextComp) {
    return <TextComp>{nodeArr}</TextComp>;
  }

  throw new Error(
    `Tried to convert node to Text Asset, but no Component was supplied.`,
  );
}

/** Create a collection if needed */
export function normalizeToCollection(options: {
  /** the node to look at */
  node: React.ReactNode;

  /** A Text asset */
  TextComp?: React.ComponentType;

  /** A collection asset */
  CollectionComp?: React.ComponentType<any>;
}): React.ReactNode {
  const { node, CollectionComp } = options;

  if (
    React.Children.count(node) > 1 &&
    React.Children.toArray(node).every((n) => typeof n !== "string")
  ) {
    if (!CollectionComp) {
      throw new Error(
        `Tried to convert array to a collection asset, but no Component was given.`,
      );
    }

    return <CollectionComp>{node}</CollectionComp>;
  }

  return normalizeText({ ...options, node });
}

type ReactChildArray = ReturnType<typeof React.Children.toArray>;

/**
 *
 * Hoisted from https://github.com/gregberge/react-flatten-children/blob/master/src/index.tsx
 * Peer dependencies were wrong and can't be reasonably patch it everywhere
 */
export function flattenChildren(children: React.ReactNode): ReactChildArray {
  const childrenArray = React.Children.toArray(children);
  return childrenArray.reduce((flatChildren: ReactChildArray, child) => {
    if ((child as React.ReactElement<any>).type === React.Fragment) {
      return flatChildren.concat(
        flattenChildren((child as React.ReactElement<any>).props.children),
      );
    }

    flatChildren.push(child);

    return flatChildren;
  }, []);
}
/**
 * Hoisted from https://github.com/gregberge/react-merge-refs/blob/main/src/index.tsx
 * Published packages are ESM only or have bad esm distributions causing issues when
 * used in an esm environment
 */
export function mergeRefs<T = any>(
  refs: Array<
    React.MutableRefObject<T> | React.LegacyRef<T> | undefined | null
  >,
): React.RefCallback<T> {
  return (value) => {
    refs.forEach((ref) => {
      if (typeof ref === "function") {
        ref(value);
      } else if (ref != null) {
        (ref as React.MutableRefObject<T | null>).current = value;
      }
    });
  };
}

/** Generates object reference properties from the provided object */
export function getObjectReferences<
  OriginalPropertiesObject extends Record<string, unknown>,
  ReferencesPropertyObject extends Record<string, unknown>,
>(propertiesObject: OriginalPropertiesObject): ReferencesPropertyObject {
  const result: any = {};

  for (const itemProp in propertiesObject) {
    if (Object.prototype.hasOwnProperty.call(propertiesObject, itemProp)) {
      const refName = `${itemProp}Ref`;
      result[refName as keyof ReferencesPropertyObject] = { type: itemProp };
    }
  }

  return result;
}

function parseArg(arg: unknown, deref = false): any {
  if (isTemplateStringInstance(arg)) {
    return `'${deref ? arg.toRefString() : arg.toValue()}'`;
  } else if (Array.isArray(arg)) {
    return `[${arg.map((a) => parseArg(a, true)).join(", ")}]`;
  } else if (typeof arg === "string") {
    return `'${arg}'`;
  } else {
    return arg;
  }
}

export function generateDSLFunction<R>(
  name: string,
  args: Array<unknown>,
): ExpressionTemplateInstance<R> {
  const expressionArgs: Array<unknown> = [];
  args.forEach((arg) => {
    expressionArgs.push(parseArg(arg));
  });

  return expression`${name}(${expressionArgs.join(", ")})`;
}

export function wrapFunctionInType<T extends Array<unknown>, R>(
  fn: ExpressionHandler<T, R>,
): (...args: WithTemplateTypes<T>) => ExpressionTemplateInstance<R> {
  return (...args: WithTemplateTypes<T>): ExpressionTemplateInstance<R> => {
    return generateDSLFunction(fn.name, args);
  };
}

/**
 * Takes map of functions and wraps them in a DSL syntax generator
 */
export function mapExpressionHandlersToFunctions<
  T extends Record<string, ExpressionHandler<any, any>>,
>(functions: T): ExpressionArray<T> {
  const result: any = {};
  for (const fn of Object.values(functions)) {
    result[fn.name] = wrapFunctionInType(fn);
  }
  return result;
}
