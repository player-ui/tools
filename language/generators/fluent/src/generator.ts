import type {
  NodeType,
  ObjectType,
  RefType,
  NamedType,
} from "@player-tools/xlr";
import { isGenericNamedType } from "@player-tools/xlr-utils";
import ts from "typescript";
import path from "node:path";
import fs from "node:fs";
import {
  isStringType,
  isNumberType,
  isBooleanType,
  isObjectType,
  isArrayType,
  isRefType,
  isOrType,
  isAndType,
  isRecordType,
  isNamedType,
  isPrimitiveConst,
  toPascalCase,
  toFactoryName,
  toBuilderClassName,
  getAssetTypeFromExtends,
  containsArrayType,
  extractGenericUsage,
  isBuiltinType,
} from "./utils";

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
 * Configuration for the generator
 */
export interface GeneratorConfig {
  /** Import path for fluent utilities (default: "@player-tools/fluent") */
  fluentImportPath?: string;
  /** Import path for player-ui types (default: "@player-ui/types") */
  typesImportPath?: string;
  /**
   * TypeScript context for automatic import resolution.
   * When provided, the generator will automatically resolve import paths
   * using TypeScript's module resolution.
   */
  tsContext?: TypeScriptContext;
  /** Function to generate the type import path for a given type name */
  typeImportPathGenerator?: (typeName: string) => string;
  /**
   * Set of type names that are defined in the same source file as the main type.
   * Types not in this set will be imported from their own source files using typeImportPathGenerator.
   * When tsContext is provided, this is computed automatically from the source file.
   */
  sameFileTypes?: Set<string>;
  /**
   * Explicitly maps type names to their package names for external imports.
   * Types in this map will be imported from the specified package (e.g., "@player-tools/types").
   * This takes precedence over typeImportPathGenerator for the specified types.
   */
  externalTypes?: Map<string, string>;
}

/**
 * Information about a builder class to generate.
 * Exported for consumers who need to extend or introspect the generator.
 */
export interface BuilderInfo {
  /** Original type name from XLR */
  name: string;
  /** Generated class name (e.g., "TextAssetBuilder") */
  className: string;
  /** Factory function name (e.g., "text") */
  factoryName: string;
  /** The XLR ObjectType being generated */
  objectType: ObjectType;
  /** Asset type string if this is an Asset (e.g., "text") */
  assetType?: string;
  /** Generic parameters declaration if type is generic */
  genericParams?: string;
  /** Whether this type extends Asset */
  isAsset: boolean;
}

/**
 * Extracts the base type name from a ref string, handling nested generics.
 * @example
 * extractBaseName("MyType") // "MyType"
 * extractBaseName("MyType<T>") // "MyType"
 * extractBaseName("Map<string, Array<T>>") // "Map"
 */
function extractBaseName(ref: string): string {
  const bracketIndex = ref.indexOf("<");
  return bracketIndex === -1 ? ref : ref.substring(0, bracketIndex);
}

/**
 * Checks if a type name is a namespaced type (e.g., "Validation.CrossfieldReference").
 * Returns the namespace and member name if it is, null otherwise.
 */
function parseNamespacedType(
  typeName: string,
): { namespace: string; member: string } | null {
  const dotIndex = typeName.indexOf(".");
  if (dotIndex === -1) return null;
  return {
    namespace: typeName.substring(0, dotIndex),
    member: typeName.substring(dotIndex + 1),
  };
}

/**
 * Type definition finder that recursively searches through imports
 * to find where types are actually defined. This handles types that
 * come through `Pick`, `extends`, re-exports, and other indirect references.
 */
class TypeDefinitionFinder {
  private readonly program: ts.Program;
  private readonly typeLocationCache = new Map<string, string | null>();

  constructor(program: ts.Program) {
    this.program = program;
  }

  /**
   * Find the source file path for a type by searching the codebase.
   * Handles interfaces, type aliases, classes, and re-exported types.
   *
   * @param typeName - The name of the type to find
   * @param startingFile - The file path to start searching from
   * @returns The path to the file containing the type definition, or null if not found
   */
  findTypeSourceFile(typeName: string, startingFile: string): string | null {
    if (!typeName || !startingFile) {
      return null;
    }

    // Check cache first
    const cacheKey = `${typeName}:${startingFile}`;
    const cachedResult = this.typeLocationCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    const visitedFiles = new Set<string>();
    const result = this.searchForType(typeName, startingFile, visitedFiles);

    this.typeLocationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Recursively search for a type definition through imports.
   */
  private searchForType(
    typeName: string,
    filePath: string,
    visitedFiles: Set<string>,
  ): string | null {
    if (!fs.existsSync(filePath) || visitedFiles.has(filePath)) {
      return null;
    }

    visitedFiles.add(filePath);

    const sourceFile = this.program.getSourceFile(filePath);
    if (!sourceFile) {
      return null;
    }

    // Check if this file defines the type
    if (this.fileDefinesType(sourceFile, typeName)) {
      return filePath;
    }

    // Search through imports
    const importPaths = this.getImportPaths(sourceFile);
    for (const importPath of importPaths) {
      const resolvedPath = this.resolveImportPath(filePath, importPath);
      if (resolvedPath) {
        const result = this.searchForType(typeName, resolvedPath, visitedFiles);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  /**
   * Check if a source file defines and exports a specific type.
   * Only exported types can be imported, so we must verify the export.
   */
  private fileDefinesType(
    sourceFile: ts.SourceFile,
    typeName: string,
  ): boolean {
    let found = false;

    const visit = (node: ts.Node): void => {
      if (found) return;

      // Check exported interface declarations
      if (
        ts.isInterfaceDeclaration(node) &&
        node.name.text === typeName &&
        this.hasExportModifier(node)
      ) {
        found = true;
        return;
      }

      // Check exported type alias declarations
      if (
        ts.isTypeAliasDeclaration(node) &&
        node.name.text === typeName &&
        this.hasExportModifier(node)
      ) {
        found = true;
        return;
      }

      // Check exported class declarations
      if (
        ts.isClassDeclaration(node) &&
        node.name &&
        node.name.text === typeName &&
        this.hasExportModifier(node)
      ) {
        found = true;
        return;
      }

      // Check exported types in export declarations (re-exports)
      if (ts.isExportDeclaration(node) && node.exportClause) {
        if (ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            if (element.name.text === typeName) {
              found = true;
              return;
            }
          }
        }
      }

      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return found;
  }

  /**
   * Check if a node has the 'export' modifier.
   */
  private hasExportModifier(node: ts.Node): boolean {
    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined;
    if (!modifiers) return false;
    return modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
  }

  /**
   * Get all import paths from a source file.
   */
  private getImportPaths(sourceFile: ts.SourceFile): string[] {
    const paths: string[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          paths.push(moduleSpecifier.text);
        }
      }
      // Also check export declarations with module specifiers (re-exports)
      if (
        ts.isExportDeclaration(node) &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        paths.push(node.moduleSpecifier.text);
      }
      ts.forEachChild(node, visit);
    };

    ts.forEachChild(sourceFile, visit);
    return paths;
  }

  /**
   * Resolve an import path to an actual file path.
   */
  private resolveImportPath(
    fromFile: string,
    importPath: string,
  ): string | null {
    // Only follow relative imports
    if (!importPath.startsWith(".")) {
      return null;
    }

    const dir = path.dirname(fromFile);
    const extensions = [".ts", ".tsx"];
    const jsExtensions: Record<string, string> = {
      ".js": ".ts",
      ".jsx": ".tsx",
    };

    // Build possible paths
    const possiblePaths: string[] = [];

    // Direct file with TypeScript extensions
    for (const ext of extensions) {
      possiblePaths.push(path.resolve(dir, `${importPath}${ext}`));
    }

    // Index files
    for (const ext of extensions) {
      possiblePaths.push(path.resolve(dir, `${importPath}/index${ext}`));
    }

    // JavaScript extensions mapped to TypeScript
    for (const [jsExt, tsExt] of Object.entries(jsExtensions)) {
      if (importPath.endsWith(jsExt)) {
        possiblePaths.push(
          path.resolve(
            dir,
            importPath.replace(new RegExp(`\\${jsExt}$`), tsExt),
          ),
        );
      }
    }

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    return null;
  }
}

/**
 * Check if a file path is a TypeScript lib/built-in declaration file.
 * These are files like lib.dom.d.ts that contain built-in type definitions.
 */
function isBuiltInDeclarationPath(filePath: string): boolean {
  // TypeScript lib files
  if (filePath.includes("/typescript/lib/lib.")) return true;
  // Node.js built-in types
  if (filePath.includes("/@types/node/")) return true;
  return false;
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
type TypeResolutionResult = "sameFile" | "notFound" | string;

/**
 * Creates an import resolver using TypeScript's type checker and
 * a TypeDefinitionFinder for tracing types through imports.
 * This handles cases where types come through extends, Pick, re-exports, etc.
 */
function createTypeScriptResolver(tsContext: TypeScriptContext): {
  resolveTypePath: (typeName: string) => TypeResolutionResult;
  getUnexportedTypes: () => UnexportedTypeInfo[];
} {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const path = require("path") as typeof import("path");

  const { program, sourceFile, outputDir } = tsContext;
  const typeChecker = program.getTypeChecker();

  // Create the type definition finder for recursive search
  const finder = new TypeDefinitionFinder(program);

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

    // First, try to find the type using TypeDefinitionFinder
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

    // If TypeDefinitionFinder didn't find it, fall back to symbol resolution
    // This handles cases where types are in scope but not through imports
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const typescript = require("typescript") as typeof ts;
    const symbols = typeChecker.getSymbolsInScope(
      sourceFile,
      typescript.SymbolFlags.Type |
        typescript.SymbolFlags.Interface |
        typescript.SymbolFlags.TypeAlias,
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
        const isExported =
          isFromNodeModules || isDeclarationExported(decl, typescript);

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

/**
 * Check if a declaration node is exported.
 */
function isDeclarationExported(
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
 * Generates fluent builder TypeScript code from XLR types
 */
export class FluentBuilderGenerator {
  private readonly namedType: NamedType<ObjectType>;
  private readonly config: GeneratorConfig;

  /** Track array properties for __arrayProperties__ */
  private arrayProperties = new Set<string>();

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

  constructor(namedType: NamedType<ObjectType>, config: GeneratorConfig = {}) {
    this.namedType = namedType;
    this.config = config;

    // Initialize TypeScript resolver if tsContext is provided
    if (config.tsContext) {
      this.tsResolver = createTypeScriptResolver(config.tsContext);
    }

    // Use provided sameFileTypes or fall back to empty set
    // (tsResolver.importedTypes tells us what's NOT in the same file)
    this.effectiveSameFileTypes = config.sameFileTypes;
  }

  /**
   * Get list of types that exist but need to be exported.
   * Call this after generate() to get warnings for the user.
   */
  getUnexportedTypes(): UnexportedTypeInfo[] {
    return this.tsResolver?.getUnexportedTypes() ?? [];
  }

  /**
   * Get list of types that couldn't be resolved at all.
   * These types are used in the generated code but won't be imported,
   * causing type errors. Often these are namespaced types (e.g., Validation.CrossfieldReference).
   */
  getUnresolvedTypes(): string[] {
    return Array.from(this.unresolvedTypes);
  }

  /**
   * Generate the builder code
   */
  generate(): string {
    // Collect generic parameter symbols first so we can exclude them from imports
    // This MUST happen before createBuilderInfo since transformTypeForConstraint needs it
    this.collectGenericParamSymbols(this.namedType);

    const mainBuilder = this.createBuilderInfo(this.namedType);

    // Collect types from generic constraints/defaults for import generation
    this.collectTypesFromGenericTokens(this.namedType);

    // Collect all referenced types for imports (no nested builders are generated)
    this.collectReferencedTypes(this.namedType);

    // Generate main builder class (this also sets needsAssetImport flag)
    const mainBuilderCode = this.generateBuilderClass(mainBuilder);

    // Generate imports after builder code so we know what imports are needed
    const imports = this.generateImports(mainBuilder);

    return [imports, mainBuilderCode].filter(Boolean).join("\n\n");
  }

  private createBuilderInfo(namedType: NamedType<ObjectType>): BuilderInfo {
    const assetType = getAssetTypeFromExtends(namedType);
    const isAsset = !!assetType;

    let genericParams: string | undefined;
    if (isGenericNamedType(namedType)) {
      // Deduplicate generic parameters by symbol name
      // This handles cases where a type extends another generic type without
      // passing type arguments, causing XLR to collect parameters from both
      const seenParams = new Set<string>();
      genericParams = namedType.genericTokens
        .filter((t) => {
          if (seenParams.has(t.symbol)) {
            return false;
          }
          seenParams.add(t.symbol);
          return true;
        })
        .map((t) => {
          let param = t.symbol;
          if (t.constraints) {
            const constraintType = this.transformTypeForConstraint(
              t.constraints,
            );
            // Skip 'any' constraints - these represent unconstrained generics in TypeScript
            // Adding "extends any" is redundant and reduces type safety
            if (constraintType !== "any") {
              param += ` extends ${constraintType}`;
            }
          }
          if (t.default) {
            param += ` = ${this.transformTypeForConstraint(t.default)}`;
          }
          return param;
        })
        .join(", ");
    }

    return {
      name: namedType.name,
      className: toBuilderClassName(namedType.name),
      factoryName: toFactoryName(namedType.name),
      objectType: namedType,
      assetType,
      genericParams,
      isAsset,
    };
  }

  private generateImports(mainBuilder: BuilderInfo): string {
    // Determine the import path for the main type
    let typeImportPath: string;
    if (this.config.tsContext) {
      // When using tsContext, compute path from source file to output dir
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path") as typeof import("path");
      const { sourceFile, outputDir } = this.config.tsContext;
      let relativePath = path.relative(outputDir, sourceFile.fileName);
      relativePath = relativePath.replace(/\.tsx?$/, ".js");
      if (!relativePath.startsWith(".")) {
        relativePath = "./" + relativePath;
      }
      typeImportPath = relativePath;
    } else if (this.config.typeImportPathGenerator) {
      typeImportPath = this.config.typeImportPathGenerator(mainBuilder.name);
    } else {
      typeImportPath = `../types/${this.getTypeFileName(mainBuilder.name)}`;
    }

    // Collect all types to import from the main source file
    // This includes: main type and referenced types from same file
    const typesToImport = new Set<string>([mainBuilder.name]);

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
      `import { type FluentBuilder, type BaseBuildContext, FluentBuilderBase, createInspectMethod, type TaggedTemplateValue } from "${fluentImportPath}";`,
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

  private collectReferencedTypes(objType: ObjectType): void {
    for (const prop of Object.values(objType.properties)) {
      this.collectReferencedTypesFromNode(prop.node);
    }
  }

  private collectReferencedTypesFromNode(node: NodeType): void {
    if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Named types are defined elsewhere - track for import
        // Skip built-in types and the type being generated
        if (
          node.name !== this.namedType.name &&
          !isBuiltinType(node.name) &&
          !this.genericParamSymbols.has(node.name)
        ) {
          this.trackReferencedType(node.name);
        }
      } else {
        // Anonymous object - recurse into properties to collect type references
        for (const prop of Object.values(node.properties)) {
          this.collectReferencedTypesFromNode(prop.node);
        }
      }
    } else if (isArrayType(node)) {
      this.collectReferencedTypesFromNode(node.elementType);
    } else if (isOrType(node)) {
      for (const variant of node.or) {
        this.collectReferencedTypesFromNode(variant);
      }
    } else if (isAndType(node)) {
      for (const part of node.and) {
        this.collectReferencedTypesFromNode(part);
      }
    } else if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);

      // Check if this is a namespaced type (e.g., "Validation.CrossfieldReference")
      const namespaced = parseNamespacedType(baseName);
      if (namespaced) {
        // Track the namespace for import and the member mapping
        this.trackNamespaceImport(namespaced.namespace);
        this.namespaceMemberMap.set(namespaced.member, baseName);
      } else {
        // Track reference types that aren't built-in or generic params
        if (
          !isBuiltinType(baseName) &&
          !this.genericParamSymbols.has(baseName)
        ) {
          this.trackReferencedType(baseName);
        }
      }

      // Also process generic arguments, but skip type parameters of the referenced type
      if (node.genericArguments) {
        for (const arg of node.genericArguments) {
          // Skip if this argument appears to be a type parameter of the referenced type
          // e.g., in ref="Bar<AnyAsset>", skip "AnyAsset" since it's Bar's type param
          if (isRefType(arg)) {
            const argName = extractBaseName(arg.ref);
            if (this.isTypeParamOfRef(argName, node.ref)) {
              continue;
            }
          }
          this.collectReferencedTypesFromNode(arg);
        }
      }
    }
  }

  /**
   * Track a referenced type for import generation.
   * Priority: externalTypes > tsResolver > sameFileTypes > typeImportPathGenerator
   * Types are categorized into:
   * - referencedTypes: same file as main type
   * - referencedTypesBySource: grouped by import path (local files or packages)
   *
   * Note: Type names with generic arguments (e.g., "ListItem<AnyAsset>") have the
   * generic part stripped for import purposes, since import statements use just
   * the base type name.
   */
  private trackReferencedType(typeName: string): void {
    const { externalTypes, typeImportPathGenerator } = this.config;

    // Strip generic arguments for import purposes (import { ListItem } not { ListItem<T> })
    const importName = extractBaseName(typeName);

    // Check if it's a namespaced type (e.g., "Validation.CrossfieldReference")
    const namespaced = parseNamespacedType(importName);
    if (namespaced) {
      // Track the namespace for import (e.g., "Validation" from "@player-ui/types")
      // The namespace is imported, and the full path is used in code
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
        // Type couldn't be resolved - track it for warning
        // This handles cases like namespaced types (Validation.CrossfieldReference)
        // that can't be found by the resolver
        this.unresolvedTypes.add(importName);
        return;
      }
      if (result === "sameFile") {
        // Type is from the same file
        this.referencedTypes.add(importName);
      } else {
        // Type is from a different file - group by import path
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
        // Type is from a different file - group it by its import path
        const importPath = typeImportPathGenerator(importName);
        // Skip if typeImportPathGenerator returns null/undefined (type not found)
        if (importPath) {
          if (!this.referencedTypesBySource.has(importPath)) {
            this.referencedTypesBySource.set(importPath, new Set());
          }
          this.referencedTypesBySource.get(importPath)!.add(importName);
        }
        // If importPath is null, the type is not found and we skip importing it
      } else {
        // No typeImportPathGenerator, assume same file
        this.referencedTypes.add(importName);
      }
    } else {
      // No sameFileTypes provided, assume all types are in the same file (legacy behavior)
      this.referencedTypes.add(importName);
    }
  }

  /**
   * Track a namespace that needs to be imported.
   * Namespaces are used for types like "Validation.CrossfieldReference".
   * Uses the TypeScript resolver to find where the namespace is exported from.
   */
  private trackNamespaceImport(namespaceName: string): void {
    this.namespaceImports.add(namespaceName);

    // Use the TypeScript resolver to find where the namespace is exported from
    if (this.tsResolver) {
      const result = this.tsResolver.resolveTypePath(namespaceName);
      if (result === "sameFile") {
        this.referencedTypes.add(namespaceName);
      } else if (result !== "notFound") {
        // Type is from a different file - group by import path
        if (!this.referencedTypesBySource.has(result)) {
          this.referencedTypesBySource.set(result, new Set());
        }
        this.referencedTypesBySource.get(result)!.add(namespaceName);
      } else {
        // Namespace not found - track for warning
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
   * Collect generic parameter symbols (e.g., T, U) from the type definition.
   * These should not be imported as they are type parameters, not concrete types.
   */
  private collectGenericParamSymbols(namedType: NamedType<ObjectType>): void {
    if (!isGenericNamedType(namedType)) {
      return;
    }

    for (const token of namedType.genericTokens) {
      this.genericParamSymbols.add(token.symbol);
    }
  }

  /**
   * Check if a type name appears to be a generic type parameter of the referenced type.
   * This detects cases like ref="Bar<AnyAsset>" where "AnyAsset" is Bar's type parameter,
   * not a concrete type to import.
   *
   * @param argName - The name of the type argument being checked
   * @param parentRef - The parent ref string that contains the generic usage
   * @returns true if argName appears to be a type parameter in parentRef
   */
  private isTypeParamOfRef(argName: string, parentRef: string): boolean {
    // Extract the generic parameters portion from the ref string
    // e.g., "Bar<AnyAsset>" -> "AnyAsset", "Map<K, V>" -> "K, V"
    const genericMatch = parentRef.match(/<(.+)>/);
    if (!genericMatch) {
      return false;
    }

    const genericPart = genericMatch[1];

    // Split by comma while respecting nested generics
    // and check if argName matches any parameter
    let depth = 0;
    let current = "";
    const params: string[] = [];

    for (const char of genericPart) {
      if (char === "<") {
        depth++;
        current += char;
      } else if (char === ">") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        params.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      params.push(current.trim());
    }

    // Check if argName matches any parameter exactly or is the base of a constrained param
    return params.some(
      (param) => param === argName || param.startsWith(`${argName} `),
    );
  }

  /**
   * Collect type references from generic parameter constraints and defaults.
   * This ensures types used in generics like "T extends Foo = Bar<X>" have
   * Foo, Bar, and X added to referencedTypes for import generation.
   */
  private collectTypesFromGenericTokens(
    namedType: NamedType<ObjectType>,
  ): void {
    if (!isGenericNamedType(namedType)) {
      return;
    }

    for (const token of namedType.genericTokens) {
      if (token.constraints) {
        this.collectTypeReferencesFromNode(token.constraints);
      }

      if (token.default) {
        this.collectTypeReferencesFromNode(token.default);
      }
    }
  }

  /**
   * Recursively collect type references from any NodeType.
   * This handles refs, arrays, unions, intersections, and objects.
   */
  private collectTypeReferencesFromNode(node: NodeType): void {
    if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);

      // Check if this is a namespaced type (e.g., "Validation.CrossfieldReference")
      const namespaced = parseNamespacedType(baseName);
      if (namespaced) {
        // Track the namespace for import and the member mapping
        this.trackNamespaceImport(namespaced.namespace);
        this.namespaceMemberMap.set(namespaced.member, baseName);
      } else if (
        !isBuiltinType(baseName) &&
        !this.genericParamSymbols.has(baseName)
      ) {
        // Skip built-in types and generic param symbols
        this.trackReferencedType(baseName);
      }

      // Also process generic arguments, but skip type parameters of the referenced type
      if (node.genericArguments) {
        for (const arg of node.genericArguments) {
          // Skip if this argument appears to be a type parameter of the referenced type
          // e.g., in ref="Bar<AnyAsset>", skip "AnyAsset" since it's Bar's type param
          if (isRefType(arg)) {
            const argName = extractBaseName(arg.ref);
            if (this.isTypeParamOfRef(argName, node.ref)) {
              continue;
            }
          }
          this.collectTypeReferencesFromNode(arg);
        }
      }
    } else if (isArrayType(node)) {
      this.collectTypeReferencesFromNode(node.elementType);
    } else if (isOrType(node)) {
      for (const variant of node.or) {
        this.collectTypeReferencesFromNode(variant);
      }
    } else if (isAndType(node)) {
      for (const part of node.and) {
        this.collectTypeReferencesFromNode(part);
      }
    } else if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Skip generic param symbols and built-in types in named types
        // Strip generic arguments for import purposes
        const importName = extractBaseName(node.name);
        if (
          !this.genericParamSymbols.has(importName) &&
          !isBuiltinType(importName)
        ) {
          // Use trackReferencedType to properly resolve import path
          this.trackReferencedType(importName);
        }
      }

      for (const prop of Object.values(node.properties)) {
        this.collectTypeReferencesFromNode(prop.node);
      }
    }
  }

  private generateBuilderClass(info: BuilderInfo): string {
    const {
      name,
      className,
      factoryName,
      objectType,
      assetType,
      genericParams,
    } = info;

    // Reset array properties for this builder
    this.arrayProperties.clear();

    const genericPart = genericParams ? `<${genericParams}>` : "";
    const genericUsage = extractGenericUsage(genericParams);

    // Generate interface methods
    const interfaceCode = this.generateInterfaceMethods(info);

    // Generate class methods
    const classMethods = this.generateClassMethods(info);

    // Generate defaults
    const defaults = this.generateDefaults(objectType, assetType);

    // Generate array properties metadata
    const arrayPropsCode =
      this.arrayProperties.size > 0
        ? `  private static readonly __arrayProperties__: ReadonlySet<string> = new Set([${Array.from(
            this.arrayProperties,
          )
            .map((p) => `"${p}"`)
            .join(", ")}]);\n`
        : "";

    // Build the class
    const classCode = `
${interfaceCode}

/**
 * A builder for ${name}
 */
export class ${className}${genericPart} extends FluentBuilderBase<${name}${genericUsage}> implements ${className}Methods${genericUsage}, FluentBuilder<${name}${genericUsage}, BaseBuildContext> {
  private static readonly defaults: Record<string, unknown> = ${defaults};
${arrayPropsCode}
${classMethods}

  /**
   * Builds the final ${name} object
   * @param context - Optional build context for nested builders
   */
  build(context?: BaseBuildContext): ${name}${genericUsage} {
    return this.buildWithDefaults(${className}.defaults, context);
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return createInspectMethod("${className}", this.values);
  }
}

/**
 * Creates a new ${name} builder
 * @param initial Optional initial values
 * @returns A fluent builder for ${name}
 */
export function ${factoryName}${genericPart}(initial?: Partial<${name}${genericUsage}>): ${className}${genericUsage} {
  return new ${className}${genericUsage}(initial);
}`;

    return classCode.trim();
  }

  private generateInterfaceMethods(info: BuilderInfo): string {
    const { className, objectType, genericParams, isAsset } = info;
    const genericUsage = extractGenericUsage(genericParams);

    // Collect all properties to generate methods for
    const properties = this.collectPropertiesForMethods(objectType, isAsset);

    const methods = properties
      .map(({ propName, propType, description }) => {
        const methodName = `with${toPascalCase(propName)}`;
        const paramType = this.transformType(propType, true);

        return `  /** ${description} */
  ${methodName}(value: ${paramType}): ${className}${genericUsage};`;
      })
      .join("\n");

    return `export interface ${className}Methods${genericParams ? `<${genericParams}>` : ""} {
${methods}
}`;
  }

  private collectPropertiesForMethods(
    objectType: ObjectType,
    isAsset: boolean,
  ): Array<{ propName: string; propType: NodeType; description: string }> {
    const properties: Array<{
      propName: string;
      propType: NodeType;
      description: string;
    }> = [];
    const seenProps = new Set<string>();

    // Add inherited Asset properties for asset types
    // Skip if the type explicitly declares the property (explicit takes precedence)
    if (isAsset && !("id" in objectType.properties)) {
      // Add id property - all assets have an id
      properties.push({
        propName: "id",
        propType: { type: "string" },
        description: "A unique identifier for this asset",
      });
      seenProps.add("id");
    }

    // Add properties from the object type
    for (const [propName, prop] of Object.entries(objectType.properties)) {
      // Skip if we've already seen this property (deduplication)
      if (seenProps.has(propName)) {
        continue;
      }
      seenProps.add(propName);
      properties.push({
        propName,
        propType: prop.node,
        description: prop.node.description || `Sets the ${propName} property`,
      });
    }

    return properties;
  }

  private generateClassMethods(info: BuilderInfo): string {
    const { className, objectType, genericParams, isAsset } = info;
    const genericUsage = extractGenericUsage(genericParams);

    // Collect all properties to generate methods for
    const properties = this.collectPropertiesForMethods(objectType, isAsset);

    return properties
      .map(({ propName, propType, description }) => {
        const methodName = `with${toPascalCase(propName)}`;
        const paramType = this.transformType(propType, true);

        // Track array properties (including union types that contain arrays)
        if (containsArrayType(propType)) {
          this.arrayProperties.add(propName);
        }

        return `  /** ${description} */
  ${methodName}(value: ${paramType}): ${className}${genericUsage} {
    return this.set("${propName}", value);
  }`;
      })
      .join("\n\n");
  }

  private generateDefaults(objectType: ObjectType, assetType?: string): string {
    const defaults: Record<string, unknown> = {};

    // Add asset type default if this is an asset
    if (assetType) {
      defaults["type"] = assetType;
    }

    // Add default ID for assets (types that extend Asset)
    if (objectType.extends?.ref.startsWith("Asset")) {
      defaults["id"] = "";
    }
    // Also add default ID for non-Asset types that have an 'id' property
    // This enables ID auto-generation for nested object types
    else if ("id" in objectType.properties) {
      defaults["id"] = "";
    }

    // Add const defaults from properties
    for (const [propName, prop] of Object.entries(objectType.properties)) {
      if (isPrimitiveConst(prop.node)) {
        defaults[propName] = prop.node.const;
      }
    }

    return JSON.stringify(defaults);
  }

  /**
   * Transform a type for use in generic constraints and defaults.
   * Unlike transformType(), this returns raw type names without FluentBuilder unions,
   * since constraints define type bounds, not parameter types that accept builders.
   *
   * @param node - The type node to transform
   * @returns The raw TypeScript type string
   */
  private transformTypeForConstraint(node: NodeType): string {
    if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);

      // Check if this is a namespaced type (e.g., "Validation.CrossfieldReference")
      const namespaced = parseNamespacedType(baseName);
      if (namespaced) {
        // Track the namespace for import and the member mapping
        this.trackNamespaceImport(namespaced.namespace);
        this.namespaceMemberMap.set(namespaced.member, baseName);
      } else if (baseName === "Asset" || node.ref.startsWith("Asset<")) {
        // Track Asset import when used in generic constraints
        this.needsAssetImport = true;
      } else if (
        !isBuiltinType(baseName) &&
        !this.genericParamSymbols.has(baseName)
      ) {
        // Track non-builtin, non-generic-param types for import
        this.trackReferencedType(baseName);
      }

      // Resolve to full qualified name if it's a namespace member
      const resolvedName = this.resolveTypeName(baseName);

      // Handle generic arguments
      if (node.genericArguments && node.genericArguments.length > 0) {
        const args = node.genericArguments.map((a) =>
          this.transformTypeForConstraint(a),
        );
        return `${resolvedName}<${args.join(", ")}>`;
      }

      // Preserve embedded generics if present in the ref string
      if (node.ref.includes("<")) {
        // Also resolve the base name in case it's a namespace member
        return (
          this.resolveTypeName(extractBaseName(node.ref)) +
          node.ref.substring(node.ref.indexOf("<"))
        );
      }

      return resolvedName;
    }

    if (isObjectType(node) && isNamedType(node)) {
      // Track Asset import if used in constraint
      if (node.name === "Asset") {
        this.needsAssetImport = true;
      } else if (
        !isBuiltinType(node.name) &&
        !this.genericParamSymbols.has(node.name)
      ) {
        // Track non-builtin, non-generic-param types for import
        this.trackReferencedType(node.name);
      }
      // Just the type name, no FluentBuilder union
      // Resolve to full qualified name if it's a namespace member
      return this.resolveTypeName(node.name);
    }

    if (isArrayType(node)) {
      const elementType = this.transformTypeForConstraint(node.elementType);
      return `Array<${elementType}>`;
    }

    if (isOrType(node)) {
      const variants = node.or.map((v) => this.transformTypeForConstraint(v));
      return variants.join(" | ");
    }

    if (isAndType(node)) {
      const parts = node.and.map((p) => this.transformTypeForConstraint(p));
      return parts.join(" & ");
    }

    // For primitives, use standard transformation (no FluentBuilder needed anyway)
    return this.transformType(node, false);
  }

  /**
   * Transform an XLR type to a TypeScript type string
   * This is the core recursive transformation that adds TaggedTemplateValue support
   */
  private transformType(node: NodeType, forParameter = false): string {
    // Primitive types get TaggedTemplateValue support
    if (isStringType(node)) {
      if (isPrimitiveConst(node)) {
        return `"${node.const}"`;
      }
      return forParameter ? "string | TaggedTemplateValue<string>" : "string";
    }

    if (isNumberType(node)) {
      if (isPrimitiveConst(node)) {
        return `${node.const}`;
      }
      return forParameter ? "number | TaggedTemplateValue<number>" : "number";
    }

    if (isBooleanType(node)) {
      if (isPrimitiveConst(node)) {
        return `${node.const}`;
      }
      return forParameter
        ? "boolean | TaggedTemplateValue<boolean>"
        : "boolean";
    }

    // Reference types
    if (isRefType(node)) {
      return this.transformRefType(node, forParameter);
    }

    // Array types
    if (isArrayType(node)) {
      const elementType = this.transformType(node.elementType, forParameter);
      return `Array<${elementType}>`;
    }

    // Union types
    if (isOrType(node)) {
      const variants = node.or.map((v) => this.transformType(v, forParameter));
      return variants.join(" | ");
    }

    // Intersection types
    if (isAndType(node)) {
      const parts = node.and.map((p) => this.transformType(p, forParameter));
      return parts.join(" & ");
    }

    // Record types - key type should NOT have TaggedTemplateValue since
    // TypeScript Record keys can only be string | number | symbol
    if (isRecordType(node)) {
      const keyType = this.transformType(node.keyType, false);
      const valueType = this.transformType(node.valueType, forParameter);
      return `Record<${keyType}, ${valueType}>`;
    }

    // Object types - transform properties recursively
    // Any nested object can accept either a raw object OR a FluentBuilder that produces it
    if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Named type - accept raw type or a builder that produces it
        // Resolve to full qualified name if it's a namespace member
        const typeName = this.resolveTypeName(node.name);
        return `${typeName} | FluentBuilder<${typeName}, BaseBuildContext>`;
      }

      // Anonymous object - accept inline type or a builder that produces it
      const inlineType = this.generateInlineObjectType(node, forParameter);
      return `${inlineType} | FluentBuilder<${inlineType}, BaseBuildContext>`;
    }

    // Handle other primitive types
    if (node.type === "null") return "null";
    if (node.type === "undefined") return "undefined";
    if (node.type === "any") return "any";
    if (node.type === "unknown") return "unknown";
    if (node.type === "never") return "never";
    if (node.type === "void") return "void";

    // Default fallback
    return "unknown";
  }

  private transformRefType(node: RefType, forParameter: boolean): string {
    const ref = node.ref;

    // AssetWrapper - transform to accept Asset or FluentBuilder
    if (ref.startsWith("AssetWrapper")) {
      this.needsAssetImport = true;
      return "Asset | FluentBuilder<Asset, BaseBuildContext>";
    }

    // Expression - allow TaggedTemplateValue
    if (ref === "Expression") {
      return forParameter ? "string | TaggedTemplateValue<string>" : "string";
    }

    // Binding - allow TaggedTemplateValue
    if (ref === "Binding") {
      return forParameter ? "string | TaggedTemplateValue<string>" : "string";
    }

    // Asset reference
    if (ref === "Asset" || ref.startsWith("Asset<")) {
      this.needsAssetImport = true;
      return "Asset";
    }

    // Other references - user-defined types that may be objects
    // Accept both raw type or FluentBuilder that produces it
    const baseName = extractBaseName(ref);
    // Resolve to full qualified name if it's a namespace member (e.g., "CrossfieldReference" -> "Validation.CrossfieldReference")
    const resolvedName = this.resolveTypeName(baseName);

    // Handle structured generic arguments
    if (node.genericArguments && node.genericArguments.length > 0) {
      const args = node.genericArguments.map((a) =>
        this.transformType(a, forParameter),
      );
      const fullType = `${resolvedName}<${args.join(", ")}>`;
      return `${fullType} | FluentBuilder<${fullType}, BaseBuildContext>`;
    }

    // If ref contains embedded generics but genericArguments is empty, preserve them
    // This handles cases like "SimpleModifier<'format'>" where the type argument
    // is encoded in the ref string rather than in genericArguments array
    if (ref.includes("<")) {
      // Also resolve the base name in case it's a namespace member
      const resolvedRef =
        this.resolveTypeName(extractBaseName(ref)) +
        ref.substring(ref.indexOf("<"));
      return `${resolvedRef} | FluentBuilder<${resolvedRef}, BaseBuildContext>`;
    }

    return `${resolvedName} | FluentBuilder<${resolvedName}, BaseBuildContext>`;
  }

  private generateInlineObjectType(
    node: ObjectType,
    forParameter: boolean,
  ): string {
    const props = Object.entries(node.properties)
      .map(([propName, prop]) => {
        const propType = this.transformType(prop.node, forParameter);
        const optional = prop.required ? "" : "?";
        // Quote property names that contain special characters (like hyphens)
        const quotedName = this.needsQuoting(propName)
          ? `"${propName}"`
          : propName;
        return `${quotedName}${optional}: ${propType}`;
      })
      .join("; ");

    return `{ ${props} }`;
  }

  /**
   * Check if a property name needs to be quoted in TypeScript.
   * Property names with special characters like hyphens must be quoted.
   */
  private needsQuoting(name: string): boolean {
    // Valid unquoted property names match JavaScript identifier rules
    // Must start with letter, underscore, or dollar sign
    // Can contain letters, digits, underscores, or dollar signs
    return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  /**
   * Get the full qualified name for a type if it's a namespace member.
   * For example, "CrossfieldReference" -> "Validation.CrossfieldReference"
   * if we've seen "Validation.CrossfieldReference" in the source.
   * Returns the original name if no namespace mapping exists.
   */
  private resolveTypeName(typeName: string): string {
    return this.namespaceMemberMap.get(typeName) ?? typeName;
  }
}

/**
 * Result of builder generation including warnings
 */
export interface GeneratorResult {
  /** Generated TypeScript code */
  code: string;
  /** Types that need to be exported in their source files */
  unexportedTypes: UnexportedTypeInfo[];
}

/**
 * Generate fluent builder code from a NamedType<ObjectType>
 * @param namedType - The XLR NamedType to generate a builder for
 * @param config - Optional generator configuration
 * @returns Generated TypeScript code for the fluent builder
 */
export function generateFluentBuilder(
  namedType: NamedType<ObjectType>,
  config: GeneratorConfig = {},
): string {
  const generator = new FluentBuilderGenerator(namedType, config);
  return generator.generate();
}

/**
 * Generate fluent builder code with warnings about unexported types.
 * Use this when you want to get detailed information about types that need
 * to be exported in their source files.
 *
 * @param namedType - The XLR NamedType to generate a builder for
 * @param config - Optional generator configuration
 * @returns Generated code and list of types that need to be exported
 */
export function generateFluentBuilderWithWarnings(
  namedType: NamedType<ObjectType>,
  config: GeneratorConfig = {},
): GeneratorResult {
  const generator = new FluentBuilderGenerator(namedType, config);
  const code = generator.generate();
  const unexportedTypes = generator.getUnexportedTypes();
  return { code, unexportedTypes };
}
