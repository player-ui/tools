import type { BaseBuildContext } from "../types";
import type { ValueStorage } from "../storage/value-storage";
import type { AuxiliaryStorage } from "../storage/auxiliary-storage";
import { resolveStaticValues } from "./steps/static-values";
import { generateAssetIdForBuilder } from "./steps/asset-id";
import { resolveAssetWrappers } from "./steps/asset-wrappers";
import { resolveMixedArrays } from "./steps/mixed-arrays";
import { resolveBuilders } from "./steps/builders";
import { resolveSwitches } from "./steps/switches";
import { resolveTemplates } from "./steps/templates";
import { resolveNestedAssetWrappers } from "./steps/nested-asset-wrappers";

/**
 * Creates a nested context for child assets
 * This is Step 3 of the build process
 */
function createNestedParentContext<C extends BaseBuildContext>(
  result: Record<string, unknown>,
  context: C | undefined,
): C | undefined {
  if (!context) {
    return undefined;
  }

  // Extract parent ID with type checking
  const parentId =
    "id" in result && typeof result.id === "string" ? result.id : undefined;

  // Create context for nested assets
  // We clear the branch to avoid double-nesting
  return {
    ...context,
    parentId,
    branch: undefined,
  } as C;
}

/**
 * Executes the complete build pipeline
 *
 * The pipeline consists of 9 steps that transform builder state into a final object:
 * 1. Resolve static values (extract TaggedTemplateValue, resolve simple builders)
 * 2. Generate asset ID if needed
 * 3. Create nested context for child assets
 * 4. Resolve AssetWrapper values
 * 5. Resolve mixed arrays
 * 6. Resolve builders
 * 7. Resolve nested AssetWrapper paths
 * 8. Resolve switches
 * 9. Resolve templates
 *
 * @param valueStorage - Storage containing property values
 * @param auxiliaryStorage - Storage containing metadata (templates, switches)
 * @param defaults - Optional default values to merge into result
 * @param context - Optional build context
 * @param arrayProperties - Set of property names that are array types
 * @param assetWrapperPaths - Paths to nested AssetWrapper properties
 * @returns The fully built object
 */
export function executeBuildPipeline<T, C extends BaseBuildContext>(
  valueStorage: ValueStorage<T>,
  auxiliaryStorage: AuxiliaryStorage,
  defaults: Partial<T> | undefined,
  context: C | undefined,
  arrayProperties: ReadonlySet<string>,
  assetWrapperPaths: ReadonlyArray<ReadonlyArray<string>> = [],
): T {
  const result: Record<string, unknown> = defaults ? { ...defaults } : {};

  // Step 1: Resolve static values
  resolveStaticValues(valueStorage, result, context);

  // Step 2: Generate asset ID if needed
  generateAssetIdForBuilder(valueStorage, result, context);

  // Step 3: Create nested context for child assets
  const nestedParentContext = createNestedParentContext(result, context);

  // Step 4: Resolve AssetWrapper values
  resolveAssetWrappers(valueStorage, result, nestedParentContext);

  // Step 5: Resolve mixed arrays
  resolveMixedArrays(valueStorage, result, nestedParentContext);

  // Step 6: Resolve builders
  resolveBuilders(valueStorage, result, nestedParentContext);

  // Step 7: Resolve nested AssetWrapper paths
  resolveNestedAssetWrappers(result, nestedParentContext, assetWrapperPaths);

  // Step 8: Resolve switches
  resolveSwitches(
    auxiliaryStorage,
    result,
    nestedParentContext,
    arrayProperties,
  );

  // Step 9: Resolve templates
  resolveTemplates(auxiliaryStorage, result, context);

  return result as T;
}
