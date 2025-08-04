import type { Asset, AssetWrapperOrSwitch } from "@player-ui/types";
import type {
  CaseExpression,
  ParentCtx,
  SwitchArgs,
  WithSwitchConfig,
} from "../types";
import { genId } from "../id-generator";
import { isTaggedTemplateValue, SWITCH_FUNCTION_MARKER } from "../types";
import { setAtPath } from "../utils";
import { FluentBuilder, isFluentBuilder } from "../types/builder";

/**
 * Processes a case expression into its final evaluated form.
 *
 * Case expressions can be boolean literals, string literals, or TaggedTemplateValue
 * instances that need to be converted to their runtime representation. This function
 * normalizes all expression types to their final string or boolean values.
 *
 * @param expression - The case expression to process
 * @returns The processed case expression as a string or boolean
 *
 * @example
 * ```typescript
 * // Boolean literals pass through unchanged
 * processCaseExpression(true);  // true
 * processCaseExpression(false); // false
 *
 * // String literals are converted to strings
 * processCaseExpression("admin"); // "admin"
 *
 * // TaggedTemplateValues are converted to their string representation
 * const expr = binding`user.role`;
 * processCaseExpression(expr); // "@[user.role]" (or similar binding syntax)
 *
 * // Other values are stringified
 * processCaseExpression(42); // "42"
 * ```
 */
function processCaseExpression(expression: CaseExpression): string | boolean {
  // Boolean values pass through unchanged
  if (typeof expression === "boolean") {
    return expression;
  }

  // TaggedTemplateValues are converted using their toString method
  if (isTaggedTemplateValue(expression)) {
    return expression.toString();
  }

  // All other values are converted to strings
  return String(expression);
}

/**
 * Creates a switch configuration for conditionally selecting an asset.
 *
 * The switch function creates a conditional branching structure that evaluates
 * cases in order and renders the asset from the first matching case. This enables
 * dynamic content selection based on runtime conditions.
 *
 * Key features:
 * - **Ordered evaluation**: Cases are evaluated in the order they appear
 * - **First match wins**: Only the first matching case is executed
 * - **Static vs Dynamic**: Can be configured for compile-time or runtime evaluation
 * - **Context propagation**: Parent context is properly passed to child assets
 * - **ID generation**: Automatic ID generation for case assets when not provided
 *
 * @template T - The asset type that switch cases can produce
 * @param args - Configuration object containing cases and switch behavior
 * @returns A function that takes parent context and returns a switch configuration
 *
 * @example
 * ```typescript
 * // Basic conditional rendering
 * const userGreeting = switch_({
 *   cases: [
 *     {
 *       case: binding`user.isAdmin`,
 *       asset: text({ value: "Welcome, Administrator!" })
 *     },
 *     {
 *       case: binding`user.isPremium`,
 *       asset: text({ value: "Welcome, Premium User!" })
 *     },
 *     {
 *       case: true, // Default case
 *       asset: text({ value: "Welcome, User!" })
 *     }
 *   ],
 *   isDynamic: true
 * });
 *
 * // Static switch for compile-time optimization
 * const themeButton = switch_({
 *   cases: [
 *     { case: "dark", asset: button({ text: "Switch to Light" }) },
 *     { case: "light", asset: button({ text: "Switch to Dark" }) }
 *   ],
 *   isDynamic: false
 * });
 *
 * // Using with builder functions
 * const dynamicList = switch_({
 *   cases: [
 *     {
 *       case: binding`items.length > 0`,
 *       asset: (ctx) => collection({ values: generateItems(ctx) })
 *     },
 *     {
 *       case: true,
 *       asset: text({ value: "No items to display" })
 *     }
 *   ]
 * });
 * ```
 *
 * @see {@link https://player-ui.github.io/next/content/assets-views/#switches} Player UI Switches Documentation
 */
export const switch_: <T extends Asset<string>>({
  cases,
  isDynamic,
}: SwitchArgs<T>) => {
  <K extends ParentCtx>(ctx: K): AssetWrapperOrSwitch;
  [SWITCH_FUNCTION_MARKER]: boolean;
} = <T extends Asset<string>>({ cases, isDynamic = false }: SwitchArgs<T>) => {
  const fn = <K extends ParentCtx>(ctx: K): AssetWrapperOrSwitch => {
    const switchType = isDynamic ? "dynamic" : "static";

    return {
      [`${switchType}Switch`]: cases.map((switchCase, index) => {
        // Create context for this specific case with proper branch information
        const caseParentCtx: K = {
          ...ctx,
          parentId: ctx.parentId,
          branch: {
            type: "switch",
            kind: switchType,
            index,
          },
        } as K;

        // Resolve the asset for this case (either static or function-generated)
        const asset = isFluentBuilder(switchCase.asset)
          ? switchCase.asset(caseParentCtx)
          : switchCase.asset;

        return {
          case: processCaseExpression(switchCase.case),
          asset: {
            ...asset,
            // Generate ID if not provided, using the case's context
            id: asset.id ?? genId(caseParentCtx),
          },
        };
      }),
    } as AssetWrapperOrSwitch;
  };

  fn[SWITCH_FUNCTION_MARKER] = true;

  return fn;
};

/**
 * Builder interface that supports adding switches to existing asset builders.
 *
 * This interface extends regular asset builders with switch functionality,
 * allowing for fluent API chaining while maintaining type safety. The builder
 * can generate assets with context and supports adding multiple switches at
 * different paths within the asset structure.
 *
 * @template T - The asset type that this builder produces
 */
export interface SwitchableBuilder<T extends Asset<string>> {
  /**
   * Generate the asset with the given parent context.
   * This is the main execution method that produces the final asset.
   */
  <K extends ParentCtx>(ctx: K): T;

  /**
   * Add switch functionality to the builder at a specific path.
   * Returns a new builder that includes the switch configuration.
   */
  switch: <U extends Asset<string>>(
    config: WithSwitchConfig<U>,
  ) => SwitchableBuilder<T>;

  /**
   * @private Internal storage for switch configurations.
   * This should not be accessed directly by consumer code.
   */
  _switchConfigs?: Array<WithSwitchConfig<Asset<string>>>;
}

/**
 * Enhances any asset builder with switch functionality while maintaining the fluent API.
 *
 * This function takes an existing asset builder and wraps it with switch capabilities,
 * allowing multiple switches to be added at different paths within the asset structure.
 * The enhanced builder maintains all the type safety and fluent API characteristics
 * of the original builder while adding the ability to conditionally replace parts
 * of the asset structure.
 *
 * Key features:
 * - **Fluent API**: Maintains chainable method syntax
 * - **Multiple switches**: Supports adding multiple switches to different paths
 * - **Sequential indexing**: Ensures unique IDs across all switch cases
 * - **Type safety**: Preserves TypeScript type information throughout
 * - **Immutable updates**: Uses immutable path updates to modify asset structure
 *
 * @template T - The asset type that the original builder produces
 * @param builder - The original asset builder function to enhance
 * @returns A new switchable builder with enhanced functionality
 *
 * @example
 * ```typescript
 * // Basic usage with a collection
 * const collectionWithSwitch = withSwitch(
 *   collection().withValues([
 *     text().withValue("Item 1"),
 *     text().withValue("Item 2"),
 *     text().withValue("Item 3"),
 *   ])
 * ).switch({
 *   path: ['values', 1], // Replace the second item
 *   switch: {
 *     cases: [
 *       { case: binding`user.isAdmin`, asset: text().withValue("Admin Item") },
 *       { case: true, asset: text().withValue("Default Item") }
 *     ]
 *   }
 * });
 *
 * // Multiple switches on the same builder
 * const multiSwitchCollection = withSwitch(
 *   collection().withValues([
 *     text().withValue("Header"),
 *     text().withValue("Content"),
 *     text().withValue("Footer")
 *   ])
 * )
 * .switch({
 *   path: ['values', 0], // Add a switch before the header
 *   switch: {
 *     cases: [
 *       { case: binding`user.role === 'admin'`, asset: adminHeader() },
 *       { case: true, asset: normalHeader() }
 *     ]
 *   }
 * })
 * .switch({
 *   path: ['values', 2], // Add a switch before the footer
 *   switch: {
 *     cases: [
 *       { case: binding`features.betaFooter`, asset: betaFooter() },
 *       { case: true, asset: standardFooter() }
 *     ]
 *   }
 * });
 *
 * // Nested path targeting
 * const formWithConditionalField = withSwitch(
 *   form().withFields([
 *     textField().withLabel("Name"),
 *     textField().withLabel("Email"),
 *     textField().withLabel("Phone")
 *   ])
 * ).switch({
 *   path: ['fields', 2, 'validation'], // Target validation of third field
 *   switch: {
 *     cases: [
 *       { case: binding`requirePhone`, asset: phoneValidation() },
 *       { case: true, asset: optionalValidation() }
 *     ]
 *   }
 * });
 * ```
 */
export function withSwitch<T extends Asset<string>>(
  builder: FluentBuilder<T>,
): SwitchableBuilder<T> {
  /**
   * Creates a switch configuration with sequential case indexing.
   * This internal function ensures that all switch cases across multiple
   * switches get unique sequential indices for proper ID generation.
   */
  const createSwitchWithSequentialIndexing =
    <U extends Asset<string>>(
      switchConfig: SwitchArgs<U>,
      globalIndexRef: { current: number },
    ) =>
    <K extends ParentCtx>(ctx: K): AssetWrapperOrSwitch => {
      const { cases, isDynamic = false } = switchConfig;
      const switchType = isDynamic ? "dynamic" : "static";

      return {
        [`${switchType}Switch`]: cases.map((switchCase) => {
          // Each case gets a unique global index for consistent ID generation
          const caseParentCtx: K = {
            ...ctx,
            parentId: ctx.parentId,
            branch: {
              type: "switch",
              kind: switchType,
              index: globalIndexRef.current++,
            },
          } as K;

          // Resolve asset (static or function-generated)
          const asset =
            typeof switchCase.asset === "function"
              ? switchCase.asset(caseParentCtx)
              : switchCase.asset;

          return {
            case: processCaseExpression(switchCase.case),
            asset: {
              ...asset,
              id: asset.id ?? genId(caseParentCtx),
            },
          };
        }),
      } as AssetWrapperOrSwitch;
    };

  // Create the enhanced builder function
  const switchableBuilder = (<K extends ParentCtx>(ctx: K): T => {
    // Start with the base asset from the original builder
    let result = builder(ctx);

    // Apply all switch configurations if any exist
    if (switchableBuilder._switchConfigs?.length) {
      // Use a reference object to maintain sequential indexing across switches
      const globalIndexRef = { current: 0 };

      for (const config of switchableBuilder._switchConfigs) {
        const switchAsset = createSwitchWithSequentialIndexing(
          config.switch,
          globalIndexRef,
        )(ctx);

        // Apply the switch at the specified path
        result = setAtPath(result, config.path, switchAsset) as T;
      }
    }

    return result;
  }) as SwitchableBuilder<T>;

  // Initialize switch configurations storage
  switchableBuilder._switchConfigs = [];

  // Add the switch method for fluent API
  switchableBuilder.switch = <U extends Asset<string>>(
    config: WithSwitchConfig<U>,
  ): SwitchableBuilder<T> => {
    switchableBuilder._switchConfigs = switchableBuilder._switchConfigs || [];
    switchableBuilder._switchConfigs.push(config);
    return switchableBuilder;
  };

  return switchableBuilder;
}
