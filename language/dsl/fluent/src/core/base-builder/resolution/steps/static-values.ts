import type { BaseBuildContext } from "../../types";
import type { ValueStorage } from "../../storage/value-storage";
import { isAssetWrapperValue } from "../../guards";
import { extractValue, resolveValue } from "../value-resolver";

/**
 * Step 1: Resolves static values
 *
 * Converts TaggedTemplateValue to strings and resolves nested FluentBuilders
 * in static storage. AssetWrapper values are preserved for later processing.
 *
 * @param storage - The value storage containing static values
 * @param result - The result object being built
 * @param context - Optional build context
 */
export function resolveStaticValues<T, C extends BaseBuildContext>(
  storage: ValueStorage<T>,
  result: Record<string, unknown>,
  context: C | undefined,
): void {
  const values = storage.getValues();

  for (const [key, value] of Object.entries(values)) {
    if (!isAssetWrapperValue(value)) {
      // First extract any TaggedTemplateValue instances (recursively)
      // Pass the property key to handle special cases like 'binding'
      const extracted = extractValue(value, { propertyKey: key });
      // Then resolve FluentBuilders and nested contexts
      result[key] = resolveValue(extracted, { context, propertyName: key });
    } else {
      // Keep AssetWrapper values for later processing
      result[key] = value;
    }
  }
}
