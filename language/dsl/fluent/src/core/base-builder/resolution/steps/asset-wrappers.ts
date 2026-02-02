import type { BaseBuildContext } from "../../types";
import type { ValueStorage } from "../../storage/value-storage";
import { isAssetWrapperValue } from "../../guards";
import { resolveAndWrapAsset } from "../value-resolver";

/**
 * Step 4: Resolves AssetWrapper values in static storage
 *
 * Processes values that were marked as AssetWrapper during value setting.
 * These values contain assets or builders that need special context handling.
 *
 * @param storage - The value storage
 * @param result - The result object being built
 * @param nestedParentContext - Context for nested assets
 */
export function resolveAssetWrappers<T, C extends BaseBuildContext>(
  storage: ValueStorage<T>,
  result: Record<string, unknown>,
  nestedParentContext: C | undefined,
): void {
  if (!nestedParentContext) {
    return;
  }

  const values = storage.getValues();

  for (const key of Object.keys(values)) {
    const value = values[key as keyof T];

    if (isAssetWrapperValue(value)) {
      const unwrapped = value.asset;

      if (Array.isArray(unwrapped)) {
        result[key] = resolveAssetWrapperArray(
          unwrapped,
          nestedParentContext,
          key,
        );
      } else {
        result[key] = resolveAndWrapAsset(unwrapped, {
          context: nestedParentContext,
          slotName: key,
        });
      }
    }
  }
}

/**
 * Helper: Resolves an array within an AssetWrapper
 */
function resolveAssetWrapperArray<C extends BaseBuildContext>(
  array: readonly unknown[],
  context: C,
  key: string,
): unknown[] {
  // Filter out null/undefined values before processing
  return array
    .filter((item) => item !== null && item !== undefined)
    .map((item, index) => {
      const slotName = `${key}-${index}`;
      return resolveAndWrapAsset(item, { context, slotName });
    });
}
