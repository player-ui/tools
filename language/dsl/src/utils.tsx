import React from 'react';
import {
  isTemplateStringInstance,
  TemplateStringComponent,
} from './string-templates';
import type { toJsonOptions } from './types';

/** Get an array version of the value */
export function toArray<T>(val: T | Array<T>): Array<T> {
  return Array.isArray(val) ? val : [val];
}

/** Create a component version  */
export function toJsonElement(
  value: any,
  indexOrKey?: number | string,
  options?: toJsonOptions
): React.ReactElement {
  const indexProp = typeof indexOrKey === 'number' ? { key: indexOrKey } : null;

  if (Array.isArray(value)) {
    return (
      <array {...indexProp}>
        {value.map((item, idx) => toJsonElement(item, idx, options))}
      </array>
    );
  }

  /** Allow users to pass in BindingTemplateInstance and ExpressionTemplateInstance directly without turning them into strings first */
  if (isTemplateStringInstance(value)) {
    if (
      typeof indexOrKey === 'string' &&
      options?.propertiesToSkip?.includes(indexOrKey)
    ) {
      return <value {...indexProp}>{value.toValue()}</value>;
    }

    return <value {...indexProp}>{value.toRefString()}</value>;
  }

  if (typeof value === 'object' && value !== null) {
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
  options: toJsonOptions = { propertiesToSkip: ['applicability'] }
) {
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
  TextComp?: React.ComponentType;
}): React.ReactNode {
  const { node, TextComp } = options;

  const nodeArr = React.Children.toArray(node);

  if (
    nodeArr.every(
      (n) => React.isValidElement(n) && n.type !== TemplateStringComponent
    )
  ) {
    return node;
  }

  if (TextComp) {
    return <TextComp>{nodeArr}</TextComp>;
  }

  throw new Error(
    `Tried to convert node to Text Asset, but no Component was supplied.`
  );
}

/** Create a collection if needed */
export function normalizeToCollection(options: {
  /** the node to look at */
  node: React.ReactNode;

  /** A Text asset */
  TextComp?: React.ComponentType;

  /** A collection asset */
  CollectionComp?: React.ComponentType;
}) {
  const { node, CollectionComp } = options;

  if (
    React.Children.count(node) > 1 &&
    React.Children.toArray(node).every((n) => typeof n !== 'string')
  ) {
    if (!CollectionComp) {
      throw new Error(
        `Tried to convert array to a collection asset, but no Component was given.`
      );
    }

    return <CollectionComp>{node}</CollectionComp>;
  }

  return normalizeText({ ...options, node });
}
