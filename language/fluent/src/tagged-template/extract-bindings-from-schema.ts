import type { Schema } from "@player-ui/types";
import { binding } from "./binding";
import type { TaggedTemplateValue, ExtractedBindings } from "../types";

/**
 * Set of primitive type names supported by the schema system.
 * These types map directly to JavaScript primitives.
 */
const PRIMITIVE_TYPES = new Set(["StringType", "NumberType", "BooleanType"]);

/**
 * Special path constant used for accessing the current item in array iterations.
 * This allows templates to reference the current array element being processed.
 */
const CURRENT_ARRAY_ITEM_PATH = "_current_";

/**
 * Checks if a given type name represents a primitive data type.
 *
 * Primitive types are those that map directly to JavaScript primitives:
 * - StringType → string
 * - NumberType → number
 * - BooleanType → boolean
 *
 * @param typeName - The schema type name to check
 * @returns True if the type is primitive, false otherwise
 *
 * @example
 * ```typescript
 * isPrimitive("StringType");  // true
 * isPrimitive("NumberType");  // true
 * isPrimitive("CustomType");  // false
 * ```
 */
function isPrimitive(typeName: string): boolean {
  return PRIMITIVE_TYPES.has(typeName);
}

/**
 * Creates a properly typed binding for a given schema type and path.
 *
 * This function maps schema type names to their corresponding TypeScript types
 * and creates TaggedTemplateValue instances with the correct phantom type information.
 *
 * @param typeName - The schema type name (e.g., "StringType", "NumberType")
 * @param path - The data path for the binding (e.g., "user.name", "settings.enabled")
 * @returns A TaggedTemplateValue with the appropriate type annotation
 *
 * @example
 * ```typescript
 * // Creates a string-typed binding
 * const nameBinding = createBinding("StringType", "user.name");
 *
 * // Creates a number-typed binding
 * const ageBinding = createBinding("NumberType", "user.age");
 *
 * // Creates a boolean-typed binding
 * const activeBinding = createBinding("BooleanType", "user.isActive");
 * ```
 */
function createBinding(
  typeName: string,
  path: string,
): TaggedTemplateValue<unknown> {
  switch (typeName) {
    case "StringType":
      return binding<string>`${path}`;
    case "NumberType":
      return binding<number>`${path}`;
    case "BooleanType":
      return binding<boolean>`${path}`;
    default:
      // Fallback to string type for unknown types
      return binding<string>`${path}`;
  }
}

/**
 * Constructs the appropriate data path for array element access.
 *
 * When processing array types, we need to construct a path that refers to the
 * current array element being iterated over. This function handles the path
 * construction logic consistently.
 *
 * @param basePath - The base path to the array property
 * @returns The path for accessing the current array element
 *
 * @example
 * ```typescript
 * buildArrayElementPath("users");     // "users._current_"
 * buildArrayElementPath("");          // "_current_"
 * buildArrayElementPath("data.items"); // "data.items._current_"
 * ```
 */
function buildArrayElementPath(basePath: string): string {
  return basePath
    ? `${basePath}.${CURRENT_ARRAY_ITEM_PATH}`
    : CURRENT_ARRAY_ITEM_PATH;
}

/**
 * Constructs the full property path by combining base path and property key.
 *
 * @param basePath - The base path (can be empty for root-level properties)
 * @param propertyKey - The property name to append
 * @returns The complete path to the property
 *
 * @example
 * ```typescript
 * buildPropertyPath("", "name");        // "name"
 * buildPropertyPath("user", "email");   // "user.email"
 * buildPropertyPath("settings", "ui");  // "settings.ui"
 * ```
 */
function buildPropertyPath(basePath: string, propertyKey: string): string {
  return basePath ? `${basePath}.${propertyKey}` : propertyKey;
}

/**
 * Processes a schema node and converts all its properties to binding structures.
 *
 * A schema node represents an object-like structure with named properties.
 * This function iterates through each property, constructs appropriate paths,
 * and delegates to processDataType for individual property processing.
 *
 * @param node - The schema node containing property definitions
 * @param schema - The complete schema containing all type definitions
 * @param basePath - The base path for properties in this node
 * @param visited - Set of visited type names for circular reference prevention
 * @returns An object with the same structure as the node, but with binding values
 *
 * @example
 * ```typescript
 * // Given a schema node like:
 * const userNode = {
 *   name: { type: "StringType" },
 *   age: { type: "NumberType" },
 *   settings: { type: "SettingsType" }
 * };
 *
 * // processNode returns:
 * {
 *   name: TaggedTemplateValue<string>,      // for "user.name"
 *   age: TaggedTemplateValue<number>,       // for "user.age"
 *   settings: { /＊ nested bindings ＊/ }     // for "user.settings.*"
 * }
 * ```
 */
function processNode(
  node: Schema.Node,
  schema: Schema.Schema,
  basePath: string,
  visited: Set<string> = new Set(),
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Process each property in the node
  for (const [propertyKey, dataType] of Object.entries(node)) {
    const propertyPath = buildPropertyPath(basePath, propertyKey);
    result[propertyKey] = processDataType(
      dataType,
      schema,
      propertyPath,
      visited,
    );
  }

  return result;
}

/**
 * Processes a schema data type and converts it to the appropriate binding structure.
 *
 * This is the core function that handles the conversion of schema types to their
 * corresponding TaggedTemplateValue bindings or nested object structures. It handles:
 *
 * - Primitive types: Direct conversion to typed bindings
 * - Array types: Special handling with current element access patterns
 * - Record types: Recursive processing of nested structures
 * - Complex types: Delegation to processNode for object-like types
 * - Circular reference prevention: Uses visited set to avoid infinite recursion
 *
 * @param dataType - The schema data type definition to process
 * @param schema - The complete schema containing all type definitions
 * @param path - The current data path being processed
 * @param visited - Set of already visited type names to prevent infinite recursion
 * @returns Either a TaggedTemplateValue binding or a nested object structure
 *
 * @example
 * ```typescript
 * // Processing a primitive string type
 * const stringResult = processDataType(
 *   { type: "StringType" },
 *   schema,
 *   "user.name"
 * );
 * // Returns: TaggedTemplateValue<string> for "user.name"
 *
 * // Processing an array of strings
 * const arrayResult = processDataType(
 *   { type: "StringType", isArray: true },
 *   schema,
 *   "user.tags"
 * );
 * // Returns: { name: TaggedTemplateValue<string> } for "user.tags._current_"
 * ```
 */
function processDataType(
  dataType: Schema.DataTypes,
  schema: Schema.Schema,
  path: string,
  visited: Set<string> = new Set(),
): TaggedTemplateValue<unknown> | Record<string, unknown> {
  const typeName = dataType.type;

  // Prevent infinite recursion by checking if we've already processed this type
  if (visited.has(typeName)) {
    return createBinding("StringType", path);
  }

  // Handle array types with special current element access pattern
  if ("isArray" in dataType && dataType.isArray) {
    const arrayElementPath = buildArrayElementPath(path);

    if (isPrimitive(typeName)) {
      // Primitive arrays need special wrapper objects for current element access
      // String arrays use 'name' property, others use 'value' property
      const propertyName = typeName === "StringType" ? "name" : "value";
      return { [propertyName]: createBinding(typeName, arrayElementPath) };
    } else {
      // Complex type arrays: recursively process the element type
      const typeNode = schema[typeName];
      if (typeNode) {
        const newVisited = new Set(visited);
        newVisited.add(typeName);
        return processNode(
          typeNode as Schema.Node,
          schema,
          arrayElementPath,
          newVisited,
        );
      }
      return createBinding("StringType", arrayElementPath);
    }
  }

  // Handle record types (key-value mappings)
  if ("isRecord" in dataType && dataType.isRecord) {
    const typeNode = schema[typeName];
    if (typeNode) {
      const newVisited = new Set(visited);
      newVisited.add(typeName);
      return processNode(typeNode as Schema.Node, schema, path, newVisited);
    }
    return createBinding("StringType", path);
  }

  // Handle primitive types directly
  if (isPrimitive(typeName)) {
    return createBinding(typeName, path);
  }

  // Handle complex/custom types by looking up their definition
  const typeNode = schema[typeName];
  if (typeNode) {
    const newVisited = new Set(visited);
    newVisited.add(typeName);
    return processNode(typeNode as Schema.Node, schema, path, newVisited);
  }

  // Fallback for unknown types
  return createBinding("StringType", path);
}

/**
 * Extracts binding structures from a Player UI schema definition.
 *
 * This is the main entry point for converting a Player UI schema into a structure
 * of TaggedTemplateValue bindings that can be used for data binding in templates.
 * The function performs a deep traversal of the schema starting from the ROOT node
 * and creates appropriately typed bindings for all properties.
 *
 * Key features:
 * - **Type Safety**: Returns strongly typed binding structures that match the schema
 * - **Recursive Processing**: Handles nested objects and complex type references
 * - **Array Support**: Special handling for array types with current element access
 * - **Circular Reference Prevention**: Detects and handles circular type references
 * - **Primitive Type Mapping**: Maps schema types to appropriate TypeScript types
 *
 * @template S - The schema type extending Schema.Schema
 * @param schema - The Player UI schema definition containing type definitions
 * @returns A structure matching the schema but with TaggedTemplateValue bindings
 *
 * @example
 * ```typescript
 * // Given a schema definition:
 * const mySchema = {
 *   ROOT: {
 *     user: { type: "UserType" },
 *     settings: { type: "SettingsType" }
 *   },
 *   UserType: {
 *     name: { type: "StringType" },
 *     age: { type: "NumberType" },
 *     tags: { type: "StringType", isArray: true }
 *   },
 *   SettingsType: {
 *     theme: { type: "StringType" },
 *     notifications: { type: "BooleanType" }
 *   }
 * } as const satisfies Schema.Schema;
 *
 * // Extract bindings:
 * const bindings = extractBindingsFromSchema(mySchema);
 *
 * // Result structure:
 * {
 *   user: {
 *     name: TaggedTemplateValue<string>,        // binds to "user.name"
 *     age: TaggedTemplateValue<number>,         // binds to "user.age"
 *     tags: { name: TaggedTemplateValue<string> } // binds to "user.tags._current_"
 *   },
 *   settings: {
 *     theme: TaggedTemplateValue<string>,       // binds to "settings.theme"
 *     notifications: TaggedTemplateValue<boolean> // binds to "settings.notifications"
 *   }
 * }
 *
 * // Usage in templates:
 * const template = {
 *   asset: {
 *     id: "user-display",
 *     type: "text",
 *     value: bindings.user.name  // Resolves to binding for "user.name"
 *   }
 * };
 * ```
 *
 * @throws {Error} Implicitly throws if the schema structure is invalid or malformed
 *
 * @see {@link TaggedTemplateValue} For information about the binding value type
 * @see {@link ExtractedBindings} For the return type structure
 * @see {@link Schema.Schema} For schema definition format
 */
export function extractBindingsFromSchema<const S extends Schema.Schema>(
  schema: S,
): ExtractedBindings<S> {
  return processNode(schema.ROOT, schema, "") as ExtractedBindings<S>;
}
