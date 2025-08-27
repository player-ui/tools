import type { SourceFile, TypeNode } from "ts-morph";
import type { PropertyInfo, Declaration } from "../../types.js";
import type { ExtractorContext } from "../../core/ExtractorContext.js";
import type { AnalysisOptions } from "../TypeAnalyzer.js";

/** Context for declaration analysis. */
export interface DeclarationAnalysisContext {
  /** The property name being analyzed */
  name: string;
  /** The original type node being referenced */
  typeNode: TypeNode;
  /** The resolved declaration */
  declaration: Declaration;
  /** Type arguments if this is a generic type reference */
  typeArgs?: TypeNode[];
  /** The type name as a string */
  typeName: string;
  /** The full type as a string (including generics) */
  typeAsString: string;
  /** The extractor context */
  extractorContext: ExtractorContext;
  /** Analysis options */
  options: AnalysisOptions;
}

/** Strategy interface for analyzing different types of declarations. */
export interface DeclarationAnalysisStrategy {
  /** Check if this strategy can handle the given declaration type. */
  canHandle(declaration: Declaration): boolean;
  /** Analyze the declaration and return property information. */
  analyze(context: DeclarationAnalysisContext): PropertyInfo | null;
  /** Get the name of this strategy for debugging purposes. */
  getName(): string;
}

/** Base class for declaration analysis strategies providing common functionality. */
export abstract class BaseDeclarationAnalysisStrategy
  implements DeclarationAnalysisStrategy
{
  abstract canHandle(declaration: Declaration): boolean;
  abstract analyze(context: DeclarationAnalysisContext): PropertyInfo | null;
  abstract getName(): string;

  /** Helper method to add dependencies to the context. */
  protected addDependency(
    context: DeclarationAnalysisContext,
    dependencyName: string,
  ): void {
    const sourceFile = context.declaration.getSourceFile();
    const isExternal =
      sourceFile.isFromExternalLibrary() || sourceFile.isInNodeModules();
    const filePath = sourceFile.getFilePath();

    context.extractorContext.addDependency({
      target: isExternal
        ? {
            kind: "module",
            name: this.getModuleName(sourceFile),
          }
        : { kind: "local", filePath, name: dependencyName },
      dependency: dependencyName,
    });
  }

  /** Get the module name using ts-morph's module resolution. */
  private getModuleName(sourceFile: SourceFile): string {
    // Try to find an import declaration that imports from this source file
    const project = sourceFile.getProject();

    for (const sf of project.getSourceFiles()) {
      for (const importDecl of sf.getImportDeclarations()) {
        const moduleSpecifier = importDecl.getModuleSpecifierSourceFile();
        if (moduleSpecifier === sourceFile) {
          return importDecl.getModuleSpecifierValue();
        }
      }
    }

    // Fallback to extracting from file path
    return this.extractModuleNameFromPath(sourceFile.getFilePath());
  }

  private extractModuleNameFromPath(filePath: string): string {
    // Handle pnpm workspace structure first (.pnpm/<package-name>@<version>/...)
    const pnpmIndex = filePath.lastIndexOf(".pnpm/");
    if (pnpmIndex !== -1) {
      const afterPnpm = filePath.substring(pnpmIndex + ".pnpm/".length);
      const firstSlash = afterPnpm.indexOf("/");
      if (firstSlash !== -1) {
        const packageDir = afterPnpm.substring(0, firstSlash);
        // Extract package name before @ symbol (version)
        const atIndex = packageDir.lastIndexOf("@");
        if (atIndex !== -1) {
          return packageDir.substring(0, atIndex);
        }
      }
    }

    // Handle standard node_modules structure
    const nodeModulesIndex = filePath.lastIndexOf("node_modules/");
    if (nodeModulesIndex === -1) {
      return filePath;
    }

    const afterNodeModules = filePath.substring(
      nodeModulesIndex + "node_modules/".length,
    );
    const pathParts = afterNodeModules.split("/");

    if (pathParts[0]?.startsWith("@")) {
      return pathParts.slice(0, 2).join("/");
    }

    return pathParts[0] || filePath;
  }

  /** Helper method to create consistent analysis options. */
  protected createChildAnalysisOptions(
    context: DeclarationAnalysisContext,
    overrides?: Partial<AnalysisOptions>,
  ): AnalysisOptions {
    return {
      ...context.options,
      ...overrides,
    };
  }
}
