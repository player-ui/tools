import type { FragmentProps, JSXElement } from "./types";

export function Fragment(
  props: FragmentProps,
): JSXElement | JSXElement[] | undefined {
  return props.children;
}

/**
 * Create a JSX element (replaces React.createElement)
 * @param type - Element type (function, string, or special symbol)
 * @param props - Element properties
 * @param children - Child elements
 * @returns JSX element object
 */
export function createElement(
  type: JSXElement["type"],
  props: JSXElement["props"],
  ...children: JSXElement[]
): JSXElement {
  // Process children to flatten arrays and filter nulls
  const processedChildren =
    children.length > 0 ? children.flat().filter((child) => child != null) : [];

  const combinedProps = props ? { ...props } : {};

  if (processedChildren.length > 0) {
    combinedProps.children =
      processedChildren.length === 1 ? processedChildren[0] : processedChildren;
  }

  return {
    type,
    props: combinedProps,
    $$typeof: Symbol.for("jsx.element"),
  };
}
