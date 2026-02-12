import { Asset, Flow, DataModel, Navigation, Schema } from "@player-ui/types";
import { BaseBuildContext, BranchTypes } from "../base-builder";

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
 * import { text } from './assets';
 *
 * const myFlow = flow({
 *   id: 'example-flow',
 *   views: [text().withValue('Some Text').withId('view-1')],
 *   navigation: {
 *     BEGIN: 'FLOW_1',
 *     FLOW_1: {
 *       startState: 'VIEW_1',
 *       VIEW_1: { state_type: 'VIEW', ref: 'view-1', transitions: { '*': 'END_Done' } },
 *       END_Done: { state_type: 'END', outcome: 'done' }
 *     }
 *   }
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
            type: BranchTypes.ARRAY_ITEM,
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

    return processViews();
  })();

  // Extract core properties that need special handling (views and context are handled separately)
  const { views: _views, context: _context, ...restOptions } = options;
  void _views; // Handled via processedViews
  void _context; // Used to construct view build context

  return {
    ...restOptions,
    id: flowId,
    views: processedViews,
    ...(options.data && { data: options.data }),
    ...(options.schema && { schema: options.schema }),
    navigation: options.navigation,
  };
}
