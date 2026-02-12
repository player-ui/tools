/**
 * ID Registry for tracking and ensuring unique IDs across asset generation.
 * This registry maintains a set of used IDs and provides collision resolution
 * by appending numeric suffixes when duplicates are detected.
 *
 * Special handling for template placeholders:
 * - IDs ending with template placeholders like `_index_`, `_row_` are allowed to be duplicated
 * - IDs with placeholders followed by additional segments enforce uniqueness normally
 */
export class IDRegistry {
  private usedIds: Set<string>;
  private isEnabled: boolean;

  constructor(enabled = true) {
    this.usedIds = new Set<string>();
    this.isEnabled = enabled;
  }

  /**
   * Ensures the given ID is unique, modifying it if necessary.
   * If the ID already exists, appends a numeric suffix (-1, -2, etc.)
   * until a unique ID is found.
   *
   * Special handling for template placeholders:
   * - IDs ending with `_index_`, `_row_`, etc. are allowed as duplicates
   * - IDs with placeholders followed by segments (e.g., `_index_.field`) enforce uniqueness
   *
   * @param baseId - The desired ID
   * @returns A unique ID (either the original or modified with suffix)
   *
   * @example
   * ```typescript
   * const registry = new IDRegistry();
   * registry.ensureUnique("my-id");         // "my-id"
   * registry.ensureUnique("my-id");         // "my-id-1"
   * registry.ensureUnique("list-_index_");  // "list-_index_" (allowed duplicate)
   * registry.ensureUnique("list-_index_");  // "list-_index_" (allowed duplicate)
   * ```
   */
  ensureUnique(baseId: string): string {
    // If registry is disabled, return the ID as-is
    if (!this.isEnabled) {
      return baseId;
    }

    // Check if this ID contains template placeholders
    if (this.isTemplatePlaceholderID(baseId)) {
      // For template placeholder IDs, don't enforce uniqueness
      // These will be replaced at runtime, so duplicates are acceptable
      return baseId;
    }

    // If the ID hasn't been used, register and return it
    if (!this.usedIds.has(baseId)) {
      this.usedIds.add(baseId);
      return baseId;
    }

    // ID collision detected - append counter until unique
    let counter = 1;
    let uniqueId = `${baseId}-${counter}`;

    while (this.usedIds.has(uniqueId)) {
      counter++;
      uniqueId = `${baseId}-${counter}`;
    }

    this.usedIds.add(uniqueId);
    return uniqueId;
  }

  /**
   * Checks if an ID has already been used.
   *
   * @param id - The ID to check
   * @returns true if the ID has been used, false otherwise
   */
  has(id: string): boolean {
    return this.usedIds.has(id);
  }

  /**
   * Clears all registered IDs from the registry.
   * Useful for resetting state between test runs or separate flows.
   */
  reset(): void {
    this.usedIds.clear();
  }

  /**
   * Enables or disables the uniqueness checking.
   * When disabled, all IDs pass through unchanged.
   *
   * @param enabled - Whether to enable uniqueness checking
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Returns the number of unique IDs currently registered.
   *
   * @returns The count of registered IDs
   */
  size(): number {
    return this.usedIds.size;
  }

  /**
   * Returns a snapshot of all registered IDs.
   * Useful for debugging and testing.
   *
   * @returns An array of all registered IDs
   */
  getRegisteredIds(): string[] {
    return Array.from(this.usedIds);
  }

  /**
   * Checks if an ID contains template placeholders that should be exempt from uniqueness checks.
   * Template placeholders are patterns like `_index_`, `_index1_`, `_row_` that are replaced at runtime.
   *
   * IDs ending with just a placeholder (e.g., "parent-_index_") are allowed as duplicates.
   * IDs with placeholders followed by additional segments (e.g., "parent-_index_-field") are not.
   *
   * @param id - The ID to check
   * @returns true if the ID should be exempt from uniqueness checks
   */
  private isTemplatePlaceholderID(id: string): boolean {
    // Pattern to match template placeholder at the end of an ID
    // Matches: _index_, _index1_, _row_, _item_, etc. at the end of the string
    const templatePlaceholderPattern = /_(?:index|row|item)\d*_$/;
    return templatePlaceholderPattern.test(id);
  }
}

/**
 * Global singleton instance of the ID registry.
 * This ensures consistent ID tracking across the entire application.
 */
export const globalIdRegistry: IDRegistry = new IDRegistry();

/**
 * Creates a new isolated ID registry instance.
 * Useful for testing or when you need separate ID tracking contexts.
 *
 * @param enabled - Whether the registry should be enabled by default
 * @returns A new IDRegistry instance
 */
export function createIdRegistry(enabled = true): IDRegistry {
  return new IDRegistry(enabled);
}
