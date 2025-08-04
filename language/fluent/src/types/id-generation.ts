/**
 * Represents a slot branch in the ID hierarchy.
 * Used when an asset is placed in a named slot of its parent.
 *
 * @example
 * ```typescript
 * // For an asset in the "header" slot of its parent
 * const branch: SlotBranch = { type: "slot", name: "header" };
 * // Generated ID: "parent-header"
 * ```
 */
export interface SlotBranch {
  /** Identifies this as a slot branch */
  type: "slot";
  /** The name of the slot this asset occupies */
  name: string;
}

/**
 * Represents an array item branch in the ID hierarchy.
 * Used when an asset is an element in an array of its parent.
 *
 * @example
 * ```typescript
 * // For the third item in an array
 * const branch: ArrayItemBranch = { type: "array-item", index: 2 };
 * // Generated ID: "parent-2"
 * ```
 */
export interface ArrayItemBranch {
  /** Identifies this as an array item branch */
  type: "array-item";
  /** The zero-based index of this item in the array */
  index: number;
}

/**
 * Represents a template branch in the ID hierarchy.
 * Used when an asset is generated within a template context.
 *
 * @example
 * ```typescript
 * // For a nested template at depth 1
 * const branch: TemplateBranch = { type: "template", depth: 1 };
 * // Generated ID: "parent-_index1_"
 * ```
 */
export interface TemplateBranch {
  /** Identifies this as a template branch */
  type: "template";
  /** Optional nesting depth within templates */
  depth?: number;
}

/**
 * Represents a switch branch in the ID hierarchy.
 * Used when an asset is generated within conditional logic.
 *
 * @example
 * ```typescript
 * // For the first branch of a static switch
 * const branch: SwitchBranch = {
 *   type: "switch",
 *   index: 0,
 *   kind: "static"
 * };
 * // Generated ID: "parent-staticSwitch-0"
 * ```
 */
export interface SwitchBranch {
  /** Identifies this as a switch branch */
  type: "switch";
  /** The index of this branch in the switch */
  index: number;
  /** Whether this is a static or dynamic switch */
  kind: "static" | "dynamic";
}

/**
 * Represents a custom branch in the ID hierarchy.
 * Used for custom ID generation scenarios.
 */
export interface CustomBranch {
  /** Identifies this as a custom branch */
  type: "custom";
}

/**
 * Union type representing all possible ID branch types.
 * Used to determine how to generate hierarchical IDs based on parent-child relationships.
 */
export type IdBranch =
  | SlotBranch
  | ArrayItemBranch
  | TemplateBranch
  | SwitchBranch
  | CustomBranch;

/**
 * Context information passed to fluent builders for automatic ID generation.
 * Contains the parent ID and optional branch information to create hierarchical IDs.
 *
 * @example
 * ```typescript
 * const ctx: ParentCtx = {
 *   parentId: "my-form",
 *   branch: { type: "slot", name: "content" }
 * };
 * // This would generate ID: "my-form-content"
 * ```
 */
export interface ParentCtx {
  /** The ID of the parent element */
  parentId: string;
  /** Optional branch information for hierarchical ID generation */
  branch?: IdBranch;
}
