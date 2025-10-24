import type { BaseBuildContext } from "../../types";
import type { ValueStorage } from "../../storage/value-storage";
import { isFluentBuilder, isAssetWrapperValue } from "../../guards";
import { createNestedContext } from "../../context";
import { resolveValue, resolveAndWrapAsset } from "../value-resolver";

/**
 * Step 5: Resolves mixed arrays
 *
 * Processes arrays containing both builders and static values.
 * Builders are resolved with proper context, static values pass through.
 *
 * @param storage - The value storage
 * @param result - The result object being built
 * @param nestedParentContext - Context for nested builders
 */
export function resolveMixedArrays<T, C extends BaseBuildContext>(
  storage: ValueStorage<T>,
  result: Record<string, unknown>,
  nestedParentContext: C | undefined,
): void {
  const mixedArrays = storage.getMixedArrays();

  mixedArrays.forEach((metadata, key) => {
    const { array, builderIndices, objectIndices } = metadata;

    // Check if this is an AssetWrapper array
    const currentValue = result[key];
    if (isAssetWrapperValue(currentValue)) {
      resolveMixedArrayAsAssetWrapper(
        result,
        key,
        currentValue,
        nestedParentContext,
      );
    } else {
      resolveMixedArrayNormal(
        result,
        key,
        array,
        builderIndices,
        objectIndices,
        nestedParentContext,
      );
    }
  });
}

/**
 * Helper: Resolves mixed array that is wrapped in AssetWrapper
 */
function resolveMixedArrayAsAssetWrapper<C extends BaseBuildContext>(
  result: Record<string, unknown>,
  key: string,
  wrapperValue: { asset: unknown },
  nestedParentContext: C | undefined,
): void {
  const unwrappedArray = wrapperValue.asset;

  if (Array.isArray(unwrappedArray)) {
    // Filter out null/undefined values before processing
    result[key] = unwrappedArray
      .filter((item) => item !== null && item !== undefined)
      .map((item, index) => {
        const slotName = `${key}-${index}`;
        return resolveAndWrapAsset(item, {
          context: nestedParentContext,
          slotName,
        });
      });
  }
}

/**
 * Helper: Resolves mixed array normally (not wrapped)
 */
function resolveMixedArrayNormal<C extends BaseBuildContext>(
  result: Record<string, unknown>,
  key: string,
  array: readonly unknown[],
  builderIndices: ReadonlySet<number>,
  objectIndices: ReadonlySet<number>,
  nestedParentContext: C | undefined,
): void {
  const resolvedArray: unknown[] = [];

  array.forEach((item, index) => {
    // Skip null or undefined values
    if (item === null || item === undefined) {
      return;
    }

    if (builderIndices.has(index) && isFluentBuilder(item)) {
      const nestedContext = nestedParentContext
        ? createNestedContext({
            parentContext: nestedParentContext,
            parameterName: key,
            index,
          })
        : undefined;
      resolvedArray.push(item.build(nestedContext));
    } else if (objectIndices.has(index)) {
      const nestedContext = nestedParentContext
        ? createNestedContext({
            parentContext: nestedParentContext,
            parameterName: key,
            index,
          })
        : undefined;
      resolvedArray.push(resolveValue(item, { context: nestedContext }));
    } else {
      resolvedArray.push(item);
    }
  });

  result[key] = resolvedArray;
}
