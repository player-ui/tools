import type { Asset, Template } from "@player-ui/types";
import { type BaseBuildContext, genId, isFluentBuilder } from "../base-builder";
import {
  isTaggedTemplateValue,
  type TaggedTemplateValue,
} from "../tagged-template";

/**
 * Symbol marker to identify template functions
 */
export const TEMPLATE_MARKER = Symbol.for("fluent-builder-template");

/**
 * Type guard to check if a function is a template function
 */
export function isTemplate(fn: unknown): fn is ReturnType<typeof template> {
  return (
    typeof fn === "function" &&
    TEMPLATE_MARKER in (fn as { [TEMPLATE_MARKER]?: unknown })
  );
}

/**
 * Arguments for creating a template configuration
 * @template T - The type of asset that will be created for each item in the array
 */
interface TemplateArgs<T extends Asset<string>> {
  /** A binding that points to an array in the model */
  readonly data: string | TaggedTemplateValue;
  /** A property to put the mapped objects. If not provided, will be inferred from context */
  readonly output?: string;
  /** The asset creator - can be a static asset, a FluentBuilder, or a builder function that returns an asset */
  readonly value:
    | T
    | { build(context?: BaseBuildContext): T }
    | (<K extends BaseBuildContext>(ctx: K) => T);
  /** Whether template should be recomputed when data changes */
  readonly dynamic?: boolean;
}

/**
 * Creates a template configuration for dynamically creating a list of assets based on array data.
 * Templates provide a way to dynamically create a list of assets, or any object, based on data from the model.
 * All of the templating semantics are removed by the time it reaches an asset's transform or UI layer.
 *
 * Within a template, the `_index_` string can be used to substitute the array-index of the item being mapped.
 *
 * Multiple templates:
 * - Templates can be nested. Use `_index_` for the outer loop, `_index1_` for the inner loop, and so on.
 * - Multiple templates can output to the same property using the same output name. Items will be appended.
 * - Templates can append to existing arrays by using the same output property name.
 *
 * Dynamic vs Static Templates:
 * - If dynamic is false (default), the template will be parsed when a view first renders and won't update as data changes.
 * - If dynamic is true, template will be updated whenever data changes while a view is still showing.
 *
 * @param args - The template configuration arguments
 * @returns A function that takes parent context and returns a Template configuration
 * @see https://player-ui.github.io/next/content/assets-views/#templates
 * @example
 * ```ts
 * // Using a static asset
 * template({
 *   data: binding`users`,
 *   output: "items",
 *   value: text({ value: binding`users._index_.name` })
 * })(parentCtx)
 * ```
 *
 * @example
 * ```ts
 * // Using a builder function
 * template({
 *   data: binding`users`,
 *   output: "items",
 *   value: (ctx) => text({ value: binding`users._index_.name` }).withId(genId(ctx))
 * })(parentCtx)
 * ```
 *
 * @example Multiple templates with the same output
 * ```ts
 * [
 *   template({
 *     data: binding`names`,
 *     output: "values",
 *     value: text({ id: `name-_index_`, value: binding`names._index_` })
 *   })(parentCtx),
 *   template({
 *     data: binding`otherNames`,
 *     output: "values",
 *     value: text({ id: `other-name-_index_`, value: binding`otherNames._index_` })
 *   })(parentCtx)
 * ]
 * ```
 *
 * @example Dynamic template that updates when data changes
 * ```ts
 * template({
 *   data: binding`users`,
 *   output: "items",
 *   dynamic: true,
 *   value: text({ value: binding`users._index_.name` })
 * })(parentCtx)
 * ```
 */
export const template = <T extends Asset<string>>({
  data,
  output,
  value,
  dynamic = false,
}: TemplateArgs<T>) => {
  const templateFn = (parentCtx: BaseBuildContext): Template<{ asset: T }> => {
    // If output is not provided, try to infer from context
    const resolvedOutput = output || inferOutputFromContext(parentCtx);

    if (!resolvedOutput) {
      throw new Error(
        "Template output must be provided or inferrable from context. " +
          "When using template in asset arrays, ensure the array property can be inferred " +
          "(e.g., collection().withValues([template(...)]) infers 'values' as output).",
      );
    }

    // Create template context for the value - use the generated parent ID to include slot context
    const templateValueCtx: BaseBuildContext = {
      parentId: genId(parentCtx),
      branch: {
        type: "template",
        depth: 0,
      },
    };

    let resolvedAsset: T;
    if (isFluentBuilder(value)) {
      resolvedAsset = value.build(templateValueCtx) as T;
    } else if (typeof value === "function") {
      const builderResult = value(templateValueCtx);
      if (typeof builderResult === "function") {
        resolvedAsset = (builderResult as (ctx: BaseBuildContext) => T)(
          templateValueCtx,
        );
      } else {
        resolvedAsset = builderResult;
      }
    } else {
      if (typeof value === "object" && value !== null) {
        resolvedAsset = { ...value } as T;
      } else {
        resolvedAsset = value;
      }
    }

    return {
      data: isTaggedTemplateValue(data) ? data.toString() : data,
      output: resolvedOutput,
      value: {
        asset: resolvedAsset,
      },
      ...(dynamic && { dynamic }),
    };
  };

  // Add the marker symbol to the function
  (templateFn as typeof templateFn & { [TEMPLATE_MARKER]: true })[
    TEMPLATE_MARKER
  ] = true;

  return templateFn;
};

/**
 * Helper function to infer output property name from BaseBuildContext
 */
function inferOutputFromContext(
  parentCtx: BaseBuildContext,
): string | undefined {
  // Check if we're in a slot context that can give us the property name
  if (parentCtx.branch?.type === "slot") {
    const slotName = parentCtx.branch.name;
    // Extract property name from slot names like "values-0", "items-2", etc.
    const match = slotName.match(/^([a-zA-Z_][a-zA-Z0-9_]*)-\d+$/);
    if (match) {
      return match[1];
    }
    // If it's just a property name without index, use it directly
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(slotName)) {
      return slotName;
    }
  }
  return undefined;
}
