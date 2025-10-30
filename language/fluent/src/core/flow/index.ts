import { Asset, Flow, DataModel, Navigation, Schema } from "@player-ui/types";
import { BaseBuildContext } from "../base-builder";

/**
 * Core options for creating a Player-UI Flow
 */
interface CoreFlowOptions<
  T extends Asset = Asset,
  C extends BaseBuildContext = BaseBuildContext,
> {
  id?: string;
  views: Array<T | { build(context?: C): T } | ((ctx: C) => T)>;
  data?: DataModel;
  schema?: Schema.Schema;
  navigation: Navigation;
  context?: C;
}

/**
 * Options for creating a Player-UI Flow
 * Allows additional properties to be passed through to the final Flow
 */
export type FlowOptions<
  T extends Asset = Asset,
  C extends BaseBuildContext = BaseBuildContext,
> = CoreFlowOptions<T, C> &
  Omit<Flow<T>, keyof CoreFlowOptions<T, C> | "views">;

/**
 * Creates a Player-UI Flow from the given options
 *
 * @example
 * ```ts
 * import { flow } from './flow';
 * import { text, autogenText } from './assets';
 *
 * // Basic usage (no autogen)
 * const basicFlow = flow({
 *   id: 'example-flow',
 *   views: [text('Some Text').binding('label').id('view-1')],
 *   navigation: { ... }
 * });
 *
 * // Recommended autogen usage
 * const autogenFlow = flow({
 *   id: 'autogen-flow',
 *   autogenRunner: runner,
 *   autogenInputData: inputData, // Rich NLS data, title, subtitle, etc.
 *   views: [autogenText({ type: 'header' })],
 *   navigation: { ... }
 * });
 *
 * // Advanced autogen usage (full control)
 * const advancedFlow = flow({
 *   id: 'advanced-flow',
 *   autogenRunner: runner,
 *   autogenContext: customContext,
 *   views: [autogenText({ type: 'header' })],
 *   navigation: { ... }
 * });
 * ```
 */
function isBuilder<T>(
  value: T | { build(context?: BaseBuildContext): T },
): value is { build(context?: BaseBuildContext): T } {
  return (
    typeof value === "object" &&
    value !== null &&
    "build" in value &&
    typeof value.build === "function"
  );
}

function isBuilderFunction<T>(
  value: T | ((ctx: BaseBuildContext) => T),
): value is (ctx: BaseBuildContext) => T {
  return typeof value === "function";
}

export function flow<T extends Asset = Asset>(
  options: FlowOptions<T>,
): Flow<T> {
  const flowId = options.id || "root";

  const viewsNamespace = `${flowId}-views`;

  const processedViews = (() => {
    const processViews = (): T[] => {
      const results: T[] = [];

      for (let index = 0; index < options.views.length; index++) {
        const viewOrFn = options.views[index];
        const ctx: BaseBuildContext = {
          parentId: viewsNamespace,
          branch: {
            type: "array-item",
            index,
          },
          ...(options.context ?? {}),
        };

        if (isBuilder(viewOrFn)) {
          results.push(viewOrFn.build(ctx));
        } else if (isBuilderFunction(viewOrFn)) {
          results.push(viewOrFn(ctx));
        } else {
          results.push(viewOrFn);
        }
      }

      return results;
    };

    // No autogen runner, process views normally
    return processViews();
  })();

  // Extract core properties that need special handling
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    views: _views,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: _context,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    autogenRunner: _autogenRunner,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    autogenInputData: _autogenInputData,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    autogenContext: _autogenContext,
    ...restOptions
  } = options;

  return {
    ...restOptions,
    id: flowId,
    views: processedViews,
    ...(options.data && { data: options.data }),
    ...(options.schema && { schema: options.schema }),
    navigation: options.navigation,
  };
}
