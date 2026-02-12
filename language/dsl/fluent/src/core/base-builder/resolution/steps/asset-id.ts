import type { BaseBuildContext, AssetMetadata } from "../../types";
import type { ValueStorage } from "../../storage/value-storage";
import { isStringOrUndefined } from "../../guards";
import { generateAssetId } from "../../id/generator";

/**
 * Step 2: Generates ID for this asset if needed
 *
 * Note: This runs AFTER resolveStaticValues, so we use values from result
 * rather than from storage.
 *
 * @param storage - The value storage (used to check if ID was explicitly set)
 * @param result - The result object being built (contains resolved values)
 * @param context - Optional build context
 */
export function generateAssetIdForBuilder<T, C extends BaseBuildContext>(
  storage: ValueStorage<T>,
  result: Record<string, unknown>,
  context: C | undefined,
): void {
  const hasIdSet = storage.has("id" as keyof T);
  const hasType = storage.has("type" as keyof T) || "type" in result;
  const hasIdField = "id" in result;

  // Case 1: Asset with type field (standard case)
  if (!hasIdSet && hasType) {
    // Use values from result since they're already extracted
    const typeValue = result.type;
    const assetValue = result.value;
    const assetBinding = result.binding;

    // Validate types with type guards
    if (!isStringOrUndefined(typeValue)) {
      return; // Skip ID generation if type is not a string
    }

    if (!isStringOrUndefined(assetValue)) {
      return; // Skip if value is not string/undefined
    }

    if (!isStringOrUndefined(assetBinding)) {
      return; // Skip if binding is not string/undefined
    }

    const assetMetadata: AssetMetadata = {
      type: typeValue as string,
      ...(assetValue ? { value: assetValue as string } : {}),
      ...(assetBinding ? { binding: assetBinding as string } : {}),
    };

    const generatedId = generateAssetId({
      context,
      parameterName: typeValue as string,
      assetMetadata,
      explicitId: undefined,
    });

    if (generatedId) {
      result.id = generatedId;
    }
  }
  // Case 2: Object with id field but no type (e.g., ChoiceItem)
  // Generate ID based on context branch if available
  else if (!hasIdSet && hasIdField && !hasType && context && context.branch) {
    // Use genId directly with the context to generate ID based on branch
    const generatedId = generateAssetId({
      context,
      parameterName: "item",
      assetMetadata: undefined,
      explicitId: undefined,
    });

    if (generatedId) {
      result.id = generatedId;
    }
  }
}
