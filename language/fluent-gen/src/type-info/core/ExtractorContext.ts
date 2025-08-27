import type { Project, SourceFile, InterfaceDeclaration } from "ts-morph";
import type { Dependency } from "../types.js";

/**
 * Context object to manage state during TypeScript interface extraction.
 * Provides a centralized way to track dependencies and prevent circular references.
 */
export class ExtractorContext {
  private dependencies: Map<string, Dependency>;
  private circularTracker: Set<string>;
  private currentInterface: InterfaceDeclaration | null = null;

  constructor(
    private readonly project: Project,
    private readonly sourceFile: SourceFile,
  ) {
    this.dependencies = new Map();
    this.circularTracker = new Set();
  }

  /**
   * Add a dependency to the extraction context.
   * Deduplicates dependencies based on target and dependency name.
   */
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

  /**
   * Check if we can enter circular dependency tracking for a type.
   * Returns false if the type is already being processed (circular dependency).
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

  /** Check if a type is currently being processed (would cause circular dependency). */
  isProcessing(typeName: string): boolean {
    return this.circularTracker.has(typeName);
  }

  /** Get the ts-morph Project instance. */
  getProject(): Project {
    return this.project;
  }

  /** Get the current source file being processed. */
  getSourceFile(): SourceFile {
    return this.sourceFile;
  }

  /** Set the current interface being analyzed. */
  setCurrentInterface(interfaceDecl: InterfaceDeclaration | null): void {
    this.currentInterface = interfaceDecl;
  }

  /** Get the current interface being analyzed. */
  getCurrentInterface(): InterfaceDeclaration | null {
    return this.currentInterface;
  }

  /** Create a new context for processing a different source file. */
  withSourceFile(newSourceFile: SourceFile): ExtractorContext {
    return new ExtractorContext(this.project, newSourceFile);
  }

  /** Get a snapshot of the current processing state for debugging. */
  getDebugInfo(): {
    dependencyCount: number;
    processingTypes: string[];
    sourceFilePath: string;
  } {
    return {
      dependencyCount: this.dependencies.size,
      processingTypes: Array.from(this.circularTracker),
      sourceFilePath: this.sourceFile.getFilePath(),
    };
  }
}
