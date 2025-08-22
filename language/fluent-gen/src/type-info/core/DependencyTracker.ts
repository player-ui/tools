import type { Dependency } from "../types.js";

/** Manages dependency tracking with deduplication and circular reference detection. */
export class DependencyTracker {
  private dependencies = new Map<string, Dependency>();
  private circularTracker = new Set<string>();

  /** Add a dependency, automatically deduplicating based on target and dependency name. */
  addDependency(dep: Dependency): void {
    const targetKey =
      dep.target.kind === "local"
        ? dep.target.filePath
        : `module:${dep.target.name}`;
    const key = `${targetKey}:${dep.dependency}`;
    if (!this.dependencies.has(key)) {
      this.dependencies.set(key, dep);
    }
  }

  /** Get all tracked dependencies as an array. */
  getDependencies(): Dependency[] {
    return Array.from(this.dependencies.values());
  }

  /** Clear all tracked dependencies. */
  clear(): void {
    this.dependencies.clear();
  }

  /**
   * Check if we can enter circular dependency tracking for a type.
   * Returns false if already being processed.
   */
  enterCircularCheck(typeName: string): boolean {
    if (this.circularTracker.has(typeName)) {
      console.warn(`Circular dependency detected: ${typeName}`);
      return false;
    }
    this.circularTracker.add(typeName);
    return true;
  }

  /** Exit circular dependency tracking for a type. */
  exitCircularCheck(typeName: string): void {
    this.circularTracker.delete(typeName);
  }

  /** Check if a type is currently being processed. */
  isProcessing(typeName: string): boolean {
    return this.circularTracker.has(typeName);
  }

  /** Get current processing state for debugging. */
  getProcessingTypes(): string[] {
    return Array.from(this.circularTracker);
  }
}
