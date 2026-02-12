/**
 * Manages auxiliary data storage for builders
 *
 * Auxiliary data is metadata that doesn't appear in the final built object
 * but is used during the build process. This includes:
 * - Templates (stored under "__templates__")
 * - Switches (stored under "__switches__")
 * - Custom metadata
 *
 * This separation keeps builder state clean and makes the build process more explicit
 */
export class AuxiliaryStorage {
  private data: Map<string, unknown> = new Map();

  /**
   * Sets auxiliary data with a given key
   */
  set<T>(key: string, value: T): void {
    this.data.set(key, value);
  }

  /**
   * Gets auxiliary data with type assertion
   * The caller is responsible for knowing the correct type
   */
  get<T>(key: string): T | undefined {
    const value = this.data.get(key);
    return value as T | undefined;
  }

  /**
   * Pushes an item to an auxiliary data array
   * Creates the array if it doesn't exist
   */
  push<T>(key: string, item: T): void {
    const existing = this.data.get(key);
    if (Array.isArray(existing)) {
      existing.push(item);
    } else {
      this.data.set(key, [item]);
    }
  }

  /**
   * Gets an auxiliary data array
   * Returns empty array if doesn't exist or isn't an array
   */
  getArray<T>(key: string): T[] {
    const existing = this.data.get(key);
    return Array.isArray(existing) ? existing : [];
  }

  /**
   * Checks if auxiliary data exists for a key
   */
  has(key: string): boolean {
    return this.data.has(key);
  }

  /**
   * Deletes auxiliary data for a key
   */
  delete(key: string): boolean {
    return this.data.delete(key);
  }

  /**
   * Clears all auxiliary data
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Clones the auxiliary storage, creating an independent copy
   */
  clone(): AuxiliaryStorage {
    const cloned = new AuxiliaryStorage();
    cloned.data = new Map(this.data);
    return cloned;
  }
}
