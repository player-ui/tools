import type { Asset } from "@player-ui/types";
import type { FluentBuilder, BaseBuildContext } from "../types";
import { isFluentBuilder, isAsset, isAssetWrapperValue } from "../guards";

/**
 * Resolves a value or function to its final value
 *
 * Generic helper that unwraps functions to their return values.
 * Handles both simple functions and ConditionalValue types.
 */
export function resolveValueOrFunction<V>(value: V | (() => V)): V {
  if (typeof value === "function" && !isFluentBuilder(value)) {
    // SAFETY: We've checked it's a function and not a FluentBuilder,
    // so it must be a function returning V
    return (value as () => V)();
  }

  return value as V;
}

/**
 * Type guard to check if a value should be wrapped in AssetWrapper format
 */
export function shouldWrapInAssetWrapper(
  value: unknown,
): value is
  | FluentBuilder<unknown, BaseBuildContext>
  | Asset
  | Array<FluentBuilder<unknown, BaseBuildContext> | Asset> {
  // Don't wrap if already wrapped (has 'asset' property but not 'type')
  if (isAssetWrapperValue(value)) {
    return false;
  }

  // Wrap FluentBuilders
  if (isFluentBuilder(value)) {
    return true;
  }

  // Wrap Assets (objects with 'type' property)
  if (isAsset(value)) {
    return true;
  }

  // Wrap arrays of builders/assets
  if (Array.isArray(value) && value.length > 0) {
    const firstItem = value[0];
    return isFluentBuilder(firstItem) || isAsset(firstItem);
  }

  return false;
}

/**
 * Wraps a value in AssetWrapper format if needed
 * This enables if() and ifElse() to work with unwrapped asset builders
 */
export function maybeWrapAsset<V>(value: V): V | { asset: V } {
  if (shouldWrapInAssetWrapper(value)) {
    return { asset: value };
  }

  return value;
}
