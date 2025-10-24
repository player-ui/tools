import type { BaseBuildContext } from "../../types";
import type { ValueStorage } from "../../storage/value-storage";
import { isAssetWrapperValue } from "../../guards";
import { createNestedContext } from "../../context";
import { resolveValue, resolveAndWrapAsset } from "../value-resolver";

/**
 * Step 6: Resolves regular builders (non-array)
 *
 * Processes FluentBuilder instances and objects containing builders.
 * Creates nested contexts for proper ID generation.
 *
 * @param storage - The value storage
 * @param result - The result object being built
 * @param nestedParentContext - Context for nested builders
 */
export function resolveBuilders<T, C extends BaseBuildContext>(
  storage: ValueStorage<T>,
  result: Record<string, unknown>,
  nestedParentContext: C | undefined,
): void {
  const builders = storage.getBuilders();

  builders.forEach((value, key) => {
    // Check if this is an AssetWrapper
    if (isAssetWrapperValue(value)) {
      resolveBuilderAsAssetWrapper(result, key, value, nestedParentContext);
    } else {
      resolveBuilderNormal(result, key, value, nestedParentContext);
    }
  });
}

/**
 * Helper: Resolves builder that is wrapped in AssetWrapper
 */
function resolveBuilderAsAssetWrapper<C extends BaseBuildContext>(
  result: Record<string, unknown>,
  key: string,
  wrapperValue: { asset: unknown },
  nestedParentContext: C | undefined,
): void {
  const unwrapped = wrapperValue.asset;

  if (nestedParentContext) {
    if (Array.isArray(unwrapped)) {
      // Filter out null/undefined values before processing
      result[key] = unwrapped
        .filter((item) => item !== null && item !== undefined)
        .map((item, index) => {
          const slotName = `${key}-${index}`;
          return resolveAndWrapAsset(item, {
            context: nestedParentContext,
            slotName,
          });
        });
    } else {
      result[key] = resolveAndWrapAsset(unwrapped, {
        context: nestedParentContext,
        slotName: key,
      });
    }
  } else {
    // No context, just resolve the wrapper
    result[key] = resolveValue(wrapperValue, {});
  }
}

/**
 * Helper: Resolves builder normally (not wrapped)
 */
function resolveBuilderNormal<C extends BaseBuildContext>(
  result: Record<string, unknown>,
  key: string,
  value: unknown,
  nestedParentContext: C | undefined,
): void {
  const nestedContext = nestedParentContext
    ? createNestedContext({
        parentContext: nestedParentContext,
        parameterName: key,
      })
    : undefined;
  result[key] = resolveValue(value, { context: nestedContext });
}
