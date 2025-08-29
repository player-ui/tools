/**
 * Unique symbol used to identify fluent builder functions.
 * This marker enables type guards and runtime checks to distinguish
 * template functions from regular functions.
 *
 * @internal
 */
export const FLUENT_BUILDER_MARKER: unique symbol = Symbol.for(
  "player-ui.fluent-builder",
);

/**
 * Unique symbol used to identify template functions.
 * This marker enables type guards and runtime checks to distinguish
 * template functions from regular functions.
 *
 * @internal
 */
export const TEMPLATE_FUNCTION_MARKER: unique symbol = Symbol.for(
  "player-ui.template-builder",
);

/**
 * Unique symbol used to identify swtich functions.
 * This marker enables type guards and runtime checks to distinguish
 * template functions from regular functions.
 *
 * @internal
 */
export const SWITCH_FUNCTION_MARKER: unique symbol = Symbol.for(
  "player-ui.switch-builder",
);

/**
 * Unique symbol used to identify tagged template (binding and expresion)
 * This marker enables type guards and runtime checks to distinguish
 * template functions from regular functions.
 *
 * @internal
 */
export const TAGGED_TEMPLATE_MARKER: unique symbol = Symbol.for(
  "player-ui.tagged-builder",
);

/**
 * Symbol used to indicate that a schema node should be generated with a different type name.
 *
 * This symbol can be attached to schema input objects to override the default
 * type name generation behavior. When present, the generator will use the
 * specified name instead of deriving it from the property name.
 *
 * @example
 * ```typescript
 * import { SCHEMA_TYPE_NAME_MARKER } from './schema';
 *
 * const schemaInput = {
 *   user: {
 *     [SCHEMA_TYPE_NAME_MARKER]: "UserProfile", // Will generate "UserProfileType" instead of "userType"
 *     name: { type: "StringType" },
 *     age: { type: "NumberType" }
 *   }
 * };
 * ```
 */
export const SCHEMA_TYPE_NAME_MARKER: unique symbol =
  Symbol.for("Schema Rename");
