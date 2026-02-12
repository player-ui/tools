import type { BaseBuildContext } from "../../types";
import { resolveAndWrapAsset, resolveValue } from "../value-resolver";
import {
  isAsset,
  isAssetWrapper,
  isFluentBuilder,
  isPlainObject,
} from "../../guards";

/**
 * Step 7: Resolves nested AssetWrapper paths
 *
 * This step handles cases where AssetWrapper properties are nested within
 * interface types. It traverses paths like ["header", "left"] to find and
 * wrap assets that should be in AssetWrapper format.
 *
 * @param result - The result object being built
 * @param context - Context for nested assets
 * @param assetWrapperPaths - Array of paths to AssetWrapper properties
 */
export function resolveNestedAssetWrappers<C extends BaseBuildContext>(
  result: Record<string, unknown>,
  context: C | undefined,
  assetWrapperPaths: ReadonlyArray<ReadonlyArray<string>>,
): void {
  if (assetWrapperPaths.length === 0) {
    return;
  }

  for (const path of assetWrapperPaths) {
    // Skip empty paths (defensive guard against malformed metadata)
    if (path.length === 0) {
      continue;
    }

    // Paths with length 1 are handled by direct AssetWrapper resolution (Step 4)
    if (path.length < 2) {
      continue;
    }

    resolvePathInResult(result, path, context);
  }
}

/**
 * Resolves a specific path in the result object.
 * Handles intermediate FluentBuilders by resolving them before continuing traversal.
 */
function resolvePathInResult<C extends BaseBuildContext>(
  result: Record<string, unknown>,
  path: ReadonlyArray<string>,
  context: C | undefined,
): void {
  // Navigate to the parent object containing the AssetWrapper property
  let current: unknown = result;

  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];

    if (!isPlainObject(current)) {
      return;
    }

    let next = (current as Record<string, unknown>)[key];

    if (next === undefined || next === null) {
      return;
    }

    // If intermediate value is a builder, resolve it first
    if (isFluentBuilder(next)) {
      next = resolveValue(next, { context, propertyName: key });
      (current as Record<string, unknown>)[key] = next;
    }

    current = next;
  }

  // Now `current` is the parent object, and we need to wrap the final property
  const finalKey = path[path.length - 1];

  if (!isPlainObject(current)) {
    return;
  }

  const parent = current as Record<string, unknown>;
  const value = parent[finalKey];

  if (value === undefined || value === null) {
    return;
  }

  // If it's already an AssetWrapper, skip
  if (isAssetWrapper(value)) {
    return;
  }

  // Generate slot name from the full path
  const slotName = path.join("-");

  // Handle arrays of AssetWrappers
  if (Array.isArray(value)) {
    parent[finalKey] = value
      .filter((item) => item !== null && item !== undefined)
      .map((item, index) => {
        if (isAssetWrapper(item)) {
          return item;
        }
        return resolveAndWrapAsset(item, {
          context,
          slotName: `${slotName}-${index}`,
        });
      });
    return;
  }

  // Handle single value that needs wrapping
  if (isFluentBuilder(value) || isAsset(value)) {
    parent[finalKey] = resolveAndWrapAsset(value, {
      context,
      slotName,
    });
  }
}
