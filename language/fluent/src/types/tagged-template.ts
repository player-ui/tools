import { TAGGED_TEMPLATE_MARKER } from "./markers";

/**
 * Type guard to check if a value is a TaggedTemplateValue at runtime.
 * Uses the unique symbol to safely identify template values.
 *
 * @param value The value to check
 * @returns True if the value is a TaggedTemplateValue, false otherwise
 *
 * @example
 * ```typescript
 * const maybeTemplate: unknown = someValue;
 * if (isTaggedTemplateValue(maybeTemplate)) {
 *   // TypeScript now knows maybeTemplate is TaggedTemplateValue
 *   console.log(maybeTemplate.toString());
 * }
 * ```
 */
export function isTaggedTemplateValue(
  value: unknown,
): value is TaggedTemplateValue {
  return (
    typeof value === "object" &&
    value !== null &&
    TAGGED_TEMPLATE_MARKER in value
  );
}

/**
 * Options for configuring template reference string generation.
 * Used to specify the context in which a template is being rendered.
 */
export interface TemplateRefOptions {
  /** The type of nested context this template is being used within */
  nestedContext?: "binding" | "expression";
}

/**
 * Represents a tagged template value with type safety through phantom types.
 * This interface provides compile-time type checking while generating runtime template strings.
 *
 * The phantom type `T` acts as a "fat pointer" - it carries type information about
 * the data that the template targets, enabling TypeScript to perform compile-time
 * type checking on operations without runtime overhead.
 *
 * @template T The type of data this template value represents (phantom type)
 *
 * @example
 * ```typescript
 * // Basic usage
 * const userAge: TaggedTemplateValue<number> = binding`user.age`;
 * console.log(userAge.toString()); // "{{user.age}}"
 *
 * // Type checking works at compile time
 * const result = add(userAge, 5); // TypeScript knows userAge represents a number
 * ```
 */
export interface TaggedTemplateValue<T = unknown> {
  /** Symbol marker for runtime type identification */
  [TAGGED_TEMPLATE_MARKER]: true;
  /**
   * Phantom type marker - carries type information at compile time but
   * is not available at runtime. This enables type-safe operations on templates.
   */
  readonly _phantomType?: T;

  /**
   * Returns the raw template value as a string.
   * This is the actual template content without any wrapper syntax.
   */
  toValue(): string;

  /**
   * Returns the template as a reference string with optional context-specific formatting.
   * Used when the template needs to be embedded within other templates or expressions.
   */
  toRefString(options?: TemplateRefOptions): string;

  /**
   * Returns the template as a formatted string for display.
   * Typically wraps the value in template syntax like {{value}}.
   */
  toString(): string;
}

/**
 * Converts an object type to a bindable proxy type where each property
 * access returns a TaggedTemplateValue with the correct type information.
 *
 * This enables type-safe data binding with full IDE autocompletion support.
 *
 * @template T The source object type to make bindable
 *
 * @example
 * ```typescript
 * interface User {
 *   name: string;
 *   age: number;
 *   profile: {
 *     email: string;
 *     isActive: boolean;
 *   };
 *   tags: string[];
 * }
 *
 * type UserBindings = BindableProxy<User>;
 * // Result type:
 * // {
 * //   name: TaggedTemplateValue<string>;
 * //   age: TaggedTemplateValue<number>;
 * //   profile: {
 * //     email: TaggedTemplateValue<string>;
 * //     isActive: TaggedTemplateValue<boolean>;
 * //   };
 * //   tags: TaggedTemplateValue<string[]>;
 * // }
 * ```
 */
export type BindableProxy<T> = {
  readonly [K in keyof T]: T[K] extends unknown[]
    ? TaggedTemplateValue<T[K]> // Arrays become bindings directly
    : T[K] extends object
      ? BindableProxy<T[K]> // Objects become nested proxies
      : TaggedTemplateValue<T[K]>; // Primitives become bindings
};

/**
 * Union type that represents a value that can be either a direct value T or a TaggedTemplateValue.
 * This is the foundation for all safe conversion operations in this module.
 *
 * @template T - The expected direct value type
 *
 * @example
 * ```typescript
 * type StringOrTagged = TaggedOr<string>; // string | TaggedTemplateValue
 * type NumberOrTagged = TaggedOr<number>; // number | TaggedTemplateValue
 * ```
 */
export type TaggedOr<T> = T | TaggedTemplateValue;

/**
 * Utility type to extract the item type from an array type.
 * If T is not an array, returns T itself.
 *
 * @template T - The type to extract array items from
 *
 * @example
 * ```typescript
 * type Item1 = ArrayItem<string[]>; // string
 * type Item2 = ArrayItem<number>; // number
 * ```
 */
export type ArrayItem<T> = T extends (infer U)[] ? U : T;

/**
 * Recursively transforms a type by replacing all TaggedTemplateValue instances with strings
 * and handling complex nested structures including arrays, objects, and unions.
 *
 * This type performs deep unwrapping:
 * - TaggedTemplateValue → string
 * - Array<TaggedTemplateValue> → Array<string>
 * - { prop: TaggedTemplateValue } → { prop: string }
 * - Union types containing TaggedTemplateValue are properly handled
 *
 * @template T - The type to recursively unwrap
 *
 * @example
 * ```typescript
 * // Simple cases
 * type Unwrapped1 = DeepUnwrapTagged<TaggedTemplateValue>; // string
 * type Unwrapped2 = DeepUnwrapTagged<string | TaggedTemplateValue>; // string
 *
 * // Complex nested cases
 * type ComplexType = {
 *   name: string | TaggedTemplateValue;
 *   items: Array<{ id: TaggedTemplateValue; value: number }>;
 * };
 * type UnwrappedComplex = DeepUnwrapTagged<ComplexType>;
 * // Result: { name: string; items: Array<{ id: string; value: number }> }
 * ```
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
