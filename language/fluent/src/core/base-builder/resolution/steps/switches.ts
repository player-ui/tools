import type { BaseBuildContext, SwitchMetadata } from "../../types";
import type { AuxiliaryStorage } from "../../storage/auxiliary-storage";
import { isSwitchResult } from "../../guards";
import { setValueAtPath } from "../path-resolver";

/**
 * Step 7: Resolves switches
 *
 * Processes switch expressions and injects them at the specified paths.
 * Handles both static and dynamic switches with proper ID generation.
 *
 * @param auxiliaryStorage - Storage containing switch metadata
 * @param result - The result object being built
 * @param nestedParentContext - Context for switch resolution
 * @param arrayProperties - Set of property names that are array types
 */
export function resolveSwitches<C extends BaseBuildContext>(
  auxiliaryStorage: AuxiliaryStorage,
  result: Record<string, unknown>,
  nestedParentContext: C | undefined,
  arrayProperties: ReadonlySet<string>,
): void {
  const switches = auxiliaryStorage.getArray<SwitchMetadata<C>>("__switches__");
  if (switches.length === 0 || !nestedParentContext) {
    return;
  }

  let globalCaseIndex = 0;
  switches.forEach(({ path, switchFn }) => {
    // Create a context that includes the property/slot name for proper ID generation
    // For path ["label"], this creates: parent-label-staticSwitch-0-text
    // We construct the parent ID directly without registering it (no genId call)
    const propertyName = String(path[0]);
    const switchParentId = nestedParentContext.parentId
      ? `${nestedParentContext.parentId}-${propertyName}`
      : propertyName;

    const switchContext = {
      ...nestedParentContext,
      parentId: switchParentId,
      branch: undefined,
    } as C;

    let switchResult = switchFn(switchContext, globalCaseIndex);

    // Count cases for next switch's offset
    if (isSwitchResult(switchResult)) {
      const switchCases =
        switchResult.staticSwitch ?? switchResult.dynamicSwitch;
      if (Array.isArray(switchCases)) {
        globalCaseIndex += switchCases.length;
      }
    }

    // If this property is an array type (e.g., actions: Array<AssetWrapper<T>>),
    // wrap the switch result in an array to match the expected schema type.
    // Only wrap if we're replacing the entire property (path.length === 1),
    // not a specific element in the array (path.length > 1)
    if (arrayProperties.has(propertyName) && path.length === 1) {
      switchResult = [switchResult];
    }

    setValueAtPath(result, path, switchResult);
  });
}
