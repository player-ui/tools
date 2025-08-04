import { Asset } from "@player-ui/types";
import type { TaggedTemplateValue } from "./tagged-template";
import { FluentBuilder } from "./builder";

/**
 * Represents values that can be used in switch case expressions.
 *
 * Case expressions are evaluated to determine which switch branch to take.
 * They can be literal values, template expressions, or computed values.
 */
export type CaseExpression = boolean | string | TaggedTemplateValue;

/**
 * Represents a path for targeting where to inject switches in an asset structure.
 *
 * Paths are arrays that can contain strings for object properties and numbers
 * for array indices, allowing precise targeting of nested locations.
 *
 * @example
 * ```typescript
 * // Target object property: obj.values
 * const objectPath: SwitchPath = ['values'];
 *
 * // Target array element: obj.values[1]
 * const arrayPath: SwitchPath = ['values', 1];
 *
 * // Target nested property: obj.values[1].content
 * const nestedPath: SwitchPath = ['values', 1, 'content'];
 * ```
 */
export type SwitchPath = Array<string | number>;

/**
 * Configuration for a single switch case.
 *
 * Each case defines a condition and the asset to render when that condition
 * is met. The asset can be a static asset or a function that generates an
 * asset based on the parent context.
 *
 * @template T - The asset type that this case can produce
 */
export interface SwitchCase<T extends Asset<string>> {
  /** The condition that determines if this case should be selected */
  readonly case: CaseExpression;
  /** The asset to render for this case, or a function that generates it */
  readonly asset: T | FluentBuilder<T>;
}

/**
 * Arguments for creating a switch configuration.
 *
 * Defines the complete switch behavior including all cases and whether
 * the switch should be evaluated dynamically at runtime.
 *
 * @template T - The asset type that switch cases can produce
 */
export interface SwitchArgs<T extends Asset<string>> {
  /** Array of cases to evaluate in order */
  readonly cases: ReadonlyArray<SwitchCase<T>>;
  /** Whether the switch should be evaluated dynamically at runtime */
  readonly isDynamic?: boolean;
}

/**
 * Configuration for adding a switch to a builder.
 *
 * Combines a target path with switch configuration to specify exactly
 * where and how a switch should be injected into an asset structure.
 *
 * @template T - The asset type that the switch cases can produce
 */
export interface WithSwitchConfig<T extends Asset<string>> {
  /** Path array like ['values', 1] or ['foo', 'bar'] to target where to inject the switch */
  readonly path: SwitchPath;
  /** Switch configuration defining the cases and behavior */
  readonly switch: SwitchArgs<T>;
}
