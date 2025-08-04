import type { ParentCtx } from "../types";
import { globalIdRegistry } from "./registry";

export { IDRegistry, globalIdRegistry, createIdRegistry } from "./registry";

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
export const peekId = (context: ParentCtx): string => {
  // Same validation and generation logic as genId, but without registry calls
  if (!context) {
    throw new Error(
      "peekId: Context is undefined. Please provide a valid ParentCtx object.",
    );
  }

  const { parentId, branch } = context;

  // Same generation logic as genId but without uniqueness enforcement
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
            `peekId: Slot branch requires a 'name' property. ` +
              `Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId ? `${parentId}-` : ""}${branch.name}`;
        break;

      case "array-item":
        if (typeof branch.index !== "number") {
          throw new Error(
            `peekId: Array-item branch requires a numeric 'index' property. ` +
              `Got: ${typeof branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (branch.index < 0) {
          throw new Error(
            `peekId: Array-item index must be non-negative. ` +
              `Got: ${branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-${branch.index}`;
        break;

      case "template":
        if (branch.depth !== undefined && branch.depth < 0) {
          throw new Error(
            `peekId: Template depth must be non-negative. ` +
              `Got: ${branch.depth}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-_index${branch.depth || ""}_`;
        break;

      case "switch":
        if (typeof branch.index !== "number") {
          throw new Error(
            `peekId: Switch branch requires a numeric 'index' property. ` +
              `Got: ${typeof branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (branch.index < 0) {
          throw new Error(
            `peekId: Switch index must be non-negative. ` +
              `Got: ${branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (!branch.kind || !["static", "dynamic"].includes(branch.kind)) {
          throw new Error(
            `peekId: Switch branch requires 'kind' to be 'static' or 'dynamic'. ` +
              `Got: ${branch.kind}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-${branch.kind}Switch-${branch.index}`;
        break;

      default: {
        const exhaustiveCheck: never = branch;
        throw new Error(
          `peekId: Unhandled branch type: ${JSON.stringify(exhaustiveCheck)}`,
        );
      }
    }
  }

  return baseId;
};

/**
 * Generates a unique identifier based on the parent ID and branch information.
 *
 * This function creates hierarchical IDs for various element types in a DSL structure,
 * maintaining relationships between parent and child elements through consistent naming patterns.
 * IDs are automatically checked for uniqueness and modified if collisions are detected.
 *
 * @param {ParentCtx} context - The context containing parent ID and optional branch information
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
export const genId = (context: ParentCtx): string => {
  // Validate context
  if (!context) {
    throw new Error(
      "genId: Context is undefined. Please provide a valid ParentCtx object.",
    );
  }

  const { parentId, branch } = context;

  // Warn in development if context seems incomplete
  if (process.env.NODE_ENV !== "production") {
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
  }

  let baseId: string;

  // If no branch is provided, return the parentId as is (custom ID case)
  if (!branch) {
    baseId = parentId || "";
  } else {
    // Validate branch-specific requirements
    switch (branch.type) {
      case "custom":
        baseId = parentId || "";
        break;

      case "slot":
        if (!branch.name) {
          throw new Error(
            `genId: Slot branch requires a 'name' property. ` +
              `Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId ? `${parentId}-` : ""}${branch.name}`;
        break;

      case "array-item":
        if (typeof branch.index !== "number") {
          throw new Error(
            `genId: Array-item branch requires a numeric 'index' property. ` +
              `Got: ${typeof branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (branch.index < 0) {
          throw new Error(
            `genId: Array-item index must be non-negative. ` +
              `Got: ${branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-${branch.index}`;
        break;

      case "template":
        if (branch.depth !== undefined && branch.depth < 0) {
          throw new Error(
            `genId: Template depth must be non-negative. ` +
              `Got: ${branch.depth}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-_index${branch.depth || ""}_`;
        break;

      case "switch":
        if (typeof branch.index !== "number") {
          throw new Error(
            `genId: Switch branch requires a numeric 'index' property. ` +
              `Got: ${typeof branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (branch.index < 0) {
          throw new Error(
            `genId: Switch index must be non-negative. ` +
              `Got: ${branch.index}. Context: ${JSON.stringify(context)}`,
          );
        }
        if (!branch.kind || !["static", "dynamic"].includes(branch.kind)) {
          throw new Error(
            `genId: Switch branch requires 'kind' to be 'static' or 'dynamic'. ` +
              `Got: ${branch.kind}. Context: ${JSON.stringify(context)}`,
          );
        }
        baseId = `${parentId}-${branch.kind}Switch-${branch.index}`;
        break;

      default: {
        // This should never happen with TypeScript's exhaustiveness checking
        const exhaustiveCheck: never = branch;
        throw new Error(
          `genId: Unhandled branch type: ${JSON.stringify(exhaustiveCheck)}. ` +
            `This may indicate a version mismatch or invalid branch configuration.`,
        );
      }
    }
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
