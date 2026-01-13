import { isTaggedTemplateValue, TaggedTemplateValue } from "../tagged-template";

/**
 * Type that can be either a direct value T or a TaggedTemplateValue
 */
export type TaggedOr<T> = T | TaggedTemplateValue;

/**
 * Safely extract a string if TaggedTemplateValue is present
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
 * Safely extract a boolean if TaggedTemplateValue is present
 */
export function safeToBoolean<T extends TaggedOr<boolean | unknown>>(
  value: T,
): boolean {
  if (isTaggedTemplateValue(value)) {
    return value.toString() === "true";
  }
  return Boolean(value);
}

/**
 * Safely extract a number if TaggedTemplateValue is present
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
 * Type for an item that could be in an array with TaggedTemplate values
 */
export type ArrayItem<T> = T extends (infer U)[] ? U : T;

/**
 * Safely extract an array of values if TaggedTemplateValue is present
 * Preserves element types when possible and handles nested arrays recursively
 */
export function safeToArray<T extends unknown[] | unknown>(
  value: TaggedOr<T>,
): Array<DeepUnwrapTagged<ArrayItem<T>>> {
  if (isTaggedTemplateValue(value)) {
    return [value.toString()] as Array<DeepUnwrapTagged<ArrayItem<T>>>;
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (isTaggedTemplateValue(item)) {
        return item.toString();
      } else if (Array.isArray(item)) {
        return safeToArray(item);
      } else if (
        item &&
        typeof item === "object" &&
        !isTaggedTemplateValue(item)
      ) {
        return safeToObject(item as Record<string, unknown>);
      }
      return item;
    }) as Array<DeepUnwrapTagged<ArrayItem<T>>>;
  }

  return [value] as Array<DeepUnwrapTagged<ArrayItem<T>>>;
}

/**
 * Recursively transforms a type by replacing TaggedTemplateValue with string
 * and handling unions that contain TaggedTemplateValue
 */
export type DeepUnwrapTagged<T> =
  // If T is exactly TaggedTemplateValue, convert to string
  T extends TaggedTemplateValue
    ? T extends string // Check if TaggedTemplateValue also extends string to avoid conflicts
      ? string
      : string
    : // If T is a union that includes TaggedTemplateValue, remove TaggedTemplateValue from the union
      TaggedTemplateValue extends T
      ? T extends TaggedTemplateValue
        ? string // T is exactly TaggedTemplateValue
        : Exclude<T, TaggedTemplateValue> // T is a union containing TaggedTemplateValue - remove it
      : // Handle arrays
        T extends Array<infer U>
        ? Array<DeepUnwrapTagged<U>>
        : // Handle records/objects
          T extends Record<string, unknown>
          ? { [K in keyof T]: DeepUnwrapTagged<T[K]> }
          : // Default case - return as is
            T;

/**
 * Safely extract an object if TaggedTemplateValue is present
 * Recursively handles nested TaggedTemplateValues
 */
export function safeToObject<T extends Record<string, unknown>>(
  value: T,
): DeepUnwrapTagged<T> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value as DeepUnwrapTagged<T>;
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => {
      if (isTaggedTemplateValue(val)) {
        return [key, val.toString()];
      } else if (Array.isArray(val)) {
        return [key, safeToArray(val)];
      } else if (
        val &&
        typeof val === "object" &&
        !isTaggedTemplateValue(val)
      ) {
        return [key, safeToObject(val as Record<string, unknown>)];
      }
      return [key, val];
    }),
  ) as DeepUnwrapTagged<T>;
}

/**
 * Processes a value that could be a string, TaggedTemplateValue, or
 * a complex object with nested TaggedTemplateValue instances
 *
 * This is useful for handling complex union types like:
 * string | TaggedTemplateValue | Record<string, string | TaggedTemplateValue>
 */
export function safeFromMixedType<T>(value: unknown): DeepUnwrapTagged<T> {
  // Handle TaggedTemplateValue directly
  if (isTaggedTemplateValue(value)) {
    return value.toString() as DeepUnwrapTagged<T>;
  }

  // Handle objects (including records)
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return safeToObject(
      value as Record<string, unknown>,
    ) as DeepUnwrapTagged<T>;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return safeToArray(value) as unknown as DeepUnwrapTagged<T>;
  }

  // Handle primitives
  return value as DeepUnwrapTagged<T>;
}
