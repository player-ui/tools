import path from "node:path";
import type {
  TypeScriptContext,
  TypeResolutionResult,
  UnexportedTypeInfo,
} from "./type-resolver";
import { createTypeScriptResolver } from "./type-resolver";
import { extractBaseName, parseNamespacedType, PLAYER_BUILTINS } from "./utils";
import type { TypeTracker } from "./type-collector";
import type { TypeTransformContext } from "./type-transformer";

/**
 * Configuration for import generation.
 */
export interface ImportGeneratorConfig {
  /** Import path for fluent utilities (default: "@player-tools/fluent") */
  fluentImportPath?: string;
  /** Import path for player-ui types (default: "@player-ui/types") */
  typesImportPath?: string;
  /** TypeScript context for automatic import resolution */
  tsContext?: TypeScriptContext;
  /** Function to generate the type import path for a given type name */
  typeImportPathGenerator?: (typeName: string) => string;
  /** Types defined in the same source file as the main type */
  sameFileTypes?: Set<string>;
  /** External type mappings (type name -> package name) */
  externalTypes?: Map<string, string>;
}

/**
 * Generates import statements and tracks type references.
 * Implements both TypeTracker and TypeTransformContext interfaces.
 */
export class ImportGenerator implements TypeTracker, TypeTransformContext {
  private readonly config: ImportGeneratorConfig;

  /** Track all type references that need to be imported, grouped by source file */
  private referencedTypesBySource = new Map<string, Set<string>>();

  /** Track types that should be imported from the main type's source file */
  private referencedTypes = new Set<string>();

  /** Track whether Asset type is needed for imports */
  private needsAssetImport = false;

  /** Track generic parameter symbols (e.g., T, U) that should not be imported */
  private genericParamSymbols = new Set<string>();

  /** TypeScript resolver for automatic import path resolution */
  private readonly tsResolver?: {
    resolveTypePath: (typeName: string) => TypeResolutionResult;
    getUnexportedTypes: () => UnexportedTypeInfo[];
  };

  /** Track types that couldn't be resolved - will cause errors if used */
  private unresolvedTypes = new Set<string>();

  /** Track namespaces that need to be imported (e.g., "Validation" from @player-ui/types) */
  private namespaceImports = new Set<string>();

  /** Map short type names to their full qualified names (e.g., "CrossfieldReference" -> "Validation.CrossfieldReference") */
  private namespaceMemberMap = new Map<string, string>();

  /** Effective sameFileTypes - computed from tsContext or provided directly */
  private readonly effectiveSameFileTypes?: Set<string>;

  constructor(config: ImportGeneratorConfig = {}) {
    this.config = config;

    // Initialize TypeScript resolver if tsContext is provided
    if (config.tsContext) {
      this.tsResolver = createTypeScriptResolver(config.tsContext);
    }

    // Use provided sameFileTypes or fall back to empty set
    this.effectiveSameFileTypes = config.sameFileTypes;
  }

  // TypeTransformContext implementation
  setNeedsAssetImport(value: boolean): void {
    this.needsAssetImport = value;
  }

  getNeedsAssetImport(): boolean {
    return this.needsAssetImport;
  }

  getNamespaceMemberMap(): Map<string, string> {
    return this.namespaceMemberMap;
  }

  getGenericParamSymbols(): Set<string> {
    return this.genericParamSymbols;
  }

  /**
   * Get list of types that exist but need to be exported.
   */
  getUnexportedTypes(): UnexportedTypeInfo[] {
    return this.tsResolver?.getUnexportedTypes() ?? [];
  }

  /**
   * Get list of types that couldn't be resolved at all.
   */
  getUnresolvedTypes(): string[] {
    return Array.from(this.unresolvedTypes);
  }

  /**
   * Track a referenced type for import generation.
   */
  trackReferencedType(typeName: string): void {
    const { externalTypes, typeImportPathGenerator } = this.config;

    // Strip generic arguments for import purposes (import { ListItem } not { ListItem<T> })
    const importName = extractBaseName(typeName);

    // Never track PLAYER_BUILTINS (Asset, AssetWrapper, Binding, Expression)
    // These have special handling and should not be imported as regular types.
    // Note: This is intentionally redundant with isBuiltinType() filtering in
    // TypeTransformer.shouldTrackTypeForImport() to provide defense in depth.
    if (PLAYER_BUILTINS.has(importName)) {
      return;
    }

    // Check if it's a namespaced type (e.g., "Validation.CrossfieldReference")
    const namespaced = parseNamespacedType(importName);
    if (namespaced) {
      // Track the namespace for import (e.g., "Validation" from "@player-ui/types")
      const namespaceName = namespaced.namespace;

      // Check if we have an external types mapping for the namespace
      if (externalTypes?.has(namespaceName)) {
        const packageName = externalTypes.get(namespaceName)!;
        if (!this.referencedTypesBySource.has(packageName)) {
          this.referencedTypesBySource.set(packageName, new Set());
        }
        this.referencedTypesBySource.get(packageName)!.add(namespaceName);
        return;
      }

      // Default: assume it comes from @player-ui/types for namespaced types
      const typesImportPath = this.config.typesImportPath ?? "@player-ui/types";
      if (!this.referencedTypesBySource.has(typesImportPath)) {
        this.referencedTypesBySource.set(typesImportPath, new Set());
      }
      this.referencedTypesBySource.get(typesImportPath)!.add(namespaceName);
      return;
    }

    // Check if it's an explicitly configured external type
    if (externalTypes?.has(importName)) {
      const packageName = externalTypes.get(importName)!;
      if (!this.referencedTypesBySource.has(packageName)) {
        this.referencedTypesBySource.set(packageName, new Set());
      }
      this.referencedTypesBySource.get(packageName)!.add(importName);
      return;
    }

    // If TypeScript resolver is available, use it for automatic resolution
    if (this.tsResolver) {
      const result = this.tsResolver.resolveTypePath(importName);
      if (result === "notFound") {
        this.unresolvedTypes.add(importName);
        return;
      }
      if (result === "sameFile") {
        this.referencedTypes.add(importName);
      } else {
        if (!this.referencedTypesBySource.has(result)) {
          this.referencedTypesBySource.set(result, new Set());
        }
        this.referencedTypesBySource.get(result)!.add(importName);
      }
      return;
    }

    // Fall back to manual configuration
    const sameFileTypes = this.effectiveSameFileTypes;
    if (sameFileTypes) {
      if (sameFileTypes.has(importName)) {
        this.referencedTypes.add(importName);
      } else if (typeImportPathGenerator) {
        const importPath = typeImportPathGenerator(importName);
        if (importPath) {
          if (!this.referencedTypesBySource.has(importPath)) {
            this.referencedTypesBySource.set(importPath, new Set());
          }
          this.referencedTypesBySource.get(importPath)!.add(importName);
        }
      } else {
        this.referencedTypes.add(importName);
      }
    } else {
      this.referencedTypes.add(importName);
    }
  }

  /**
   * Track a namespace that needs to be imported.
   */
  trackNamespaceImport(namespaceName: string): void {
    this.namespaceImports.add(namespaceName);

    // Use the TypeScript resolver to find where the namespace is exported from
    if (this.tsResolver) {
      const result = this.tsResolver.resolveTypePath(namespaceName);
      if (result === "sameFile") {
        this.referencedTypes.add(namespaceName);
      } else if (result !== "notFound") {
        if (!this.referencedTypesBySource.has(result)) {
          this.referencedTypesBySource.set(result, new Set());
        }
        this.referencedTypesBySource.get(result)!.add(namespaceName);
      } else {
        this.unresolvedTypes.add(namespaceName);
      }
      return;
    }

    // Fall back: check external types first
    const { externalTypes, typeImportPathGenerator } = this.config;
    if (externalTypes?.has(namespaceName)) {
      const packageName = externalTypes.get(namespaceName)!;
      if (!this.referencedTypesBySource.has(packageName)) {
        this.referencedTypesBySource.set(packageName, new Set());
      }
      this.referencedTypesBySource.get(packageName)!.add(namespaceName);
      return;
    }

    // Try typeImportPathGenerator
    if (typeImportPathGenerator) {
      const importPath = typeImportPathGenerator(namespaceName);
      if (importPath) {
        if (!this.referencedTypesBySource.has(importPath)) {
          this.referencedTypesBySource.set(importPath, new Set());
        }
        this.referencedTypesBySource.get(importPath)!.add(namespaceName);
        return;
      }
    }

    // Last resort: assume same file
    this.referencedTypes.add(namespaceName);
  }

  /**
   * Generate import statements.
   */
  generateImports(mainTypeName: string): string {
    // Determine the import path for the main type
    let typeImportPath: string;
    if (this.config.tsContext) {
      const { sourceFile, outputDir } = this.config.tsContext;
      let relativePath = path.relative(outputDir, sourceFile.fileName);
      relativePath = relativePath.replace(/\.tsx?$/, ".js");
      if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
      }
      typeImportPath = relativePath;
    } else if (this.config.typeImportPathGenerator) {
      typeImportPath = this.config.typeImportPathGenerator(mainTypeName);
    } else {
      typeImportPath = `../types/${this.getTypeFileName(mainTypeName)}`;
    }

    // Collect all types to import from the main source file
    const typesToImport = new Set<string>([mainTypeName]);

    // Add referenced types that are in the same source file
    Array.from(this.referencedTypes).forEach((name) => {
      typesToImport.add(name);
    });

    // Get import paths from config or use defaults
    const typesImportPath = this.config.typesImportPath ?? "@player-ui/types";
    const fluentImportPath =
      this.config.fluentImportPath ?? "@player-tools/fluent";

    // Build import lines
    const lines: string[] = [];

    // Main type import
    const typeImportStatement = `import type { ${Array.from(typesToImport).join(", ")} } from "${typeImportPath}";`;
    lines.push(typeImportStatement);

    // Generate imports for types from other source files
    for (const [importPath, types] of this.referencedTypesBySource) {
      const typeNames = Array.from(types).join(", ");
      lines.push(`import type { ${typeNames} } from "${importPath}";`);
    }

    // Only import Asset if it's used
    if (this.needsAssetImport) {
      lines.push(`import type { Asset } from "${typesImportPath}";`);
    }

    lines.push(
      `import { type FluentBuilder, type BaseBuildContext, type FluentPartial, FluentBuilderBase, createInspectMethod, type TaggedTemplateValue } from "${fluentImportPath}";`,
    );

    return lines.join("\n");
  }

  private getTypeFileName(typeName: string): string {
    // Convert PascalCase to kebab-case for file name
    return typeName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "")
      .replace(/asset$/, "");
  }
}
