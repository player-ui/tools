import {
  createObjectNode,
  createArrayNode,
  createPropertyNode,
  createValueNode,
} from "./nodes";
import {
  isTaggedTemplateValue,
  isASTNode,
  type JSXElement,
  type JsonType,
  type ASTNode,
  isJSXElement,
  JSXComponent,
  IntrinsicElementProps,
} from "./types";
import { Fragment } from "./jsx-runtime";

/**
 * Render a JSX tree to JSON
 * @param element - JSX element to render
 * @returns Object containing rendered JSON value and AST node
 */
export function render(element: JSXElement): {
  jsonValue: JsonType;
  jsonNode: ASTNode;
} {
  const jsonNode = renderToAST(element);

  const jsonValue = astNodeToJSON(jsonNode);

  return { jsonValue, jsonNode };
}

// Cache for fragments in objects to prevent duplicate processing
const fragmentCache = new WeakMap<JSXElement, ASTNode>();

/**
 * Render a JSX element to an AST node
 * @param element - Element to render
 * @param parent - Optional parent node
 * @returns Rendered AST node
 */
export function renderToAST(
  element: JSXElement | JSXElement[] | JsonType | ASTNode | null | undefined,
  parent?: ASTNode
): ASTNode {
  if (element == null) {
    return createValueNode(null);
  }

  if (typeof element !== "object") {
    return createValueNode(element);
  }

  if (Array.isArray(element)) {
    const arrayNode = createArrayNode();

    if (element.length > 0) {
      for (let i = 0; i < element.length; i++) {
        const child = element[i];
        const childNode = renderToAST(child, arrayNode);
        arrayNode.children.push(childNode);
        childNode.parent = arrayNode;
      }
    }

    return arrayNode;
  }

  // Handle case for AST nodes passed directly
  if (isASTNode(element)) {
    return element;
  }

  if (!isJSXElement(element)) {
    return createValueNode(element);
  }

  if (parent && fragmentCache.has(element)) {
    return fragmentCache.get(element) as ASTNode;
  }

  const { type, props } = element;

  // Handle fragment (use its children directly)
  if (type === Fragment) {
    // If no children in fragment, return null value
    if (!props.children) {
      return createValueNode(null);
    }

    // If children is an array
    if (Array.isArray(props.children)) {
      // Special case for fragments in obj elements
      if (parent && parent.kind === "obj") {
        for (let i = 0; i < props.children.length; i++) {
          const child = props.children[i];

          // Only process property nodes
          if (child && child.$$typeof && child.type === "property") {
            // Create property node directly from the JSX property element
            const propNode = createPropertyNode(
              child.props.name,
              child.props.value
            );
            parent.children.push(propNode);
            propNode.parent = parent;
          } else if (child != null) {
            const childNode = renderToAST(child, parent);
            if (childNode && childNode !== parent) {
              parent.children.push(childNode);
              childNode.parent = parent;
            }
          }
        }

        // Cache the result with this parent for potential reuse
        fragmentCache.set(element, parent);
        return parent;
      } else {
        const arrayNode = createArrayNode();

        for (let i = 0; i < props.children.length; i++) {
          const child = props.children[i];
          if (child != null) {
            const childNode = renderToAST(child, arrayNode);
            if (childNode && childNode !== arrayNode) {
              arrayNode.children.push(childNode);
              childNode.parent = arrayNode;
            }
          }
        }

        // Cache the result for potential reuse
        fragmentCache.set(element, arrayNode);
        return arrayNode;
      }
    }

    // Single child - optimize by rendering directly
    const result = renderToAST(props.children as JSXElement, parent);
    fragmentCache.set(element, result);
    return result;
  }

  // Handle component functions
  if (typeof type === "function") {
    return renderComponent(
      type as JSXComponent<Record<string, unknown>>,
      props,
      parent
    );
  }

  // Handle intrinsic elements
  return renderIntrinsic(type as string, props);
}

/**
 * Render a component function
 * @param Component - Component function
 * @param props - Component props
 * @param parent - Optional parent node
 * @returns Rendered AST node
 */
function renderComponent<P extends Record<string, unknown>>(
  Component: JSXComponent<P>,
  props: P | null,
  parent?: ASTNode
): ASTNode {
  const result = Component(props || ({} as P));

  // Render the result
  return renderToAST(result, parent);
}

/**
 * Render an intrinsic element
 * @param type - Element type string
 * @param props - Element props
 * @returns Rendered AST node
 */
function renderIntrinsic(type: string, props: IntrinsicElementProps): ASTNode {
  const { children, ref, ...restProps } = props || {};

  switch (type) {
    case "obj":
    case "object": {
      const objNode = createObjectNode();

      // Add properties from attributes efficiently
      if (restProps && Object.keys(restProps).length > 0) {
        for (const key in restProps) {
          objNode.props.set(key, restProps[key] as JsonType);
        }
      }

      // Add children
      if (children) {
        // Special handling for Fragment as direct child
        if (isJSXElement(children) && children.type === Fragment) {
          if (Array.isArray(children.props.children)) {
            for (let i = 0; i < children.props.children.length; i++) {
              const child = children.props.children[i];
              if (child && child.$$typeof && child.type === "property") {
                const propNode = createPropertyNode(
                  child.props.name,
                  child.props.value
                );
                objNode.children.push(propNode);
                propNode.parent = objNode;
              } else if (child != null) {
                const childNode = renderToAST(child, objNode);
                if (childNode && childNode !== objNode) {
                  objNode.children.push(childNode);
                  childNode.parent = objNode;
                }
              }
            }
          } else if (children.props.children) {
            const childNode = renderToAST(
              children.props.children as JSXElement,
              objNode
            );
            if (childNode && childNode !== objNode) {
              objNode.children.push(childNode);
              childNode.parent = objNode;
            }
          }
        } else if (
          Array.isArray(children) &&
          children.some(
            (child) => child && child.$$typeof && child.type === Fragment
          )
        ) {
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child && child.$$typeof && child.type === Fragment) {
              if (Array.isArray(child.props.children)) {
                for (let j = 0; j < child.props.children.length; j++) {
                  const fragChild = child.props.children[j];
                  if (
                    fragChild &&
                    fragChild.$$typeof &&
                    fragChild.type === "property"
                  ) {
                    const propNode = createPropertyNode(
                      fragChild.props.name,
                      fragChild.props.value
                    );
                    objNode.children.push(propNode);
                    propNode.parent = objNode;
                  } else if (fragChild != null) {
                    const childNode = renderToAST(fragChild, objNode);
                    if (childNode && childNode !== objNode) {
                      objNode.children.push(childNode);
                      childNode.parent = objNode;
                    }
                  }
                }
              } else if (child.props.children != null) {
                const childNode = renderToAST(
                  child.props.children as JSXElement,
                  objNode
                );
                if (childNode && childNode !== objNode) {
                  objNode.children.push(childNode);
                  childNode.parent = objNode;
                }
              }
            } else if (child != null) {
              const childNode = renderToAST(child, objNode);
              if (childNode && childNode !== objNode) {
                objNode.children.push(childNode);
                childNode.parent = objNode;
              }
            }
          }
        } else {
          const renderedChildren = renderToAST(children, objNode);
          if (renderedChildren.kind === "array") {
            // If children resulted in an array, add each child
            const childrenArray = renderedChildren.children;
            for (let i = 0; i < childrenArray.length; i++) {
              const child = childrenArray[i];
              objNode.children.push(child);
              child.parent = objNode;
            }
          } else if (renderedChildren !== objNode) {
            // Otherwise add the single child (but don't add itself)
            objNode.children.push(renderedChildren);
            renderedChildren.parent = objNode;
          }
        }
      }

      // Attach ref if provided
      if (ref) {
        ref.current = objNode;
      }

      return objNode;
    }

    case "array": {
      const arrayNode = createArrayNode();

      // Add properties
      if (restProps && Object.keys(restProps).length > 0) {
        for (const key in restProps) {
          arrayNode.props.set(key, restProps[key] as JsonType);
        }
      }

      // Add children
      if (children) {
        const arrayChildren = renderToAST(children, arrayNode);
        if (arrayChildren.kind === "array" && arrayChildren !== arrayNode) {
          // Flatten nested arrays
          const childArray = arrayChildren.children;
          for (let i = 0; i < childArray.length; i++) {
            const child = childArray[i];
            arrayNode.children.push(child);
            child.parent = arrayNode;
          }
        } else if (arrayChildren !== arrayNode) {
          // Add single child
          arrayNode.children.push(arrayChildren);
          arrayChildren.parent = arrayNode;
        }
      }

      // Attach ref if provided
      if (ref) {
        ref.current = arrayNode;
      }

      return arrayNode;
    }

    case "property": {
      const propNode = createPropertyNode(props.name as string, props.value);

      // Add children as value
      if (children) {
        const childNode = renderToAST(children, propNode);
        if (childNode !== propNode) {
          propNode.value = childNode;
          childNode.parent = propNode;
        }
      }

      // Attach ref if provided
      if (ref) {
        ref.current = propNode;
      }

      return propNode;
    }

    case "value": {
      // Special case for string concatenation pattern - if the value node has children that are all value nodes
      // we need to handle this specially to ensure they are concatenated
      if (
        children &&
        props.value === undefined &&
        isValueConcatenation(children)
      ) {
        // Create a value node with a special marker to indicate string concatenation
        const valueNode = createValueNode({
          isStringConcatenation: true,
          children: Array.isArray(children)
            ? children.map((c) => ({
              type: c.type,
              props: c.props,
            }))
            : [
              {
                type: (children as any).type,
                props: (children as any).props,
              },
            ],
        } as unknown as JsonType);

        // Attach ref if provided
        if (ref) {
          ref.current = valueNode;
        }

        return valueNode;
      }

      // Handle value props first (normal case)
      const valueNode = createValueNode(
        (props.value !== undefined ? props.value : children) as JsonType
      );

      // Handle JSX children for the <value> element
      if (children && props.value === undefined) {
        if (Array.isArray(children)) {
          // Create child nodes for each item
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (child != null) {
              const childNode = renderToAST(child, valueNode);
              valueNode.children.push(childNode);
              childNode.parent = valueNode;
            }
          }
        } else {
          // Create a child node for a single item
          const childNode = renderToAST(children, valueNode);
          valueNode.children.push(childNode);
          childNode.parent = valueNode;
        }
      }

      // Attach ref if provided
      if (ref) {
        ref.current = valueNode;
      }

      return valueNode;
    }

    default:
      throw new Error(`Unknown intrinsic element: ${type}`);
  }
}

/**
 * Check if the children of a value element represent a string concatenation pattern
 * @param children - Children to check
 * @returns True if all children are value elements with string values
 */
function isValueConcatenation(children: any): boolean {
  // First check if we have an array of children
  if (!Array.isArray(children)) {
    return false;
  }

  // Then check if all children are value elements
  return children.every(
    (child) =>
      child &&
      child.$$typeof === Symbol.for("jsx.element") &&
      child.type === "value"
  );
}

// Use a Map for memo cache for faster lookups
const processNodeValueCache = new WeakMap<object, JsonType>();
// Set to track objects currently being processed (for better circular ref detection)
const processingSet = new WeakSet<object>();

/**
 * Process values, recursively handling TaggedTemplateValue and nested objects
 * @param value - Value to process
 * @returns Processed JSON value
 */
function processNodeValue(value: unknown): JsonType {
  // Handle nulls and primitives first (fast path)
  if (value === null) {
    return null;
  }

  if (typeof value !== "object") {
    return value as JsonType;
  }

  // Check memo cache first for objects (prevents circular refs)
  if (processNodeValueCache.has(value)) {
    return processNodeValueCache.get(value) as JsonType;
  }

  // Detect circular reference - if we're already processing this object
  if (processingSet.has(value)) {
    return null; // Break the circular reference
  }

  // Handle JSX elements - process them through renderToAST
  if (isJSXElement(value)) {
    const node = renderToAST(value);
    return astNodeToJSON(node);
  }

  // Handle TaggedTemplateValue objects
  if (isTaggedTemplateValue(value)) {
    return value.toString();
  }

  // Mark this object as being processed
  processingSet.add(value);

  try {
    // Handle arrays
    if (Array.isArray(value)) {
      const result = value.map(processNodeValue);
      processNodeValueCache.set(value, result);
      return result;
    }

    // Handle objects (recursively process each property)
    if (typeof value === "object") {
      // Check if it's an AST node
      if ("kind" in value) {
        const result = astNodeToJSON(value as ASTNode);
        processNodeValueCache.set(value, result);
        return result;
      }

      // Otherwise process each property recursively
      const result: Record<string, JsonType> = {};

      const keys = Object.keys(value) as Array<keyof typeof value>;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        result[key] = processNodeValue(value[key]);
      }

      processNodeValueCache.set(value, result);
      return result;
    }

    // Default fallback (should never reach here)
    return value;
  } finally {
    // Remove from the processing set when done
    processingSet.delete(value);
  }
}

/**
 * Convert AST node to JSON
 * @param node - AST node to convert
 * @returns JSON representation
 */
function astNodeToJSON(node: ASTNode): JsonType {
  switch (node.kind) {
    case "value": {
      // Special case for string concatenation pattern
      if (
        node.value &&
        typeof node.value === "object" &&
        (node.value as any).isStringConcatenation
      ) {
        const concatChildren = (node.value as any).children;
        if (Array.isArray(concatChildren)) {
          // Process each child value element and convert to string
          const stringValues = concatChildren.map((child) => {
            if (child.props.value !== undefined) {
              if (isTaggedTemplateValue(child.props.value)) {
                return child.props.value.toString();
              }
              return String(child.props.value);
            }
            return "";
          });
          return stringValues.join("");
        }
      }

      // Process the value recursively to handle all cases
      if (node.value !== undefined) {
        return processNodeValue(node.value);
      }

      // Handle children
      if (node.children.length > 0) {
        // First, fully process all children to their JSON values
        const childValues = node.children.map((child) => {
          // Force process JSX elements first
          if (isJSXElement(child)) {
            const childNode = renderToAST(child);
            return astNodeToJSON(childNode);
          }
          return astNodeToJSON(child);
        });

        // Check if we can convert all values to strings and concatenate
        const allValuesStringable = childValues.every(
          (v) =>
            typeof v === "string" ||
            v === null ||
            v === undefined ||
            typeof v === "number" ||
            typeof v === "boolean"
        );

        if (allValuesStringable) {
          // Convert null/undefined to empty strings for concatenation
          const stringValues = childValues.map((v) =>
            v == null ? "" : String(v)
          );
          return stringValues.join("");
        }

        // If there's only one child, return it directly
        if (childValues.length === 1) {
          return childValues[0];
        }

        // Otherwise return the array of values
        return childValues;
      }

      return null;
    }

    case "property": {
      // For property nodes, return the value processed recursively
      if (node.value !== undefined) {
        return processNodeValue(node.value);
      }

      // If it has children, use first child's value
      if (node.children.length > 0) {
        return astNodeToJSON(node.children[0]);
      }

      return null;
    }

    case "array": {
      // For arrays, map child values (optimized)
      return node.children.map(astNodeToJSON);
    }

    case "obj": {
      // For objects, create an object with properties
      const result: Record<string, JsonType> = {};

      // Add properties from the props Map (if any)
      if (node.props.size > 0) {
        for (const [key, value] of node.props.entries()) {
          if (value !== undefined) {
            result[key] = processNodeValue(value);
          }
        }
      }

      // Add child properties
      const nodeChildren = node.children;
      for (let i = 0; i < nodeChildren.length; i++) {
        const child = nodeChildren[i];

        if (child.kind === "property") {
          const propertyName = child.name;
          const propertyValue = astNodeToJSON(child);

          // Only add non-null/undefined properties
          if (propertyValue !== undefined && propertyValue !== null) {
            result[propertyName] = propertyValue;
          }
        } else if (child.kind === "array") {
          // Handle arrays that might contain property nodes
          const arrayChildren = child.children;
          for (let j = 0; j < arrayChildren.length; j++) {
            const arrayChild = arrayChildren[j];

            if (arrayChild.kind === "property") {
              const propertyName = arrayChild.name;
              const propertyValue = astNodeToJSON(arrayChild);

              if (propertyValue !== undefined && propertyValue !== null) {
                result[propertyName] = propertyValue;
              }
            }
          }
        }
      }

      return result;
    }

    default:
      return null;
  }
}
