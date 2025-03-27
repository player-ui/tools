import {
  type ASTNode,
  type ObjectASTNode,
  type ArrayASTNode,
  type PropertyASTNode,
  type ValueASTNode,
  type JsonType,
  isTaggedTemplateValue,
  isASTNode,
  TaggedTemplateValue,
} from "./types";

/**
 * Creates an object AST node
 * @param props - Optional properties map
 * @returns Object AST node
 */
export function createObjectNode(
  props: Map<string, JsonType> = new Map()
): ObjectASTNode {
  return {
    kind: "obj",
    props,
    parent: null,
    children: [],
  };
}

/**
 * Creates an array AST node
 * @param props - Optional properties map
 * @returns Array AST node
 */
export function createArrayNode(
  props: Map<string, JsonType> = new Map()
): ArrayASTNode {
  return {
    kind: "array",
    props,
    parent: null,
    children: [],
  };
}

/**
 * Creates a property AST node
 * @param name - Property name
 * @param value - Optional property value
 * @returns Property AST node
 */
export function createPropertyNode(
  name: string,
  value?: JsonType
): PropertyASTNode {
  return {
    kind: "property",
    name,
    value,
    parent: null,
    children: [],
    props: new Map(),
  };
}

/**
 * Creates a value AST node
 * @param value - Optional value
 * @returns Value AST node
 */
export function createValueNode(
  value?: JsonType | TaggedTemplateValue
): ValueASTNode {
  return {
    kind: "value",
    value: isTaggedTemplateValue(value) ? value.toRefString() : value,
    props: new Map(),
    parent: null,
    children: [],
  };
}

// Cache for handling circular references during value processing
const processValueCache = new WeakMap<object, unknown>();

/**
 * Processes a value to handle circular references and templates
 * @param value - Value to process
 * @returns Processed value
 */
function processValue(value: JsonType | unknown): unknown {
  // Fast path for primitives
  if (value === null || typeof value !== "object") {
    return value;
  }

  // Check for circular references
  if (processValueCache.has(value)) {
    return processValueCache.get(value);
  }

  // Create the result object/array first so we can establish references before recursing
  let result: unknown;

  if (isTaggedTemplateValue(value)) {
    result = value.toRefString();
    processValueCache.set(value, result);
    return result;
  } else if (Array.isArray(value)) {
    // Create the array first
    result = [];
    // Store the reference immediately for circular reference handling
    processValueCache.set(value, result);

    // Now populate the array with processed items
    for (let i = 0; i < value.length; i++) {
      const processedItem = isASTNode(value[i])
        ? toJSON(value[i])
        : processValue(value[i]);
      (result as unknown[]).push(processedItem);
    }
  } else {
    // For objects, create empty object first
    result = {};
    // Store the reference immediately for circular reference handling
    processValueCache.set(value, result);

    // Now populate the object with processed properties
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const val = value[key as keyof typeof value];
      (result as Record<string, unknown>)[key] = isASTNode(val)
        ? toJSON(val)
        : processValue(val);
    }
  }

  return result;
}

/**
 * Converts an AST node to JSON
 * @param node - AST node to convert
 * @returns JSON representation
 */
export function toJSON(node: ASTNode): unknown {
  switch (node.kind) {
    case "value": {
      if (node.value !== undefined) {
        return processValue(node.value);
      }
      const firstChild = node.children[0];
      return firstChild ? toJSON(firstChild) : undefined;
    }

    case "property": {
      if (node.value !== undefined) {
        return processValue(node.value);
      }

      if (node.children.length === 0) {
        return undefined;
      }

      for (let i = 0; i < node.children.length; i++) {
        const child = node.children[i];
        if (
          child.kind !== "value" &&
          (child.kind === "obj" || child.kind === "array")
        ) {
          return toJSON(child);
        }
      }

      return toJSON(node.children[0]);
    }

    case "array": {
      const result: unknown[] = [];

      const items = node.props.get("items");
      if (items !== undefined) {
        if (Array.isArray(items)) {
          result.push(...items.map(processValue));
        } else {
          result.push(processValue(items));
        }
      }

      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        const value = toJSON(children[i]);
        if (value !== undefined) {
          result.push(value);
        }
      }

      return result;
    }

    case "obj": {
      const result: Record<string, unknown> = {};

      if (node.props.size > 0) {
        for (const [key, value] of node.props) {
          if (value !== undefined) {
            result[key] = processValue(value);
          }
        }
      }

      const children = node.children;
      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.kind === "property") {
          const value = toJSON(child);
          if (value !== undefined) {
            result[child.name] = value;
          }
        }
      }

      return result;
    }
  }
}

/**
 * Inserts a child node into a parent node
 * @param parent - Parent node
 * @param child - Child node to insert
 */
export function insertNode(parent: ASTNode, child: ASTNode): void {
  if (!parent || !child) return;
  parent.children.push(child);
  child.parent = parent;
}

/**
 * Removes a child node from a parent node
 * @param parent - Parent node
 * @param child - Child node to remove
 */
export function removeNode(parent: ASTNode, child: ASTNode): void {
  if (!parent || !child) return;
  const index = parent.children.indexOf(child);
  if (index !== -1) {
    parent.children.splice(index, 1);
    child.parent = null;
  }
}

// Cache valid tag names for faster lookup
const VALID_TAGS = new Set(["obj", "array", "property", "value"]);

/**
 * Creates an element based on type
 * @param type - Element type
 * @returns AST node of the specified type
 * @throws Error if type is invalid
 */
export function createElement(type: string): ASTNode {
  if (!VALID_TAGS.has(type)) {
    throw new Error(
      `Unsupported JSX tag: ${type}. Supported tags: obj, array, property, value.`
    );
  }

  switch (type) {
    case "obj":
      return createObjectNode();
    case "array":
      return createArrayNode();
    case "property":
      return createPropertyNode("");
    case "value":
    default:
      return createValueNode();
  }
}
