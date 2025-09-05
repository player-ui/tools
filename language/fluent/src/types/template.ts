import type { Asset, Template } from "@player-ui/types";
import type { TaggedTemplateValue } from "./tagged-template";
import type { ParentCtx } from "./id-generation";
import { TEMPLATE_FUNCTION_MARKER } from "./markers";

/**
 * Type guard to determine if a function is a template function.
 *
 * This function checks for the presence of the TEMPLATE_MARKER symbol,
 * which is added to all functions created by the `template()` function.
 * This enables runtime identification and type-safe handling of templates.
 *
 * @param fn - The value to check
 * @returns True if the value is a template function, false otherwise
 *
 * @example
 * ```typescript
 * const myTemplate = template({ ... });
 * const regularFunction = () => ({ type: "text" });
 *
 * if (isTemplateFunction(myTemplate)) {
 *   // TypeScript knows this is a template function
 *   console.log("This is a template");
 * }
 *
 * if (isTemplateFunction(regularFunction)) {
 *   // This will be false
 *   console.log("This won't execute");
 * }
 * ```
 */
export function isTemplateFunction(
  fn: unknown,
): fn is TemplateFunction<Asset<string>> {
  return (
    typeof fn === "function" &&
    TEMPLATE_FUNCTION_MARKER in (fn as unknown as Record<symbol, unknown>)
  );
}

/*
 * Configuration arguments for creating a template.
 *
 * Templates provide a declarative way to dynamically generate arrays of assets
 * based on data from the model. The template system processes array data and
 * creates corresponding assets using the provided value function.
 *
 * @template T - The type of asset that will be created for each array item
 *
 * @example
 * ```typescript
 * const args: TemplateArgs<Asset<"text">> = {
 *   data: "users",
 *   output: "userList",
 *   value: (ctx) => text({ value: binding`users._index_.name` }),
 *   dynamic: false
 * };
 * ```
 */
export interface TemplateArgs<T extends Asset<string>> {
  /**
   * A binding that points to an array in the data model.
   * Can be a string path or a TaggedTemplateValue from the binding system.
   *
   * @example
   * ```typescript
   * data: "users"                    // Direct string path
   * data: binding`users`             // Tagged template binding
   * data: binding`nested.users`      // Nested path binding
   * ```
   */
  readonly data: string | TaggedTemplateValue;

  /**
   * The property name where the generated assets will be placed.
   * Multiple templates can output to the same property - items will be appended.
   *
   * @example
   * ```typescript
   * output: "items"        // Will create asset.items = [...]
   * output: "children"     // Will create asset.children = [...]
   * ```
   */
  readonly output: string;

  /**
   * Factory function that creates an asset for each item in the data array.
   * Receives a ParentCtx with template-specific context information.
   *
   * The special `_index_` placeholder can be used within this function to reference
   * the current array index. For nested templates, use `_index1_`, `_index2_`, etc.
   *
   * @param parentCtx - Context with parent ID and template branch information
   * @returns The asset to be created for this array item
   *
   * @example
   * ```typescript
   * value: (ctx) => text({
   *   id: `${ctx.parentId}-item-_index_`,
   *   value: binding`users._index_.name`
   * })
   * ```
   */
  readonly value: (parentCtx: ParentCtx) => T;

  /**
   * Controls when the template is evaluated and updated.
   *
   * - `false` (default): Template is evaluated once when the view first renders.
   *   Changes to the data array will not update the generated assets.
   * - `true`: Template is re-evaluated whenever the data array changes.
   *   Provides dynamic updates but with performance implications.
   *
   * @default false
   *
   * @example
   * ```typescript
   * // Static template - evaluated once
   * dynamic: false
   *
   * // Dynamic template - updates with data changes
   * dynamic: true
   * ```
   */
  readonly dynamic?: boolean;

  /** If true wraps the value in a AssetWrapper (default to true) */
  readonly wrap?: boolean;
}

/**
 * A template function that can be identified at runtime.
 * This type represents the return value of the `template()` function,
 * which includes both the template functionality and a runtime marker.
 *
 * @template T - The type of asset created by the template
 */
export type TemplateFunction<T extends Asset<string> = Asset> = ((
  parentCtx: ParentCtx,
) => Template<{ asset: T }>) & {
  [TEMPLATE_FUNCTION_MARKER]: true;
};
