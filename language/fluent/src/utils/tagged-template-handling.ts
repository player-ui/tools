import {
  isTaggedTemplateValue,
  type TaggedOr,
  type DeepUnwrapTagged,
  type ArrayItem,
} from "../types";

/**
 * String representation of boolean true for TaggedTemplateValue conversion.
 * Used as the canonical string representation when converting TaggedTemplateValue to boolean.
 */
const TAGGED_BOOLEAN_TRUE = "true";

/**
 * Maximum safe recursion depth for nested object/array processing.
 * Prevents stack overflow in deeply nested structures.
 */
const MAX_RECURSION_DEPTH = 100;

/**
 * Type guard to check if a value needs TaggedTemplateValue processing.
 *
 * This function performs a deep check to determine if a value or any of its
 * nested properties contain TaggedTemplateValues that would require processing.
 * Useful for performance optimization when you want to skip processing if
 * no TaggedTemplateValues are present.
 *
 * @param value - The value to check
 * @param depth - Internal parameter for recursion tracking (do not use)
 * @returns True if the value or any nested value contains TaggedTemplateValues
 *
 * @example
 * ```typescript
 * // Simple cases
 * const hasTagged1 = hasTaggedTemplateValues("string"); // false
 * const hasTagged2 = hasTaggedTemplateValues(binding`user.name`); // true
 *
 * // Complex structures
 * const obj = { name: "John", age: binding`user.age` };
 * const hasTagged3 = hasTaggedTemplateValues(obj); // true
 *
 * const plainObj = { name: "John", age: 30 };
 * const hasTagged4 = hasTaggedTemplateValues(plainObj); // false
 *
 * // Performance optimization example
 * function processValue<T>(value: T): DeepUnwrapTagged<T> {
 *   if (!hasTaggedTemplateValues(value)) {
 *     return value as DeepUnwrapTagged<T>; // Skip processing
 *   }
 *   return safeFromMixedType<T>(value);
 * }
 * ```
 */
export function hasTaggedTemplateValues(
  value: unknown,
  depth: number = 0,
): boolean {
  // Prevent infinite recursion
  if (depth > MAX_RECURSION_DEPTH) {
    return false;
  }

  if (isTaggedTemplateValue(value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.some((item) => hasTaggedTemplateValues(item, depth + 1));
  }

  if (value && typeof value === "object") {
    return Object.values(value).some((val) =>
      hasTaggedTemplateValues(val, depth + 1),
    );
  }

  return false;
}

/**
 * Safely converts a value that may be a TaggedTemplateValue to a string.
 *
 * This function handles the conversion gracefully by:
 * - Calling `.toString()` on TaggedTemplateValue instances
 * - Using `String()` constructor for all other values
 * - Ensuring null and undefined are converted to their string representations
 *
 * @template T - The input type, constrained to TaggedOr<string | unknown>
 * @param value - The value to convert to string
 * @returns The string representation of the input value
 *
 * @example
 * ```typescript
 * // With regular strings
 * const str1 = safeToString("hello"); // "hello"
 * const str2 = safeToString(42); // "42"
 * const str3 = safeToString(null); // "null"
 *
 * // With TaggedTemplateValue
 * const tagged = binding`user.name`;
 * const str4 = safeToString(tagged); // calls tagged.toString()
 * ```
 */
export function safeToString<T extends TaggedOr<string | unknown>>(
  value: T,
): string {
  if (isTaggedTemplateValue(value)) {
    return value.toString();
  }
  return String(value);
}

/**
 * Safely converts a value that may be a TaggedTemplateValue to a boolean.
 *
 * The conversion logic is:
 * - For TaggedTemplateValue: converts to string first, then checks if it equals "true"
 * - For other values: uses JavaScript's standard Boolean() conversion
 *
 * @template T - The input type, constrained to TaggedOr<boolean | unknown>
 * @param value - The value to convert to boolean
 * @returns The boolean representation of the input value
 *
 * @example
 * ```typescript
 * // With regular values
 * const bool1 = safeToBoolean(true); // true
 * const bool2 = safeToBoolean("false"); // true (truthy string)
 * const bool3 = safeToBoolean(0); // false
 *
 * // With TaggedTemplateValue
 * const tagged = binding`user.isActive`; // assume resolves to "true"
 * const bool4 = safeToBoolean(tagged); // true
 *
 * const tagged2 = binding`user.isInactive`; // assume resolves to "false"
 * const bool5 = safeToBoolean(tagged2); // false
 * ```
 */
export function safeToBoolean<T extends TaggedOr<boolean | unknown>>(
  value: T,
): boolean {
  if (isTaggedTemplateValue(value)) {
    return value.toString() === TAGGED_BOOLEAN_TRUE;
  }
  return Boolean(value);
}

/**
 * Safely converts a value that may be a TaggedTemplateValue to a number.
 *
 * The conversion logic is:
 * - For TaggedTemplateValue: converts to string first, then to number
 * - For other values: uses JavaScript's standard Number() conversion
 * - Invalid numbers will result in NaN (following JavaScript semantics)
 *
 * @template T - The input type, constrained to TaggedOr<number | unknown>
 * @param value - The value to convert to number
 * @returns The numeric representation of the input value (may be NaN for invalid inputs)
 *
 * @example
 * ```typescript
 * // With regular values
 * const num1 = safeToNumber(42); // 42
 * const num2 = safeToNumber("123"); // 123
 * const num3 = safeToNumber("invalid"); // NaN
 *
 * // With TaggedTemplateValue
 * const tagged = binding`user.age`; // assume resolves to "25"
 * const num4 = safeToNumber(tagged); // 25
 * ```
 */
export function safeToNumber<T extends TaggedOr<number | unknown>>(
  value: T,
): number {
  if (isTaggedTemplateValue(value)) {
    return Number(value.toString());
  }
  return Number(value);
}

/**
 * Internal helper to validate recursion depth and prevent stack overflow.
 *
 * @param depth - Current recursion depth
 * @param functionName - Name of the calling function for error context
 * @throws {Error} When maximum recursion depth is exceeded
 *
 * @internal
 */
function validateRecursionDepth(depth: number, functionName: string): void {
  if (depth > MAX_RECURSION_DEPTH) {
    throw new Error(
      `Maximum recursion depth (${MAX_RECURSION_DEPTH}) exceeded in ${functionName}. ` +
        "This may indicate a circular reference in your data structure.",
    );
  }
}

/**
 * Safely converts a value that may be a TaggedTemplateValue to an array.
 *
 * This function provides intelligent array conversion with the following behavior:
 * - TaggedTemplateValue: converts to string and wraps in array
 * - Existing arrays: recursively processes each element
 * - Non-array values: wraps the value in an array
 * - Handles nested arrays and objects recursively
 * - Includes protection against infinite recursion
 *
 * @template T - The input type, which can be an array type or any other type
 * @param value - The value to convert to an array
 * @param depth - Internal parameter for recursion tracking (do not use)
 * @returns An array containing the processed elements with TaggedTemplateValues converted to strings
 *
 * @throws {Error} When maximum recursion depth is exceeded (indicates circular references)
 *
 * @example
 * ```typescript
 * // With regular values
 * const arr1 = safeToArray([1, 2, 3]); // [1, 2, 3]
 * const arr2 = safeToArray("single"); // ["single"]
 * const arr3 = safeToArray(42); // [42]
 *
 * // With TaggedTemplateValue
 * const tagged = binding`user.name`;
 * const arr4 = safeToArray(tagged); // [tagged.toString()]
 *
 * // With mixed arrays containing TaggedTemplateValue
 * const mixed = [binding`user.name`, "static", binding`user.age`];
 * const arr5 = safeToArray(mixed); // [name_string, "static", age_string]
 *
 * // With nested structures
 * const nested = [{ name: binding`user.name` }, ["item1", binding`item2`]];
 * const arr6 = safeToArray(nested); // [{ name: name_string }, ["item1", item2_string]]
 * ```
 */
export function safeToArray<T extends unknown[] | unknown>(
  value: TaggedOr<T>,
  depth: number = 0,
): Array<DeepUnwrapTagged<ArrayItem<T>>> {
  validateRecursionDepth(depth, "safeToArray");

  if (isTaggedTemplateValue(value)) {
    return [value.toString()] as Array<DeepUnwrapTagged<ArrayItem<T>>>;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isTaggedTemplateValue(item)) {
        return item.toString();
      } else if (Array.isArray(item)) {
        return safeToArray(item, depth + 1);
      } else if (
        item &&
        typeof item === "object" &&
        !isTaggedTemplateValue(item)
      ) {
        return safeToObject(item as Record<string, unknown>, depth + 1);
      }
      return item;
    }) as Array<DeepUnwrapTagged<ArrayItem<T>>>;
  }

  return [value] as Array<DeepUnwrapTagged<ArrayItem<T>>>;
}

/**
 * Safely converts an object that may contain TaggedTemplateValues to a plain object.
 *
 * This function recursively processes object properties with the following behavior:
 * - TaggedTemplateValue properties: converted to their string representation
 * - Nested objects: recursively processed
 * - Array properties: processed using safeToArray
 * - Primitive properties: left unchanged
 * - Includes protection against infinite recursion and circular references
 * - Preserves object structure and property names
 *
 * @template T - The input object type extending Record<string, unknown>
 * @param value - The object to process (must be a valid object)
 * @param depth - Internal parameter for recursion tracking (do not use)
 * @returns A new object with all TaggedTemplateValues recursively converted to strings
 *
 * @throws {Error} When maximum recursion depth is exceeded (indicates circular references)
 *
 * @example
 * ```typescript
 * // With regular objects
 * const obj1 = safeToObject({ name: "John", age: 30 }); // { name: "John", age: 30 }
 *
 * // With TaggedTemplateValue properties
 * const obj2 = safeToObject({
 *   name: binding`user.name`,
 *   email: "static@example.com",
 *   age: binding`user.age`
 * });
 * // Result: { name: name_string, email: "static@example.com", age: age_string }
 *
 * // With nested structures
 * const complex = {
 *   user: {
 *     profile: { name: binding`user.name` },
 *     settings: { theme: binding`user.theme` }
 *   },
 *   items: [binding`item1`, "static", { id: binding`item.id` }]
 * };
 * const obj3 = safeToObject(complex);
 * // All nested TaggedTemplateValues are converted to strings
 * ```
 */
export function safeToObject<T extends Record<string, unknown>>(
  value: T,
  depth: number = 0,
): DeepUnwrapTagged<T> {
  validateRecursionDepth(depth, "safeToObject");

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value as DeepUnwrapTagged<T>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => {
      if (isTaggedTemplateValue(val)) {
        return [key, val.toString()];
      } else if (Array.isArray(val)) {
        return [key, safeToArray(val, depth + 1)];
      } else if (
        val &&
        typeof val === "object" &&
        !isTaggedTemplateValue(val)
      ) {
        return [key, safeToObject(val as Record<string, unknown>, depth + 1)];
      }
      return [key, val];
    }),
  ) as DeepUnwrapTagged<T>;
}

/**
 * Universal converter that processes any value that might contain TaggedTemplateValues.
 *
 * This is the most flexible converter function that can handle complex union types
 * and mixed data structures. It automatically detects the input type and applies
 * the appropriate conversion strategy:
 *
 * - TaggedTemplateValue: converts to string
 * - Objects: recursively processes using safeToObject
 * - Arrays: recursively processes using safeToArray
 * - Primitives: returns as-is
 * - Includes full recursion protection
 *
 * This function is particularly useful when dealing with complex union types like:
 * `string | TaggedTemplateValue | Record<string, string | TaggedTemplateValue> | Array<mixed>`
 *
 * @template T - The expected output type after TaggedTemplateValue unwrapping
 * @param value - The value to process (can be any type)
 * @param depth - Internal parameter for recursion tracking (do not use)
 * @returns The processed value with all TaggedTemplateValues converted to strings
 *
 * @throws {Error} When maximum recursion depth is exceeded (indicates circular references)
 *
 * @example
 * ```typescript
 * // Simple cases
 * const str = safeFromMixedType<string>(binding`user.name`); // string
 * const num = safeFromMixedType<number>(42); // 42
 *
 * // Complex union types
 * type ComplexUnion = string | TaggedTemplateValue | {
 *   name: string | TaggedTemplateValue;
 *   items: Array<string | TaggedTemplateValue>;
 * };
 *
 * const complex: ComplexUnion = {
 *   name: binding`user.name`,
 *   items: [binding`item1`, "static", binding`item2`]
 * };
 *
 * const result = safeFromMixedType<ComplexUnion>(complex);
 * // Result: { name: name_string, items: [item1_string, "static", item2_string] }
 *
 * // With deeply nested structures
 * const nested = {
 *   level1: {
 *     level2: {
 *       data: binding`deep.value`,
 *       array: [binding`item1`, { nested: binding`nested.value` }]
 *     }
 *   }
 * };
 *
 * const processed = safeFromMixedType(nested);
 * // All TaggedTemplateValues at any depth are converted to strings
 * ```
 */
export function safeFromMixedType<T>(
  value: unknown,
  depth: number = 0,
): DeepUnwrapTagged<T> {
  validateRecursionDepth(depth, "safeFromMixedType");

  // Handle TaggedTemplateValue directly
  if (isTaggedTemplateValue(value)) {
    return value.toString() as DeepUnwrapTagged<T>;
  }

  // Handle objects (including records)
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return safeToObject(
      value as Record<string, unknown>,
      depth + 1,
    ) as DeepUnwrapTagged<T>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return safeToArray(value, depth + 1) as unknown as DeepUnwrapTagged<T>;
  }

  // Handle primitives
  return value as DeepUnwrapTagged<T>;
}
