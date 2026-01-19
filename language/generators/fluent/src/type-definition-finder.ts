import { Project, SourceFile, ts } from "ts-morph";
import { existsSync } from "fs";
import { dirname, resolve } from "path";

/**
 * Information about an unexported type that was found
 */
export interface UnexportedTypeLocation {
  /** The name of the type */
  typeName: string;
  /** The file where the type is declared (but not exported) */
  filePath: string;
}

/**
 * Finds type definitions by searching through TypeScript source files.
 * Handles interfaces, type aliases, classes, and re-exported types.
 * Supports both local files and types from node_modules.
 */
export class TypeDefinitionFinder {
  private project: Project | undefined;
  private readonly typeLocationCache = new Map<string, string | null>();
  private readonly unexportedTypes = new Map<string, string>();

  /**
   * Finds the source file for a type by searching the codebase.
   * Recursively follows imports to find where a type is actually defined.
   * Supports both relative imports and node_modules packages.
   *
   * @param typeName - The name of the type to find
   * @param startingFile - The file to start searching from
   * @returns The path to the file containing the type definition, or null if not found
   */
  findTypeSourceFile(typeName: string, startingFile: string): string | null {
    if (!typeName || !startingFile) return null;

    const cacheKey = `${typeName}:${startingFile}`;
    if (this.typeLocationCache.has(cacheKey)) {
      return this.typeLocationCache.get(cacheKey) || null;
    }

    try {
      if (!this.project) {
        this.project = new Project({
          useInMemoryFileSystem: false,
          // Enable module resolution for node_modules support
          skipFileDependencyResolution: false,
          compilerOptions: {
            moduleResolution: ts.ModuleResolutionKind.Node16,
            resolveJsonModule: true,
          },
        });
      }

      const visitedFiles = new Set<string>();
      const result = this.searchForType(typeName, startingFile, visitedFiles);
      this.typeLocationCache.set(cacheKey, result);
      return result;
    } catch {
      this.typeLocationCache.set(cacheKey, null);
      return null;
    }
  }

  /**
   * Recursively searches for a type definition through imports.
   * Handles both relative imports and node_modules packages.
   */
  private searchForType(
    typeName: string,
    filePath: string,
    visitedFiles: Set<string>,
  ): string | null {
    if (!existsSync(filePath) || visitedFiles.has(filePath)) return null;
    visitedFiles.add(filePath);

    try {
      const sourceFile = this.project!.addSourceFileAtPath(filePath);

      // Check if this file defines and exports the type
      if (this.fileDefinesType(sourceFile, typeName)) {
        return filePath;
      }

      // Check if the file has the type but doesn't export it
      const typeCheck = this.fileHasTypeDeclaration(sourceFile, typeName);
      if (typeCheck.found && !typeCheck.exported) {
        // Track this unexported type for warning
        this.trackUnexportedType(typeName, typeCheck.filePath);
      }

      // Search through imports
      for (const importDecl of sourceFile.getImportDeclarations()) {
        const moduleSpecifier = importDecl.getModuleSpecifierValue();

        // Check if this import includes the type we're looking for
        const importedType = this.getImportedTypeFromDeclaration(
          importDecl,
          typeName,
        );

        if (importedType) {
          // Try to resolve the module to its source file
          const resolvedSourceFile = importDecl.getModuleSpecifierSourceFile();

          if (resolvedSourceFile) {
            // Found it via ts-morph module resolution (works for node_modules)
            const resolvedPath = resolvedSourceFile.getFilePath();

            // For re-exports, we might need to search deeper
            if (this.fileDefinesType(resolvedSourceFile, typeName)) {
              return resolvedPath;
            }

            // Check if it's re-exported from somewhere else
            const deeperResult = this.searchForType(
              typeName,
              resolvedPath,
              visitedFiles,
            );
            if (deeperResult) return deeperResult;

            // If we can't find it deeper, return the resolved path
            // (the type might be defined in a way we can't detect)
            return resolvedPath;
          }

          // Fallback: manual resolution for relative imports
          if (moduleSpecifier.startsWith(".")) {
            const resolvedPath = this.resolveImportPath(
              filePath,
              moduleSpecifier,
            );
            if (resolvedPath) {
              const result = this.searchForType(
                typeName,
                resolvedPath,
                visitedFiles,
              );
              if (result) return result;
            }
          }
        }

        // Also follow relative imports even if they don't explicitly import the type
        // (the type might be re-exported)
        if (moduleSpecifier.startsWith(".")) {
          const resolvedPath = this.resolveImportPath(
            filePath,
            moduleSpecifier,
          );
          if (resolvedPath) {
            const result = this.searchForType(
              typeName,
              resolvedPath,
              visitedFiles,
            );
            if (result) return result;
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Checks if an import declaration imports a specific type.
   * Handles named imports, default imports, and namespace imports.
   */
  private getImportedTypeFromDeclaration(
    importDecl: ReturnType<SourceFile["getImportDeclarations"]>[0],
    typeName: string,
  ): boolean {
    // Check named imports: import { Foo } from "..."
    for (const namedImport of importDecl.getNamedImports()) {
      const name =
        namedImport.getAliasNode()?.getText() || namedImport.getName();
      if (name === typeName) return true;
    }

    // Check default import: import Foo from "..."
    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport?.getText() === typeName) return true;

    // Check namespace import: import * as Foo from "..."
    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport?.getText() === typeName) return true;

    return false;
  }

  /**
   * Checks if a source file defines and exports a specific type.
   * Handles interfaces, type aliases, classes, and re-exported types.
   * Only returns true if the type is publicly exported.
   */
  private fileDefinesType(sourceFile: SourceFile, typeName: string): boolean {
    // Check exported interfaces, type aliases, and classes
    for (const decl of [
      ...sourceFile.getInterfaces(),
      ...sourceFile.getTypeAliases(),
      ...sourceFile.getClasses(),
    ]) {
      if (decl.getName() === typeName && decl.isExported()) {
        return true;
      }
    }

    // Check exported types in export declarations (re-exports)
    for (const exportDecl of sourceFile.getExportDeclarations()) {
      for (const namedExport of exportDecl.getNamedExports()) {
        if (namedExport.getName() === typeName) return true;
      }
    }

    return false;
  }

  /**
   * Resolves a relative import path to an actual file path.
   * Handles TypeScript extensions and index files.
   */
  private resolveImportPath(
    fromFile: string,
    importPath: string,
  ): string | null {
    const dir = dirname(fromFile);
    const extensions = [".ts", ".tsx", ".d.ts"];

    // Try direct file with TS extensions
    for (const ext of extensions) {
      const fullPath = resolve(dir, `${importPath}${ext}`);
      if (existsSync(fullPath)) return fullPath;
    }

    // Try index files
    for (const ext of extensions) {
      const fullPath = resolve(dir, `${importPath}/index${ext}`);
      if (existsSync(fullPath)) return fullPath;
    }

    // Handle .js → .ts mapping
    if (importPath.endsWith(".js")) {
      const tsPath = resolve(dir, importPath.replace(/\.js$/, ".ts"));
      if (existsSync(tsPath)) return tsPath;

      const dtsPath = resolve(dir, importPath.replace(/\.js$/, ".d.ts"));
      if (existsSync(dtsPath)) return dtsPath;
    }

    return null;
  }

  /**
   * Get all types that were found to exist but are not exported.
   * Call this after searching to get the list of types that need to be exported.
   */
  getUnexportedTypes(): UnexportedTypeLocation[] {
    return Array.from(this.unexportedTypes.entries()).map(
      ([typeName, filePath]) => ({
        typeName,
        filePath,
      }),
    );
  }

  /**
   * Check if a file declares a type (regardless of export status).
   * Used internally to track unexported types.
   */
  private fileHasTypeDeclaration(
    sourceFile: SourceFile,
    typeName: string,
  ): { found: boolean; exported: boolean; filePath: string } {
    const filePath = sourceFile.getFilePath();

    // Check interfaces, type aliases, and classes
    for (const decl of [
      ...sourceFile.getInterfaces(),
      ...sourceFile.getTypeAliases(),
      ...sourceFile.getClasses(),
    ]) {
      if (decl.getName() === typeName) {
        return {
          found: true,
          exported: decl.isExported(),
          filePath,
        };
      }
    }

    return { found: false, exported: false, filePath };
  }

  /**
   * Track an unexported type for later reporting.
   */
  private trackUnexportedType(typeName: string, filePath: string): void {
    if (!this.unexportedTypes.has(typeName)) {
      this.unexportedTypes.set(typeName, filePath);
    }
  }

  /**
   * Disposes of internal resources and clears caches.
   * Should be called when the finder is no longer needed.
   */
  dispose(): void {
    this.typeLocationCache.clear();
    this.unexportedTypes.clear();
    this.project = undefined;
  }
}
