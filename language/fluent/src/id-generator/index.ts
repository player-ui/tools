import type { ParentCtx } from "../types";

/**
 * Generates a unique identifier based on the parent ID and branch information.
 *
 * This function creates hierarchical IDs for various element types in a DSL structure,
 * maintaining relationships between parent and child elements through consistent naming patterns.
 *
 * @param {ParentCtx} context - The context containing parent ID and optional branch information
 * @param {string} context.parentId - The ID of the parent element
 * @param {IdBranch} [context.branch] - Optional branch information to specify the type of child element
 *
 * @returns {string} A generated ID string representing the element's unique identifier
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
export const genId = ({ parentId, branch }: ParentCtx): string => {
  // If no branch is provided, return the parentId as is (custom ID case)
  if (!branch) {
    return parentId;
  }

  switch (branch.type) {
    case "custom":
      return parentId;
    case "slot":
      return `${parentId ? `${parentId}-` : ""}${branch.name}`;
    case "array-item":
      return `${parentId}-${branch.index}`;
    case "template":
      return `${parentId}-_index${branch.depth || ""}_`;
    case "switch":
      return `${parentId}-${branch.kind}Switch-${branch.index}`;
    default: {
      // This should never happen with TypeScript's exhaustiveness checking
      throw new Error(`Unhandled branch type: ${String(branch)}`);
    }
  }
};
