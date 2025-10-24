import type { Asset, AssetWrapper } from "@player-ui/types";
import type { BaseBuildContext, FluentBuilder } from "./types";
import { FLUENT_BUILDER_SYMBOL } from "./types";

/**
 * Type guard to check if a value is a FluentBuilder instance
 * Checks for the builder symbol and build method
 */
export function isFluentBuilder<
  T = unknown,
  C extends BaseBuildContext = BaseBuildContext,
>(value: unknown): value is FluentBuilder<T, C> {
  if (value === null || typeof value !== "object") {
    return false;
  }

  if (!(FLUENT_BUILDER_SYMBOL in value)) {
    return false;
  }

  const obj = value as Record<symbol | string, unknown>;

  return obj[FLUENT_BUILDER_SYMBOL] === true && typeof obj.build === "function";
}

/**
 * Type guard to check if a value is an array of FluentBuilders
 */
export function isBuilderArray<
  T = unknown,
  C extends BaseBuildContext = BaseBuildContext,
>(value: unknown): value is Array<FluentBuilder<T, C>> {
  return Array.isArray(value) && value.every(isFluentBuilder);
}

/**
 * Type guard to check if a value is a plain object (not a class instance)
 * Returns true for objects created with {} or Object.create(null)
 */
export function isPlainObject(
  value: unknown,
): value is Record<string, unknown> {
  if (!value || typeof value !== "object") return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Type guard to check if a value is an Asset (has required 'type' property)
 * Assets are the core building blocks in Player UI
 */
export function isAsset(value: unknown): value is Asset {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return "type" in obj && typeof obj.type === "string";
}

/**
 * Type guard to check if a value is an AssetWrapper
 * AssetWrapper has a single 'asset' property containing the wrapped value
 */
export function isAssetWrapper<T extends Asset = Asset>(
  value: unknown,
): value is AssetWrapper<T> {
  if (!value || typeof value !== "object") return false;
  const obj = value as Record<string, unknown>;
  return "asset" in obj && typeof obj.asset === "object" && obj.asset !== null;
}

/**
 * Type guard to check if a value is an AssetWrapper containing an Asset
 * More strict than isAssetWrapper - verifies the wrapped value is actually an Asset
 */
export function isAssetWrapperWithAsset<T extends Asset = Asset>(
  value: unknown,
): value is AssetWrapper<T> {
  return isAssetWrapper(value) && isAsset(value.asset);
}

/**
 * Type guard to check if a value is an AssetWrapper value object
 * This is the internal representation: { asset: unknown }
 * Used to detect values that need special handling during build
 */
export function isAssetWrapperValue(
  value: unknown,
): value is { asset: unknown } {
  return (
    typeof value === "object" &&
    value !== null &&
    "asset" in value &&
    Object.keys(value).length === 1
  );
}

/**
 * Determines if a property value needs to be wrapped in AssetWrapper format
 * Used during value storage to decide wrapping strategy
 */
export function needsAssetWrapper(value: unknown): boolean {
  // Don't wrap if already an AssetWrapper
  if (isAssetWrapper(value)) return false;

  // Don't wrap if it's a FluentBuilder (will be resolved later)
  if (isFluentBuilder(value)) return false;

  // Wrap if it's an Asset
  return isAsset(value);
}

/**
 * Type guard to check if a value is a switch result object
 * Switch results contain staticSwitch or dynamicSwitch arrays
 */
export function isSwitchResult(value: unknown): value is Record<
  string,
  unknown
> & {
  staticSwitch?: unknown[];
  dynamicSwitch?: unknown[];
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  return "staticSwitch" in obj || "dynamicSwitch" in obj;
}

/**
 * Type guard to check if a value is a string or undefined
 * Useful for validating optional string properties
 */
export function isStringOrUndefined(
  value: unknown,
): value is string | undefined {
  return value === undefined || typeof value === "string";
}
