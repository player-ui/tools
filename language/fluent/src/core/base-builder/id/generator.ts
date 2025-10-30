import { globalIdRegistry } from "./registry";
import type { AssetMetadata, BaseBuildContext } from "../types";

export { globalIdRegistry, createIdRegistry, IDRegistry } from "./registry";

/**
 * Resets the global ID registry, clearing all registered IDs.
 * This is useful for testing scenarios where you need a clean slate.
 */
export const resetGlobalIdSet = (): void => {
  globalIdRegistry.reset();
};

/**
 * Internal function that generates a base ID from context without registry operations.
 * This is the core ID generation logic shared between peekId and genId.
 *
 * @param context - The context containing parent ID and optional branch information
 * @param functionName - The name of the calling function (for error messages)
 * @returns The generated base ID
 */
const _generateBaseId = (
  context: BaseBuildContext,
  functionName: string,
): string => {
  // Validate context
  if (!context) {
    throw new Error(
      `${functionName}: Context is undefined. Please provide a valid BaseBuildContext object.`,
    );
  }

  const { parentId, branch } = context;

  let baseId: string;

  if (!branch) {
    baseId = parentId || "";
  } else {
    switch (branch.type) {
      case "custom":
        baseId = parentId || "";
        break;

      case "slot":
        if (!branch.name) {
          throw new Error(
            `${functionName}: Slot branch requires a 'name' property. ` +
              `Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId ? `${parentId}-` : ""}${branch.name}`;
        break;

      case "array-item":
        if (typeof branch.index !== "number") {
          throw new Error(
            `${functionName}: Array-item branch requires a numeric 'index' property. ` +
              `Got: ${typeof branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (branch.index < 0) {
          throw new Error(
            `${functionName}: Array-item index must be non-negative. ` +
              `Got: ${branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-${branch.index}`;
        break;

      case "template":
        if (branch.depth !== undefined && branch.depth < 0) {
          throw new Error(
            `${functionName}: Template depth must be non-negative. ` +
              `Got: ${branch.depth}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-_index${branch.depth || ""}_`;
        break;

      case "switch":
        if (typeof branch.index !== "number") {
          throw new Error(
            `${functionName}: Switch branch requires a numeric 'index' property. ` +
              `Got: ${typeof branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (branch.index < 0) {
          throw new Error(
            `${functionName}: Switch index must be non-negative. ` +
              `Got: ${branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (!branch.kind || !["static", "dynamic"].includes(branch.kind)) {
          throw new Error(
            `${functionName}: Switch branch requires 'kind' to be 'static' or 'dynamic'. ` +
              `Got: ${branch.kind}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-${branch.kind}Switch-${branch.index}`;
        break;

      default: {
        const exhaustiveCheck: never = branch;
        throw new Error(
          `${functionName}: Unhandled branch type: ${JSON.stringify(exhaustiveCheck)}`,
        );
      }
    }
  }

  return baseId;
};

/**
 * Generates an ID without registering it in the global registry.
 * This is useful for intermediate ID lookups where you don't want to consume the ID.
 *
 * @param context - The context containing parent ID and optional branch information
 * @returns The generated ID (without collision detection or registration)
 *
 * @example
 * // Use this when you need to generate a parent ID for nested context creation
 * const parentId = peekId({ parentId: 'collection' }); // Doesn't register 'collection'
 * const nestedCtx = { parentId, branch: { type: 'slot', name: 'label' } };
 */
export const peekId = (context: BaseBuildContext): string => {
  return _generateBaseId(context, "peekId");
};

/**
 * Generates a unique identifier based on the parent ID and branch information.
 *
 * This function creates hierarchical IDs for various element types in a DSL structure,
 * maintaining relationships between parent and child elements through consistent naming patterns.
 * IDs are automatically checked for uniqueness and modified if collisions are detected.
 *
 * @param {BaseBuildContext} context - The context containing parent ID and optional branch information
 * @param {string} context.parentId - The ID of the parent element
 * @param {IdBranch} [context.branch] - Optional branch information to specify the type of child element
 *
 * @returns {string} A generated ID string representing the element's unique identifier
 *
 * @throws {Error} If context is invalid or incomplete
 *
 * @example
 * // Slot branch
 * genId({ parentId: 'parent', branch: { type: 'slot', name: 'header' } })
 * // Returns: 'parent-header'
 *
 * @example
 * // Array item branch
 * genId({ parentId: 'list', branch: { type: 'array-item', index: 2 } })
 * // Returns: 'list-2'
 *
 * @example
 * // Template branch
 * genId({ parentId: 'template', branch: { type: 'template', depth: 1 } })
 * // Returns: 'template-_index1_'
 *
 * @example
 * // Switch branch
 * genId({ parentId: 'condition', branch: { type: 'switch', index: 0, kind: 'static' } })
 * // Returns: 'condition-staticSwitch-0'
 *
 * @example
 * // Custom ID case (no branch)
 * genId({ parentId: 'custom-id' })
 * // Returns: 'custom-id'
 */
export const genId = (context: BaseBuildContext): string => {
  const baseId = _generateBaseId(context, "genId");

  const { parentId, branch } = context;

  if (!parentId && !branch) {
    console.warn(
      "genId: Context appears incomplete (no parentId or branch). " +
        "This may result in an empty or invalid ID. " +
        "Consider using context helper functions from 'fluent/utils/context'.",
    );
  }

  if (parentId === "") {
    console.warn(
      "genId: parentId is an empty string. " +
        "This may indicate a missing or improperly initialized context.",
    );
  }

  // Ensure the generated ID is unique
  const uniqueId = globalIdRegistry.ensureUnique(baseId);

  // Warn if collision was detected
  if (process.env.NODE_ENV !== "production" && uniqueId !== baseId) {
    console.warn(
      `genId: ID collision detected. Original: "${baseId}", Modified to: "${uniqueId}". ` +
        `Consider providing more specific IDs to avoid collisions.`,
    );
  }

  return uniqueId;
};

export function determineSlotName(
  parameterName: string,
  assetMetadata?: AssetMetadata,
): string {
  if (!assetMetadata) {
    return parameterName;
  }

  const { type, binding, value } = assetMetadata;

  // Rule 1: If the asset type is `action`, append last segment of `value` if any
  // Note: value can be a binding (TaggedTemplateValue) or plain string
  if (type === "action" && value) {
    const cleanValue = value.replace(/^\{\{|\}\}$/g, "");
    const segments = cleanValue.split(".");
    const lastSegment = segments[segments.length - 1];
    return lastSegment ? `${type}-${lastSegment}` : type;
  }

  // Rule 2: If it's not `action` but has `binding`, append last fragment of binding
  if (type !== "action" && binding) {
    const cleanBinding = binding.replace(/^\{\{|\}\}$/g, "");
    const segments = cleanBinding.split(".");
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      return `${type || parameterName}-${lastSegment}`;
    }
  }

  // Rule 3: Otherwise, just use the type
  return type || parameterName;
}

export function generateAssetId<C extends BaseBuildContext>(params: {
  readonly context?: C;
  readonly parameterName?: string;
  readonly assetMetadata?: AssetMetadata;
  readonly explicitId?: string;
}): string {
  const {
    context,
    parameterName = "asset",
    assetMetadata,
    explicitId,
  } = params;

  if (explicitId) {
    return explicitId;
  }

  if (context && "parentId" in context) {
    // Determine the slot name based on asset metadata (action value, binding, or type)
    const slotName = determineSlotName(parameterName, assetMetadata);

    if (context.branch) {
      // When there's a branch, generate base ID then append asset type
      // This creates IDs like "parent-0-questionAnswer", "parent-slot-text", etc.
      const baseId = genId(context);

      // Append the asset type as a suffix
      // Use genId again to ensure uniqueness and proper registration
      return genId({
        ...context,
        parentId: baseId,
        branch: { type: "slot", name: slotName },
      } as C);
    }

    if (context.parentId) {
      // When there's a parentId but no branch, use slotName (determined from metadata)
      // This creates IDs like "parent-text", "parent-action-next", "parent-input-firstName", etc.
      // Generate and register the ID to enable collision detection
      return genId({
        ...context,
        branch: { type: "slot", name: slotName },
      } as C);
    }
  }

  const slotName = determineSlotName(parameterName, assetMetadata);
  return slotName;
}
