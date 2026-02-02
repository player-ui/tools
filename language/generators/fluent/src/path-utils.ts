import { normalize, sep, dirname, relative, resolve } from "path";

/**
 * Normalizes a file path and splits it into parts.
 */
function normalizeAndSplitPath(filePath: string): string[] {
  return normalize(filePath).split(sep);
}

/**
 * Checks if a path segment indicates a package directory.
 */
function isPackageDirectory(part: string): boolean {
  return part === "node_modules" || part.startsWith(".pnpm");
}

/**
 * Determines if a file path appears to be from a package (node_modules or pnpm store).
 *
 * @param filePath - The file path to analyze
 * @returns True if the path looks like it belongs to a package
 *
 * @example
 * ```ts
 * isNodeModulesPath('/project/node_modules/react/index.d.ts') // true
 * isNodeModulesPath('/project/src/components/Button.ts') // false
 * isNodeModulesPath('/project/node_modules/.pnpm/react@18.0.0/...') // true
 * ```
 */
export function isNodeModulesPath(filePath: string): boolean {
  const parts = normalizeAndSplitPath(filePath);
  return parts.some(isPackageDirectory);
}

/**
 * Extracts the package name from a node_modules path.
 * Handles npm, pnpm store, scoped packages, and various structures.
 *
 * @param filePath - The file path to extract package name from
 * @returns The package name (e.g., 'lodash', '@player-tools/types') or null
 *
 * @example
 * ```ts
 * // Standard npm package
 * extractPackageNameFromPath('/project/node_modules/lodash/index.d.ts')
 * // Returns: 'lodash'
 *
 * // Scoped package
 * extractPackageNameFromPath('/project/node_modules/@player-tools/types/index.d.ts')
 * // Returns: '@player-tools/types'
 *
 * // pnpm store
 * extractPackageNameFromPath('/project/node_modules/.pnpm/@player-tools+types@1.0.0/node_modules/@player-tools/types/index.d.ts')
 * // Returns: '@player-tools/types'
 * ```
 */
export function extractPackageNameFromPath(filePath: string): string | null {
  const parts = normalizeAndSplitPath(filePath);

  // Find the last occurrence of node_modules (for pnpm which has nested node_modules)
  let lastNodeModulesIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i] === "node_modules") {
      lastNodeModulesIndex = i;
      break;
    }
  }

  if (lastNodeModulesIndex === -1 || lastNodeModulesIndex >= parts.length - 1) {
    return null;
  }

  const afterNodeModules = parts.slice(lastNodeModulesIndex + 1);

  // Check if it's a scoped package (@scope/package)
  if (afterNodeModules[0]?.startsWith("@")) {
    if (afterNodeModules.length >= 2) {
      return `${afterNodeModules[0]}/${afterNodeModules[1]}`;
    }
    return null;
  }

  // Regular package
  return afterNodeModules[0] || null;
}

/**
 * Creates a relative import path from one file to another.
 * Converts TypeScript extensions to JavaScript for runtime imports.
 *
 * @param fromFile - The absolute path of the importing file
 * @param toFile - The absolute path of the file being imported
 * @returns Relative import path with .js extension
 *
 * @example
 * ```ts
 * createRelativeImportPath('/project/src/types/foo.ts', '/project/src/types/bar.ts')
 * // Returns: './bar.js'
 *
 * createRelativeImportPath('/project/src/builders/foo.ts', '/project/src/types/bar.ts')
 * // Returns: '../types/bar.js'
 * ```
 */
export function createRelativeImportPath(
  fromFile: string,
  toFile: string,
): string {
  const fromDir = dirname(fromFile);
  let relativePath = relative(fromDir, toFile);

  // Convert TypeScript extensions to JavaScript
  relativePath = relativePath.replace(/\.tsx?$/, ".js");
  relativePath = relativePath.replace(/\.d\.ts$/, ".js");

  // Ensure the path starts with ./ or ../
  if (!relativePath.startsWith(".")) {
    relativePath = `./${relativePath}`;
  }

  return relativePath;
}

/**
 * Resolves a relative import path to an absolute file path.
 * Handles .js to .ts conversion for TypeScript resolution.
 *
 * @param fromFile - The absolute path of the file containing the import
 * @param importSpecifier - The import specifier (e.g., './types', '../utils.js')
 * @returns Absolute path with .ts extension
 */
export function resolveRelativeImportPath(
  fromFile: string,
  importSpecifier: string,
): string {
  const fromDir = dirname(fromFile);

  // Convert .js to .ts for TypeScript resolution
  let actualSpecifier = importSpecifier;
  if (importSpecifier.endsWith(".js")) {
    actualSpecifier = importSpecifier.replace(/\.js$/, ".ts");
  }

  let resolvedPath = resolve(fromDir, actualSpecifier);

  // Add .ts extension if not present
  if (
    !resolvedPath.endsWith(".ts") &&
    !resolvedPath.endsWith(".tsx") &&
    !resolvedPath.endsWith(".d.ts")
  ) {
    resolvedPath += ".ts";
  }

  return resolvedPath;
}
