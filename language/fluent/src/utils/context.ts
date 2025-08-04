import type { ParentCtx, IdBranch } from "../types";
import { genId } from "../id-generator";

/**
 * Validation errors for context operations.
 */
export class ContextValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContextValidationError";
  }
}

/**
 * Creates a child context for a named slot.
 * This helper ensures proper context chaining for slot-based assets.
 *
 * @param parent - The parent context
 * @param slotName - The name of the slot
 * @returns A new context for the child with proper slot branch
 *
 * @throws {ContextValidationError} If parent context is invalid
 *
 * @example
 * ```typescript
 * const parentCtx = { parentId: "form", branch: undefined };
 * const labelCtx = createChildContext(parentCtx, "label");
 * // Result: { parentId: "form", branch: { type: "slot", name: "label" } }
 * ```
 */
export function createChildContext(
  parent: ParentCtx,
  slotName: string,
): ParentCtx {
  if (!parent) {
    throw new ContextValidationError(
      `Cannot create child context for slot "${slotName}": parent context is undefined`,
    );
  }

  if (!parent.parentId && !parent.branch) {
    throw new ContextValidationError(
      `Cannot create child context for slot "${slotName}": parent context is incomplete (missing parentId and branch)`,
    );
  }

  if (!slotName) {
    throw new ContextValidationError(
      "Cannot create child context: slot name is required",
    );
  }

  // Generate the parent ID first
  const parentId = genId(parent);

  return {
    parentId,
    branch: {
      type: "slot",
      name: slotName,
    },
  };
}

/**
 * Creates a context for an array item.
 * This helper ensures proper context chaining for array elements.
 *
 * @param parent - The parent context
 * @param index - The index of the array item
 * @returns A new context for the array item
 *
 * @throws {ContextValidationError} If parent context is invalid or index is negative
 *
 * @example
 * ```typescript
 * const parentCtx = { parentId: "list", branch: undefined };
 * const itemCtx = createArrayItemContext(parentCtx, 0);
 * // Result: { parentId: "list", branch: { type: "array-item", index: 0 } }
 * ```
 */
export function createArrayItemContext(
  parent: ParentCtx,
  index: number,
): ParentCtx {
  if (!parent) {
    throw new ContextValidationError(
      `Cannot create array item context at index ${index}: parent context is undefined`,
    );
  }

  if (!parent.parentId && !parent.branch) {
    throw new ContextValidationError(
      `Cannot create array item context at index ${index}: parent context is incomplete`,
    );
  }

  if (index < 0) {
    throw new ContextValidationError(
      `Cannot create array item context: index must be non-negative (got ${index})`,
    );
  }

  // Generate the parent ID first
  const parentId = genId(parent);

  return {
    parentId,
    branch: {
      type: "array-item",
      index,
    },
  };
}

/**
 * Creates a context for a template.
 * This helper ensures proper context chaining for template-generated assets.
 *
 * @param parent - The parent context
 * @param depth - The nesting depth of the template (defaults to 0)
 * @returns A new context for the template
 *
 * @throws {ContextValidationError} If parent context is invalid
 *
 * @example
 * ```typescript
 * const parentCtx = { parentId: "container", branch: undefined };
 * const templateCtx = createTemplateContext(parentCtx, 0);
 * // Result: { parentId: "container", branch: { type: "template", depth: 0 } }
 * ```
 */
export function createTemplateContext(parent: ParentCtx, depth = 0): ParentCtx {
  if (!parent) {
    throw new ContextValidationError(
      "Cannot create template context: parent context is undefined",
    );
  }

  if (!parent.parentId && !parent.branch) {
    throw new ContextValidationError(
      "Cannot create template context: parent context is incomplete",
    );
  }

  // Generate the parent ID first
  const parentId = genId(parent);

  return {
    parentId,
    branch: {
      type: "template",
      depth: depth > 0 ? depth : undefined,
    },
  };
}

/**
 * Creates a context for a switch case.
 * This helper ensures proper context chaining for switch branches.
 *
 * @param parent - The parent context
 * @param index - The index of the switch case
 * @param isDynamic - Whether this is a dynamic switch
 * @returns A new context for the switch case
 *
 * @throws {ContextValidationError} If parent context is invalid or index is negative
 *
 * @example
 * ```typescript
 * const parentCtx = { parentId: "content", branch: undefined };
 * const caseCtx = createSwitchContext(parentCtx, 0, false);
 * // Result: { parentId: "content", branch: { type: "switch", index: 0, kind: "static" } }
 * ```
 */
export function createSwitchContext(
  parent: ParentCtx,
  index: number,
  isDynamic = false,
): ParentCtx {
  if (!parent) {
    throw new ContextValidationError(
      `Cannot create switch context at index ${index}: parent context is undefined`,
    );
  }

  if (!parent.parentId && !parent.branch) {
    throw new ContextValidationError(
      `Cannot create switch context at index ${index}: parent context is incomplete`,
    );
  }

  if (index < 0) {
    throw new ContextValidationError(
      `Cannot create switch context: index must be non-negative (got ${index})`,
    );
  }

  // Generate the parent ID first
  const parentId = genId(parent);

  return {
    parentId,
    branch: {
      type: "switch",
      index,
      kind: isDynamic ? "dynamic" : "static",
    },
  };
}

/**
 * Creates a root context for starting a new asset tree.
 * This is useful when you need to start fresh without any parent context.
 *
 * @param rootId - The ID for the root element
 * @returns A new root context
 *
 * @example
 * ```typescript
 * const rootCtx = createRootContext("my-form");
 * // Result: { parentId: "my-form", branch: undefined }
 * ```
 */
export function createRootContext(rootId: string): ParentCtx {
  if (!rootId) {
    throw new ContextValidationError(
      "Cannot create root context: root ID is required",
    );
  }

  return {
    parentId: rootId,
    branch: undefined,
  };
}

/**
 * Validates that a context is properly formed.
 * This is useful for debugging and ensuring context integrity.
 *
 * @param ctx - The context to validate
 * @param contextName - Optional name for better error messages
 * @returns true if valid, throws otherwise
 *
 * @throws {ContextValidationError} If the context is invalid
 */
export function validateContext(
  ctx: ParentCtx,
  contextName = "context",
): boolean {
  if (!ctx) {
    throw new ContextValidationError(`${contextName} is undefined`);
  }

  if (!ctx.parentId) {
    throw new ContextValidationError(`${contextName} is missing parentId`);
  }

  if (ctx.branch) {
    switch (ctx.branch.type) {
      case "slot":
        if (!ctx.branch.name) {
          throw new ContextValidationError(
            `${contextName} slot branch is missing name`,
          );
        }
        break;
      case "array-item":
        if (typeof ctx.branch.index !== "number" || ctx.branch.index < 0) {
          throw new ContextValidationError(
            `${contextName} array-item branch has invalid index`,
          );
        }
        break;
      case "switch":
        if (typeof ctx.branch.index !== "number" || ctx.branch.index < 0) {
          throw new ContextValidationError(
            `${contextName} switch branch has invalid index`,
          );
        }
        if (
          !ctx.branch.kind ||
          !["static", "dynamic"].includes(ctx.branch.kind)
        ) {
          throw new ContextValidationError(
            `${contextName} switch branch has invalid kind`,
          );
        }
        break;
      case "template":
        if (ctx.branch.depth !== undefined && ctx.branch.depth < 0) {
          throw new ContextValidationError(
            `${contextName} template branch has invalid depth`,
          );
        }
        break;
      case "custom":
        // Custom branches are always valid
        break;
      default:
        throw new ContextValidationError(
          `${contextName} has unknown branch type: ${(ctx.branch as IdBranch).type}`,
        );
    }
  }

  return true;
}

/**
 * Creates a custom context with a specific branch configuration.
 * This is an advanced helper for cases not covered by other helpers.
 *
 * @param parent - The parent context
 * @param branch - The custom branch configuration
 * @returns A new context with the custom branch
 *
 * @example
 * ```typescript
 * const customBranch: IdBranch = { type: "custom" };
 * const customCtx = createCustomContext(parentCtx, customBranch);
 * ```
 */
export function createCustomContext(
  parent: ParentCtx,
  branch: IdBranch,
): ParentCtx {
  if (!parent) {
    throw new ContextValidationError(
      "Cannot create custom context: parent context is undefined",
    );
  }

  const parentId = genId(parent);

  return {
    parentId,
    branch,
  };
}

/**
 * Utility to help debug context chains.
 * Logs the context hierarchy in a readable format.
 *
 * @param ctx - The context to debug
 * @param label - Optional label for the output
 */
export function debugContext(ctx: ParentCtx, label = "Context"): void {
  if (process.env.NODE_ENV !== "production") {
    console.group(label);
    console.log("Parent ID:", ctx.parentId);
    if (ctx.branch) {
      console.log("Branch Type:", ctx.branch.type);
      console.log("Branch Details:", ctx.branch);
    } else {
      console.log("Branch: None (root context)");
    }
    console.log("Generated ID:", genId(ctx));
    console.groupEnd();
  }
}
