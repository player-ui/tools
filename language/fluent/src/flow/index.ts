import type { Asset, Flow } from "@player-ui/types";
import type { ParentCtx } from "../types";
import { FlowOptions } from "../types/flow";

/**
 * Creates a parent context for view generation within a flow.
 *
 * Generates the appropriate context object that provides ID generation
 * information for views within the flow's view array.
 *
 * @param viewsNamespace - The namespace for views in this flow
 * @param index - The index of the view in the views array
 * @returns A ParentCtx object for ID generation
 *
 * @example
 * ```typescript
 * const ctx = createViewContext("my-flow-views", 0);
 * // Result: { parentId: "my-flow-views", branch: { type: "array-item", index: 0 } }
 * ```
 */
function createViewContext(viewsNamespace: string, index: number): ParentCtx {
  return {
    parentId: viewsNamespace,
    branch: {
      type: "array-item",
      index,
    },
  };
}

/**
 * Processes a view item, resolving functions and ensuring proper ID assignment.
 *
 * Handles both static Asset objects and view generator functions, ensuring
 * that each view has appropriate ID generation context while preserving
 * any explicitly provided IDs.
 *
 * @param viewOrFunction - Either a static Asset or a function that generates an Asset
 * @param context - The context to pass to generator functions
 * @param index - The index of this view in the views array
 * @param viewsNamespace - The namespace for ID generation
 * @returns A resolved Asset with proper ID
 *
 * @example
 * ```typescript
 * // Static view with explicit ID - returned as-is
 * const staticView = processViewItem(
 *   { id: "welcome", type: "text", value: "Hello" },
 *   ctx, 0, "flow-views"
 * );
 *
 * // Dynamic view function - called with context
 * const dynamicView = processViewItem(
 *   (ctx) => text().withValue("Dynamic content"),
 *   ctx, 1, "flow-views"
 * );
 * ```
 */
function processViewItem<T extends Asset>(
  viewOrFunction: T | ((ctx: ParentCtx) => T),
  context: ParentCtx,
  index: number,
  viewsNamespace: string,
): T {
  // If it's a static view with an explicit ID, return as-is
  if (typeof viewOrFunction !== "function" && viewOrFunction.id) {
    return viewOrFunction;
  }

  // Create the context for this specific view
  const viewContext = createViewContext(viewsNamespace, index);
  const mergedContext = { ...viewContext, ...context };

  // Resolve the view (either call function or return static asset)
  return typeof viewOrFunction === "function"
    ? viewOrFunction(mergedContext)
    : viewOrFunction;
}

/**
 * Creates a Player UI Flow from the given options and handles view processing.
 *
 * This is the main entry point for creating Player UI flows using the fluent API.
 * It takes user-friendly flow options and transforms them into a complete Flow
 * object that can be executed by the Player UI runtime.
 *
 * Key features:
 * - **View Processing**: Resolves both static assets and generator functions
 * - **ID Management**: Automatically generates hierarchical IDs for views
 * - **Context Propagation**: Passes custom context to view generator functions
 * - **Type Safety**: Maintains strong typing throughout the flow creation process
 * - **Property Preservation**: Preserves additional flow properties through spreading
 * - **Flexible Configuration**: Supports optional data, schema, and custom context
 *
 * @param options - Complete flow configuration options
 * @returns A fully configured Flow object ready for Player UI execution
 *
 * @example
 * ```typescript
 * import { flow, binding } from '@player-ui/fluent';
 * import { text, collection, action } from './assets';
 *
 * // Basic static flow
 * const basicFlow = flow({
 *   id: 'welcome-flow',
 *   views: [
 *     text().withValue("Welcome to our app!"),
 *     action().withLabel("Get Started").withValue("next")
 *   ],
 *   navigation: {
 *     BEGIN: "FLOW",
 *     FLOW: {
 *       start: "view-0",
 *       "view-0": { next: "view-1" },
 *       "view-1": { next: "END_done" }
 *     },
 *     END_done: { outcome: "completed" }
 *   }
 * });
 * ```
 *
 * @throws {Error} Potentially throws if view processing fails or navigation is invalid
 */
export function flow(options: FlowOptions): Flow<Asset> {
  const flowId = options.id || "root";
  const viewsNamespace = `${flowId}-views`;

  // Process all views, resolving functions and ensuring proper IDs
  const processedViews = options.views.map((viewOrFunction, index) =>
    processViewItem(
      viewOrFunction,
      options.context ?? ({} as ParentCtx),
      index,
      viewsNamespace,
    ),
  );

  // Extract properties that need special handling to avoid conflicts
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    views: _views,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: _context,
    ...additionalFlowProperties
  } = options;

  // Construct the final flow object with processed views and all properties
  return {
    ...additionalFlowProperties, // Preserve any additional flow properties
    id: flowId,
    views: processedViews,
    navigation: options.navigation,
    // Conditionally include optional properties
    ...(options.data && { data: options.data }),
    ...(options.schema && { schema: options.schema }),
  };
}
