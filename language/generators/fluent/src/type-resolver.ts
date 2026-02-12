import ts from "typescript";
import path from "node:path";
import { TsMorphTypeDefinitionFinder } from "./ts-morph-type-finder";

/**
 * TypeScript context for automatic import resolution.
 * When provided, the generator uses TypeScript's module resolution to determine
 * where types should be imported from.
 */
export interface TypeScriptContext {
  /** The TypeScript program */
  program: ts.Program;
  /** The source file containing the type being generated */
  sourceFile: ts.SourceFile;
  /** The output directory where generated files will be written */
  outputDir: string;
}

/**
 * Information about an unexported type that needs to be exported
 */
export interface UnexportedTypeInfo {
  /** The type name that needs to be exported */
  typeName: string;
  /** The file path where the type is declared */
  filePath: string;
}

/**
 * Result from type resolution.
 * - sameFile: type is defined in the same file as the main type
 * - notFound: type couldn't be resolved anywhere
 * - string: import path for the type (package name or relative path)
 */
export type TypeResolutionResult = "sameFile" | "notFound" | string;

/**
 * Check if a file path is a TypeScript lib/built-in declaration file.
 * These are files like lib.dom.d.ts that contain built-in type definitions.
 */
export function isBuiltInDeclarationPath(filePath: string): boolean {
  // TypeScript lib files
  if (filePath.includes("/typescript/lib/lib.")) return true;
  // Node.js built-in types
  if (filePath.includes("/@types/node/")) return true;
  return false;
}

/**
 * Check if a declaration node is exported.
 */
export function isDeclarationExported(
  node: ts.Declaration,
  typescript: typeof ts,
): boolean {
  // Check for export modifier on the declaration itself
  const modifiers = typescript.canHaveModifiers(node)
    ? typescript.getModifiers(node)
    : undefined;
  if (modifiers) {
    for (const modifier of modifiers) {
      if (modifier.kind === typescript.SyntaxKind.ExportKeyword) {
        return true;
      }
    }
  }

  // Check if this declaration is part of an export statement
  const parent = node.parent;
  if (parent && typescript.isExportDeclaration(parent)) {
    return true;
  }

  return false;
}

/**
 * Creates an import resolver using TypeScript's type checker and
 * TsMorphTypeDefinitionFinder for tracing types through imports.
 * This handles cases where types come through extends, Pick, re-exports, etc.
 */
export function createTypeScriptResolver(tsContext: TypeScriptContext): {
  resolveTypePath: (typeName: string) => TypeResolutionResult;
  getUnexportedTypes: () => UnexportedTypeInfo[];
} {
  const { program, sourceFile, outputDir } = tsContext;
  const typeChecker = program.getTypeChecker();

  // Create the type definition finder for recursive search
  const finder = new TsMorphTypeDefinitionFinder();

  // Cache resolved paths
  const resolvedCache = new Map<string, TypeResolutionResult>();

  // Track types that exist but aren't exported
  const unexportedTypes: UnexportedTypeInfo[] = [];

  /**
   * Resolve a type name to its import path.
   * Returns:
   * - "sameFile": type is in the same file as the source
   * - "notFound": type couldn't be resolved anywhere
   * - string (import path): type should be imported from this path
   */
  function resolveTypePath(typeName: string): TypeResolutionResult {
    if (resolvedCache.has(typeName)) {
      return resolvedCache.get(typeName)!;
    }

    // First, try to find the type using TsMorphTypeDefinitionFinder
    // This recursively searches through imports
    const typeFilePath = finder.findTypeSourceFile(
      typeName,
      sourceFile.fileName,
    );

    if (typeFilePath) {
      // Check if it's from the same file
      if (typeFilePath === sourceFile.fileName) {
        resolvedCache.set(typeName, "sameFile");
        return "sameFile";
      }

      // Check if it's a built-in declaration
      if (isBuiltInDeclarationPath(typeFilePath)) {
        resolvedCache.set(typeName, "sameFile");
        return "sameFile";
      }

      // Check if it's from node_modules (external package)
      if (typeFilePath.includes("node_modules")) {
        const nodeModulesIdx = typeFilePath.lastIndexOf("node_modules/");
        const afterNodeModules = typeFilePath.slice(
          nodeModulesIdx + "node_modules/".length,
        );

        // Handle scoped packages (@scope/package)
        let packageName: string;
        if (afterNodeModules.startsWith("@")) {
          const parts = afterNodeModules.split("/");
          packageName = `${parts[0]}/${parts[1]}`;
        } else {
          packageName = afterNodeModules.split("/")[0];
        }

        resolvedCache.set(typeName, packageName);
        return packageName;
      }

      // It's a local file - compute relative path from outputDir
      let relativePath = path.relative(outputDir, typeFilePath);
      relativePath = relativePath.replace(/\.tsx?$/, ".js");
      if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
      }

      resolvedCache.set(typeName, relativePath);
      return relativePath;
    }

    // If TsMorphTypeDefinitionFinder didn't find it, fall back to symbol resolution
    // This handles cases where types are in scope but not through imports
    const symbols = typeChecker.getSymbolsInScope(
      sourceFile,
      ts.SymbolFlags.Type | ts.SymbolFlags.Interface | ts.SymbolFlags.TypeAlias,
    );

    const matchingSymbols = symbols.filter((s) => s.getName() === typeName);

    let symbol: ts.Symbol | undefined;
    let validDeclaration: ts.Declaration | undefined;
    let unexportedDeclarationFile: string | undefined;

    for (const s of matchingSymbols) {
      const declarations = s.getDeclarations();
      if (declarations && declarations.length > 0) {
        const decl = declarations[0];
        const declFile = decl.getSourceFile().fileName;

        // Skip built-in declarations
        if (isBuiltInDeclarationPath(declFile)) {
          continue;
        }

        // Check if the declaration is exported (has export modifier or is in node_modules)
        const isFromNodeModules = declFile.includes("node_modules");
        const isExported = isFromNodeModules || isDeclarationExported(decl, ts);

        if (isExported) {
          symbol = s;
          validDeclaration = decl;
          break;
        } else {
          // Track unexported declaration for warning
          unexportedDeclarationFile = declFile;
        }
      }
    }

    if (!symbol || !validDeclaration) {
      // Type exists but is not exported - track for warning
      if (unexportedDeclarationFile) {
        // Check if we already tracked this type
        const alreadyTracked = unexportedTypes.some(
          (t) =>
            t.typeName === typeName && t.filePath === unexportedDeclarationFile,
        );
        if (!alreadyTracked) {
          unexportedTypes.push({
            typeName,
            filePath: unexportedDeclarationFile,
          });
        }
        // Type exists but isn't exported - treat as "not found" for import purposes
        // It will be added to the same-file import, which will cause a type error,
        // but the warning system will tell users what to export
        resolvedCache.set(typeName, "sameFile");
        return "sameFile";
      }
      // Type truly not found
      resolvedCache.set(typeName, "notFound");
      return "notFound";
    }

    const declSourceFile = validDeclaration.getSourceFile();
    const declFilePath = declSourceFile.fileName;

    if (declFilePath === sourceFile.fileName) {
      resolvedCache.set(typeName, "sameFile");
      return "sameFile";
    }

    if (declFilePath.includes("node_modules")) {
      const nodeModulesIdx = declFilePath.lastIndexOf("node_modules/");
      const afterNodeModules = declFilePath.slice(
        nodeModulesIdx + "node_modules/".length,
      );

      let packageName: string;
      if (afterNodeModules.startsWith("@")) {
        const parts = afterNodeModules.split("/");
        packageName = `${parts[0]}/${parts[1]}`;
      } else {
        packageName = afterNodeModules.split("/")[0];
      }

      resolvedCache.set(typeName, packageName);
      return packageName;
    }

    let relativePath = path.relative(outputDir, declFilePath);
    relativePath = relativePath.replace(/\.tsx?$/, ".js");
    if (!relativePath.startsWith(".")) {
      relativePath = "./" + relativePath;
    }

    resolvedCache.set(typeName, relativePath);
    return relativePath;
  }

  function getUnexportedTypes(): UnexportedTypeInfo[] {
    return [...unexportedTypes];
  }

  return { resolveTypePath, getUnexportedTypes };
}
