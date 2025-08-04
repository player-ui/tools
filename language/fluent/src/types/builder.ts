import type { Asset, Template } from "@player-ui/types";
import type { ParentCtx } from "./id-generation";
import type { TaggedTemplateValue } from "./tagged-template";
import { FLUENT_BUILDER_MARKER } from "./markers";
import { TemplateFunction } from "./template";

/**
 * A function that creates Player-UI assets with automatic ID generation and context awareness.
 *
 * Fluent builders are the core building blocks of the fluent DSL system. They are functions
 * that take a parent context and return a fully-formed Player-UI asset. The context provides
 * information needed for automatic ID generation and hierarchical relationships.
 *
 * ## Key Features:
 * - **Automatic ID Generation**: Uses parent context to create hierarchical IDs
 * - **Context Awareness**: Receives parent information for proper asset placement
 * - **Type Safety**: Fully typed with TypeScript generics for compile-time safety
 *
 * @template T - The type of Player-UI asset this builder creates (defaults to Asset)
 * @template K - The parent context type (defaults to ParentCtx)
 *
 * @param ctx - Parent context containing ID generation information
 * @returns A fully-formed Player-UI asset of type T
 */
export type FluentBuilder<
  T extends Asset = Asset,
  K extends ParentCtx = ParentCtx,
> = (ctx: K) => T;

/**
 * Type guard function that checks if a value is a fluent builder function.
 *
 * This function performs both runtime and type checking to determine if a value
 * is a valid fluent builder. It checks that the value is a function and has the
 * required FLUENT_BUILDER_MARKER property.
 *
 * ## Usage:
 *
 * ### Basic Type Guard
 * ```typescript
 * const value: unknown = text().withValue("Hello");
 *
 * if (isFluentBuilder(value)) {
 *   // TypeScript now knows value is FluentBuilder<TextAsset>
 *   const asset = value(ctx);
 * }
 * ```
 *
 * ### With Generic Types
 * ```typescript
 * function processBuilder<T extends Asset>(
 *   builder: unknown
 * ): builder is FluentBuilder<T> {
 *   return isFluentBuilder<T>(builder);
 * }
 *
 * const textBuilder = text().withValue("Test");
 * if (processBuilder<TextAsset>(textBuilder)) {
 *   // builder is typed as FluentBuilder<TextAsset>
 * }
 * ```
 *
 * ### Runtime Validation
 * ```typescript
 * function validateBuilders(builders: unknown[]): FluentBuilder[] {
 *   return builders.filter(isFluentBuilder);
 * }
 *
 * const mixedArray = [
 *   text().withValue("Valid"),
 *   "not a builder",
 *   action().withLabel("Also valid"),
 *   { type: "invalid" }
 * ];
 *
 * const validBuilders = validateBuilders(mixedArray);
 * // Result: [textBuilder, actionBuilder]
 * ```
 *
 * @template T - The expected asset type (defaults to Asset)
 * @template K - The expected context type (defaults to ParentCtx)
 *
 * @param value - The value to check
 * @returns True if the value is a fluent builder function, false otherwise
 */
export function isFluentBuilder<
  T extends Asset = Asset,
  K extends ParentCtx = ParentCtx,
>(value: unknown): value is FluentBuilder<T, K> {
  return value instanceof Function && FLUENT_BUILDER_MARKER in value;
}

/**
 * Helper type to distinguish between literal types and their general counterparts.
 * This is used to preserve literal unions while transforming general types.
 *
 * @template T The type to check
 * @template Base The base type to compare against
 *
 * @example
 * ```typescript
 * type Test1 = IsLiteralType<"foo" | "bar", string>; // true
 * type Test2 = IsLiteralType<string, string>; // false
 * type Test3 = IsLiteralType<42, number>; // true
 * type Test4 = IsLiteralType<number, number>; // false
 * ```
 */
type IsLiteralType<T, Base> = T extends Base
  ? Base extends T
    ? false
    : true
  : false;

/**
 * Advanced type utility that transforms Asset types into builder-friendly versions.
 * This transformation makes fluent builders more flexible by allowing both static
 * values and dynamic template values.
 *
 * ## Transformation Rules:
 *
 * ### Literal Types (preserved):
 * - `'foo' | 'bar'` → `'foo' | 'bar' | TaggedTemplateValue`
 * - `true | false` → `true | false | TaggedTemplateValue`
 * - `42 | 100` → `42 | 100 | TaggedTemplateValue`
 *
 * ### General Types:
 * - `string` → `string | TaggedTemplateValue`
 * - `boolean` → `boolean | TaggedTemplateValue`
 * - `number` → `number | TaggedTemplateValue`
 *
 * ### Complex Types:
 * - `Asset` → `Asset | (<K extends ParentCtx>(ctx: K) => Asset)`
 * - `AssetWrapper<T>` → `T | (<K extends ParentCtx>(ctx: K) => T)`
 * - `Array<T>` → `Array<TransformType<T>>`
 * - `Record<K, V>` → `Record<K, TransformType<V>>`
 *
 * @template T The type to transform
 *
 * @example
 * ```typescript
 * // Literal union preserved
 * type ButtonType = TransformType<"primary" | "secondary">;
 * // Result: "primary" | "secondary" | TaggedTemplateValue
 *
 * // General string type
 * type Label = TransformType<string>;
 * // Result: string | TaggedTemplateValue
 *
 * // Asset type
 * type TextAsset = TransformType<{ type: "text"; id: string; value: string }>;
 * // Result: { type: "text"; id: string; value: string } |
 * //         (<K extends ParentCtx>(ctx: K) => { type: "text"; id: string; value: string })
 * ```
 */
export type TransformType<T> =
  // Handle proper Asset types (must have both Asset shape AND id property)
  T extends Asset & { id: unknown }
    ? T | (<K extends ParentCtx>(ctx: K) => T)
    : // Handle AssetWrapper types
      T extends { asset: infer A }
      ? A | (<K extends ParentCtx>(ctx: K) => A)
      : // Handle Arrays
        T extends Array<infer E>
        ? Array<TransformType<E>>
        : // Handle Records/Objects (check before primitives to avoid structural typing issues)
          T extends Record<string, unknown>
          ? { [K in keyof T]: TransformType<T[K]> }
          : // Handle strings (including literal unions)
            T extends string
            ? IsLiteralType<T, string> extends true
              ? T | TaggedTemplateValue<T> // T is a string literal or union of literals
              : string | TaggedTemplateValue<string> // T is the general string type
            : // Handle booleans (including literal unions)
              T extends boolean
              ? IsLiteralType<T, boolean> extends true
                ? T | TaggedTemplateValue<T> // T is a boolean literal or union of literals
                : boolean | TaggedTemplateValue<boolean> // T is the general boolean type
              : // Handle numbers (including literal unions)
                T extends number
                ? IsLiteralType<T, number> extends true
                  ? T | TaggedTemplateValue<T> // T is a number literal or union of literals
                  : number | TaggedTemplateValue<number> // T is the general number type
                : // Handle bigints (including literal unions)
                  T extends bigint
                  ? IsLiteralType<T, bigint> extends true
                    ? T | TaggedTemplateValue<T> // T is a bigint literal or union of literals
                    : bigint | TaggedTemplateValue<bigint> // T is the general bigint type
                  : // Default case - return as is
                    T;

/**
 * Utility type that extracts all properties from an Asset type and transforms them
 * for use in fluent builder interfaces. This type:
 *
 * 1. **Excludes the `type` property** (managed by the builder)
 * 2. **Transforms all properties** using `TransformType` for flexibility
 * 3. **Handles nested metadata** objects properly
 * 4. **Adds automatic applicability** for conditional visibility
 *
 * @template T The Asset type to extract builder arguments from
 *
 * @example
 * ```typescript
 * interface TextAsset {
 *   type: "text";
 *   id: string;
 *   value: string;
 *   modifiers?: Array<{ type: string }>;
 *   metaData?: {
 *     custom: string;
 *   };
 * }
 *
 * type TextBuilderArgs = ExtractBuilderArgs<TextAsset>;
 * // Result: {
 * //   id: string | TaggedTemplateValue;
 * //   value: string | TaggedTemplateValue;
 * //   modifiers?: Array<{ type: string | TaggedTemplateValue }> | TaggedTemplateValue;
 * //   metaData?: {
 * //     custom: string | TaggedTemplateValue;
 * //   } | TaggedTemplateValue;
 * //   applicability?: string | TaggedTemplateValue;
 * // }
 * ```
 */
export type ExtractBuilderArgs<T> = {
  [K in keyof T as K extends "type" ? never : K]: K extends "metaData"
    ? T[K] extends Record<string, unknown>
      ? { [P in keyof T[K]]: TransformType<T[K][P]> }
      : TransformType<T[K]>
    : TransformType<T[K]>;
} & {
  /**
   * Applicability expression that conditionally shows or hides an asset
   * (and all of its children) from the view tree.
   *
   * This expression is dynamically calculated and automatically updates
   * as data changes on the page, enabling reactive UI behavior.
   *
   * @example
   * ```typescript
   * // Static condition
   * .withApplicability("user.isLoggedIn")
   *
   * // Dynamic template condition
   * .withApplicability(e`${b`user.role`} === 'admin'`)
   * ```
   */
  applicability?: string | TaggedTemplateValue<string>;
};

/**
 * Base interface for fluent builders that provides common methods
 * @template T - The concrete builder type that extends this interface
 */
export interface BaseFluentBuilder<T> {
  /** Each asset requires a unique id per view */
  withId: (id: string | TaggedTemplateValue<string>) => T;

  /** Applicability expression that conditionally shows or hides an asset (and all of its children) from the view tree */
  withApplicability: (applicability: string | TaggedTemplateValue<string>) => T;

  /** Templates allows you to create multiple assets based on array data from your model*/
  withTemplate: (template: Template | TemplateFunction) => T;
}
