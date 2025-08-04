import type { Asset, Template } from "@player-ui/types";
import type { ParentCtx, TemplateArgs, TemplateFunction } from "../types";
import { isTaggedTemplateValue, TEMPLATE_FUNCTION_MARKER } from "../types";

/**
 * Creates a template configuration for dynamically generating arrays of assets.
 *
 * Templates are a powerful feature that allows you to create multiple assets
 * based on array data from your model. They provide a declarative way to handle
 * dynamic lists without manually iterating over data.
 *
 * ## Key Features:
 *
 * ### Index Placeholders
 * Use `_index_` within your template to reference the current array index.
 * For nested templates, use `_index1_`, `_index2_`, etc.
 *
 * ### Multiple Templates
 * - Templates can be nested within other templates
 * - Multiple templates can output to the same property (items are appended)
 * - Templates can append to existing arrays
 *
 * ### Dynamic vs Static
 * - Static templates (default): Evaluated once when view renders
 * - Dynamic templates: Re-evaluated when data changes (performance cost)
 *
 * ### Template Processing
 * All templating semantics are resolved before reaching the transform or UI layer,
 * ensuring clean separation of concerns.
 *
 * @template T - The type of asset that will be created for each array item
 * @param args - Template configuration arguments
 * @returns A template function that can be called with ParentCtx
 *
 * @see {@link https://player-ui.github.io/next/content/assets-views/#templates | Player UI Templates Documentation}
 *
 * @example Basic template usage
 * ```typescript
 * const userTemplate = template({
 *   data: binding`users`,
 *   output: "userItems",
 *   value: (ctx) => text({
 *     id: `user-_index_`,
 *     value: binding`users._index_.name`
 *   })
 * });
 *
 * // Use in an asset
 * const result = userTemplate(parentCtx);
 * ```
 *
 * @example Multiple templates with same output
 * ```typescript
 * const adminTemplate = template({
 *   data: binding`admins`,
 *   output: "allUsers", // Same output as user template
 *   value: (ctx) => text({
 *     id: `admin-_index_`,
 *     value: binding`admins._index_.name`
 *   })
 * });
 *
 * const userTemplate = template({
 *   data: binding`users`,
 *   output: "allUsers", // Items will be appended
 *   value: (ctx) => text({
 *     id: `user-_index_`,
 *     value: binding`users._index_.name`
 *   })
 * });
 * ```
 *
 * @example Dynamic template that updates with data
 * ```typescript
 * const dynamicTemplate = template({
 *   data: binding`liveData`,
 *   output: "items",
 *   dynamic: true, // Re-evaluates when liveData changes
 *   value: (ctx) => text({
 *     value: binding`liveData._index_.status`
 *   })
 * });
 * ```
 *
 * @example Nested templates
 * ```typescript
 * const nestedTemplate = template({
 *   data: binding`categories`,
 *   output: "sections",
 *   value: (ctx) => collection({
 *     id: `category-_index_`,
 *     items: [
 *       template({
 *         data: binding`categories._index_.items`,
 *         output: "categoryItems",
 *         value: (innerCtx) => text({
 *           id: `item-_index_-_index1_`, // Outer and inner indices
 *           value: binding`categories._index_.items._index1_.name`
 *         })
 *       })(ctx)
 *     ]
 *   })
 * });
 * ```
 */
export function template<T extends Asset<string>>(
  args: TemplateArgs<T>,
): TemplateFunction<T> {
  const { data, output, value, dynamic = false } = args;

  /**
   * The actual template function that generates the Template configuration.
   * This function is called with a ParentCtx to produce the final template object.
   *
   * @param parentCtx - The parent context containing ID and branch information
   * @returns A Template configuration object
   */
  const templateFn = (parentCtx: ParentCtx): Template<{ asset: T } | T> => {
    // Create template branch context for the value function
    const templateContext: ParentCtx = {
      parentId: parentCtx.parentId,
      branch: {
        type: "template",
        depth: 0,
      },
    };

    // Build the template configuration
    const templateConfig: Template<{ asset: T } | T> = {
      data: isTaggedTemplateValue(data) ? data.toString() : data,
      output,
      value:
        args.wrap === false
          ? value(templateContext)
          : {
              asset: value(templateContext),
            },
    };

    // Only include dynamic property if it's true (optimization)
    if (dynamic) {
      templateConfig.dynamic = true;
    }

    return templateConfig;
  };

  // Add the runtime marker to identify this as a template function
  (templateFn as TemplateFunction<T>)[TEMPLATE_FUNCTION_MARKER] = true;

  return templateFn as TemplateFunction<T>;
}

/**
 * Enhances an asset builder function with template functionality.
 *
 * This utility function provides a way to add Player template capabilities
 * to any asset builder without modifying the builder's interface directly.
 * It's particularly useful for creating reusable asset builders that can
 * optionally include template functionality.
 *
 * ## How it works:
 * 1. Calls the original builder to create the base asset
 * 2. Calls the template function to get the template configuration
 * 3. Adds the template to the asset's `template` array property
 * 4. Returns the enhanced asset
 *
 * ## Template Array Behavior:
 * - If the asset doesn't have a `template` property, creates a new array
 * - If the asset already has templates, appends the new template
 * - Multiple calls to `addTemplate` will accumulate templates
 *
 * @template T - The type of asset created by the builder
 * @template R - The type of template configuration
 *
 * @param builder - The original asset builder function
 * @param templateFn - The template function to apply to the asset
 * @returns A new builder function that creates assets with template functionality
 *
 * @example Basic usage with a simple asset
 * ```typescript
 * // Original builder
 * const textBuilder = (ctx: ParentCtx) => text({
 *   value: "Static text"
 * });
 *
 * // Template to add
 * const dynamicTemplate = template({
 *   data: binding`items`,
 *   output: "dynamicItems",
 *   value: (ctx) => text({ value: binding`items._index_.name` })
 * });
 *
 * // Enhanced builder
 * const enhancedBuilder = addTemplate(textBuilder, dynamicTemplate);
 *
 * // Usage
 * const asset = enhancedBuilder(parentCtx);
 * // Result: text asset with template property containing the dynamic template
 * ```
 *
 * @example Multiple templates on the same asset
 * ```typescript
 * const baseBuilder = (ctx: ParentCtx) => collection({
 *   id: "my-collection"
 * });
 *
 * const template1 = template({
 *   data: binding`users`,
 *   output: "items",
 *   value: (ctx) => text({ value: binding`users._index_.name` })
 * });
 *
 * const template2 = template({
 *   data: binding`admins`,
 *   output: "items", // Same output - will be appended
 *   value: (ctx) => text({ value: binding`admins._index_.name` })
 * });
 *
 * // Chain multiple templates
 * const multiTemplateBuilder = addTemplate(
 *   addTemplate(baseBuilder, template1),
 *   template2
 * );
 *
 * const result = multiTemplateBuilder(parentCtx);
 * // Result: collection with template array containing both templates
 * ```
 *
 * @example Integration with fluent builders
 * ```typescript
 * // Using with fluent-style builders
 * const overviewBuilder = overviewGroup()
 *   .label(text("My Overview"))
 *   .description(text("Dynamic content below"));
 *
 * const itemTemplate = template({
 *   data: binding`overview.items`,
 *   output: "values",
 *   value: (ctx) => overviewItem({
 *     title: binding`overview.items._index_.title`,
 *     value: binding`overview.items._index_.value`
 *   })
 * });
 *
 * const dynamicOverview = addTemplate(overviewBuilder, itemTemplate);
 * ```
 */
export function addTemplate<
  T extends Asset<string>,
  R extends Template<unknown>,
>(
  builder: (ctx: ParentCtx) => T,
  templateFn: (ctx: ParentCtx) => R,
): (ctx: ParentCtx) => T & { template?: R[] } {
  return (ctx: ParentCtx): T & { template?: R[] } => {
    // Generate the base asset using the original builder
    const asset = builder(ctx) as T & { template?: R[] };

    // Generate the template configuration
    const templateConfig = templateFn(ctx);

    // Add the template to the asset's template array
    if (!asset.template) {
      // First template - create new array
      asset.template = [templateConfig];
    } else {
      // Additional template - append to existing array
      asset.template.push(templateConfig);
    }

    return asset;
  };
}
