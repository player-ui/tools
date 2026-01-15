import { TypeDefinitionFinder } from "./type-definition-finder";
import {
  isNodeModulesPath,
  extractPackageNameFromPath,
  createRelativeImportPath,
} from "./path-utils";

/**
 * Categorized types for import generation.
 * Types are split into three categories based on where they should be imported from.
 */
export interface TypeCategories {
  /** Types defined in the same file as the main type (import from main source) */
  localTypes: Set<string>;
  /** Types from other local files, grouped by relative import path */
  relativeImports: Map<string, Set<string>>;
  /** Types from external packages (node_modules), mapped to package name */
  externalTypes: Map<string, string>;
}

/**
 * Options for type categorization.
 */
export interface CategorizerOptions {
  /** The main source file being generated */
  mainSourceFile: string;
  /** Types known to be in the main source file (optional optimization) */
  sameFileTypes?: Set<string>;
}

/**
 * Categorizes referenced types into local, relative, and external imports.
 *
 * Uses TypeDefinitionFinder to resolve where each type is defined, then
 * categorizes based on the resolved path:
 * - Same file as main → localTypes
 * - Different local file → relativeImports
 * - node_modules → externalTypes
 *
 * @param referencedTypes - Set of type names that need to be imported
 * @param finder - TypeDefinitionFinder instance for resolving type locations
 * @param options - Categorization options including main source file
 * @returns Categorized types for import generation
 */
export function categorizeTypes(
  referencedTypes: Set<string>,
  finder: TypeDefinitionFinder,
  options: CategorizerOptions,
): TypeCategories {
  const { mainSourceFile, sameFileTypes } = options;

  const result: TypeCategories = {
    localTypes: new Set(),
    relativeImports: new Map(),
    externalTypes: new Map(),
  };

  for (const typeName of referencedTypes) {
    // Optimization: if we know the type is in the same file, skip resolution
    if (sameFileTypes?.has(typeName)) {
      result.localTypes.add(typeName);
      continue;
    }

    // Try to resolve the type's source file
    const sourceFile = finder.findTypeSourceFile(typeName, mainSourceFile);

    if (!sourceFile) {
      // Could not resolve - assume it's in the same file
      result.localTypes.add(typeName);
      continue;
    }

    // Normalize paths for comparison
    const normalizedSource = normalizePath(sourceFile);
    const normalizedMain = normalizePath(mainSourceFile);

    if (normalizedSource === normalizedMain) {
      // Same file
      result.localTypes.add(typeName);
    } else if (isNodeModulesPath(sourceFile)) {
      // External package
      const packageName = extractPackageNameFromPath(sourceFile);
      if (packageName) {
        result.externalTypes.set(typeName, packageName);
      } else {
        // Couldn't extract package name, fallback to local
        result.localTypes.add(typeName);
      }
    } else {
      // Different local file - create relative import path
      const relativePath = createRelativeImportPath(mainSourceFile, sourceFile);
      if (!result.relativeImports.has(relativePath)) {
        result.relativeImports.set(relativePath, new Set());
      }
      result.relativeImports.get(relativePath)!.add(typeName);
    }
  }

  return result;
}

/**
 * Groups external types by their package name for import generation.
 * This allows generating single imports per package with multiple types.
 *
 * @param externalTypes - Map of typeName → packageName
 * @returns Map of packageName → Set of typeNames
 */
export function groupExternalTypesByPackage(
  externalTypes: Map<string, string>,
): Map<string, Set<string>> {
  const grouped = new Map<string, Set<string>>();

  for (const [typeName, packageName] of externalTypes) {
    if (!grouped.has(packageName)) {
      grouped.set(packageName, new Set());
    }
    grouped.get(packageName)!.add(typeName);
  }

  return grouped;
}

/**
 * Normalizes a file path for comparison.
 * Removes trailing slashes and normalizes separators.
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/").replace(/\/$/, "");
}
