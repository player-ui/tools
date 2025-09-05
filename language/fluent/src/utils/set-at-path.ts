/**
 * Sets a value at the specified path in an object, preserving array structures.
 *
 * This function provides deep object/array mutation functionality while maintaining
 * immutability by creating new objects and arrays. It handles nested paths that
 * can traverse both object properties and array indices.
 *
 * The function handles:
 * - Object property access using string keys
 * - Array element access using numeric indices
 * - Mixed object/array traversal in nested structures
 * - Creation of missing intermediate objects/arrays
 *
 * @param obj - The object to modify (will not be mutated)
 * @param path - Array path specifying the location to set the value
 * @param value - The value to set at the specified path
 * @returns A new object with the value set at the specified path
 *
 * @example
 * ```typescript
 * const obj = {
 *   values: [
 *     { name: "Item 1" },
 *     { name: "Item 2" }
 *   ],
 *   settings: { theme: "light" }
 * };
 *
 * // Set object property
 * const result1 = setAtPath(obj, ['settings', 'theme'], 'dark');
 * // Result: { ...obj, settings: { theme: 'dark' } }
 *
 * // Set array element
 * const result2 = setAtPath(obj, ['values', 1], { name: 'New Item' });
 * // Result: { ...obj, values: [obj.values[0], { name: 'New Item' }] }
 *
 * // Set nested property in array element
 * const result3 = setAtPath(obj, ['values', 0, 'name'], 'Updated Item');
 * // Result: { ...obj, values: [{ name: 'Updated Item' }, obj.values[1]] }
 * ```
 */
export function setAtPath(
  obj: Record<string, unknown>,
  path: Array<string | number>,
  value: unknown,
): Record<string, unknown> {
  // Ensure the first key is a string (object property)
  if (path.length > 0 && typeof path[0] === "number") {
    throw new Error("Invalid path: numeric key without array parent");
  }

  const result = _set(obj, path, value);
  return result as Record<string, unknown>;
}
// Helper function to set a value at a path in any object or array
function _set(
  target: unknown,
  path: Array<string | number>,
  value: unknown,
): unknown {
  // Base case: empty path means we replace the entire value
  if (path.length === 0) {
    return value;
  }

  const [currentKey, ...restPath] = path;

  if (restPath.length === 0) {
    // Final key in path - set the value directly
    if (typeof currentKey === "number") {
      // We're setting an array index
      if (!Array.isArray(target)) {
        target = [];
      }
      const result = [...(target as unknown[])];
      result[currentKey] = value;
      return result;
    } else {
      // We're setting an object property
      if (
        typeof target !== "object" ||
        target === null ||
        Array.isArray(target)
      ) {
        target = {};
      }
      const result = { ...(target as Record<string, unknown>) };
      result[currentKey] = value;
      return result;
    }
  } else {
    // More keys remain - need to traverse deeper
    if (typeof currentKey === "number") {
      // Current key is numeric - we're dealing with an array index
      if (!Array.isArray(target)) {
        target = [];
      }
      const result = [...(target as unknown[])];

      // Ensure the array is large enough
      while (result.length <= currentKey) {
        result.push({});
      }

      // Recursively set the value in the array element
      result[currentKey] = _set(result[currentKey], restPath, value);
      return result;
    } else {
      // Current key is string - we're dealing with an object property
      if (
        typeof target !== "object" ||
        target === null ||
        Array.isArray(target)
      ) {
        target = {};
      }
      const result = { ...(target as Record<string, unknown>) };

      // Recursively set the value in the object property
      result[currentKey] = _set(result[currentKey], restPath, value);
      return result;
    }
  }
}
