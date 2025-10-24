import type { Schema } from "@player-ui/types";
import { binding } from "./binding";
import type { TaggedTemplateValue, ExtractedBindings } from "./types";

/**
 * Runtime implementation that builds the actual object structure
 */
export function extractBindingsFromSchema<const S extends Schema.Schema>(
  schema: S,
): ExtractedBindings<S> {
  const primitiveTypes = new Set(["StringType", "NumberType", "BooleanType"]);

  const isPrimitive = (typeName: string): boolean => {
    return primitiveTypes.has(typeName);
  };

  const createBinding = (
    typeName: string,
    path: string,
  ): TaggedTemplateValue<unknown> => {
    if (typeName === "StringType") {
      return binding<string>`${path}`;
    }
    if (typeName === "NumberType") {
      return binding<number>`${path}`;
    }
    if (typeName === "BooleanType") {
      return binding<boolean>`${path}`;
    }
    return binding<string>`${path}`;
  };

  const processDataType = (
    dataType: Schema.DataTypes,
    schema: Schema.Schema,
    path: string,
    visited: Set<string> = new Set(),
  ): TaggedTemplateValue<unknown> | Record<string, unknown> => {
    const typeName = dataType.type;

    // Prevent infinite recursion
    if (visited.has(typeName)) {
      return createBinding("StringType", path);
    }

    // Handle arrays
    if ("isArray" in dataType && dataType.isArray) {
      const arrayPath = path ? `${path}._current_` : "_current_";

      if (isPrimitive(typeName)) {
        // Special handling for primitive arrays
        if (typeName === "StringType") {
          return { name: createBinding(typeName, arrayPath) };
        } else {
          return { value: createBinding(typeName, arrayPath) };
        }
      } else {
        const typeNode = schema[typeName];
        if (typeNode) {
          const newVisited = new Set(visited);
          newVisited.add(typeName);
          return processNode(
            typeNode as Schema.Node,
            schema,
            arrayPath,
            newVisited,
          );
        }
        return createBinding("StringType", arrayPath);
      }
    }

    // Handle records
    if ("isRecord" in dataType && dataType.isRecord) {
      const typeNode = schema[typeName];
      if (typeNode) {
        const newVisited = new Set(visited);
        newVisited.add(typeName);
        return processNode(typeNode as Schema.Node, schema, path, newVisited);
      }
      return createBinding("StringType", path);
    }

    // Handle primitives
    if (isPrimitive(typeName)) {
      return createBinding(typeName, path);
    }

    // Handle complex types
    const typeNode = schema[typeName];
    if (typeNode) {
      const newVisited = new Set(visited);
      newVisited.add(typeName);
      return processNode(typeNode as Schema.Node, schema, path, newVisited);
    }

    // Fallback
    return createBinding("StringType", path);
  };

  const processNode = (
    node: Schema.Node,
    schema: Schema.Schema,
    basePath: string,
    visited: Set<string> = new Set(),
  ): Record<string, unknown> => {
    const result: Record<string, unknown> = {};

    // Process each property in the node
    Object.entries(node).forEach(([key, dataType]) => {
      const path = basePath ? `${basePath}.${key}` : key;
      result[key] = processDataType(dataType, schema, path, visited);
    });

    return result;
  };

  // Start processing from ROOT
  return processNode(schema.ROOT, schema, "") as ExtractedBindings<S>;
}
