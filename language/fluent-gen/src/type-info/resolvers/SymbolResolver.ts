import { Project, SourceFile, TypeNode, TypeAliasDeclaration } from "ts-morph";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  PropertyInfo,
  ResolvedSymbol,
  ResolutionContext,
} from "../types.js";
import { SymbolCache } from "./cache/SymbolCache.js";
import { TypeAnalyzer } from "./utils/TypeAnalyzer.js";
import { LocalDeclarationStrategy } from "./strategies/LocalDeclarationStrategy.js";
import { ImportResolutionStrategy } from "./strategies/ImportResolutionStrategy.js";
import { ExternalModuleResolver } from "./strategies/ExternalModuleResolver.js";
import type { ResolutionStrategy } from "./strategies/ResolutionStrategy.js";

/** Enhanced SymbolResolver with clean architecture and better separation of concerns */
export class SymbolResolver {
  private readonly cache = new SymbolCache();
  private readonly strategies: ResolutionStrategy[];
  private readonly externalResolver: ExternalModuleResolver;
  private readonly project: Project;

  constructor(private readonly context: ExtractorContext) {
    this.project = context.getProject();

    // Initialize external resolver
    this.externalResolver = new ExternalModuleResolver(this.project);

    // Initialize resolution strategies in priority order
    const localStrategy = new LocalDeclarationStrategy();
    this.strategies = [
      localStrategy,
      new ImportResolutionStrategy(
        this.project,
        localStrategy,
        this.externalResolver,
      ),
    ];
  }

  /** Resolve a symbol name to its declaration with caching */
  resolve(symbolName: string, sourceFile?: SourceFile): ResolvedSymbol | null {
    const file = sourceFile || this.context.getSourceFile();

    // Check cache first
    const cached = this.cache.get(symbolName, file);
    if (cached !== undefined) {
      return cached;
    }

    // Perform resolution
    const result = this.performResolution(symbolName, file);

    // Cache the result
    this.cache.set(symbolName, file, result);

    return result;
  }

  /** Perform the actual symbol resolution using strategies */
  private performResolution(
    symbolName: string,
    sourceFile: SourceFile,
  ): ResolvedSymbol | null {
    const context: ResolutionContext = { symbolName, sourceFile };

    // Try each strategy in order
    for (const strategy of this.strategies) {
      if (strategy.canResolve(context)) {
        try {
          const result = strategy.resolve(context);
          if (result) {
            return result;
          }
        } catch (error) {
          console.debug(
            `Strategy ${strategy.name} failed for ${symbolName}:`,
            error,
          );
        }
      }
    }

    // Last resort: search all project files
    return this.searchAllProjectFiles(symbolName, sourceFile);
  }

  /** Search all project files for a symbol (fallback strategy) */
  private searchAllProjectFiles(
    symbolName: string,
    currentFile: SourceFile,
  ): ResolvedSymbol | null {
    const localStrategy = new LocalDeclarationStrategy();

    for (const file of this.project.getSourceFiles()) {
      if (file === currentFile) continue;

      const result = localStrategy.resolve({
        symbolName,
        sourceFile: file,
      });

      if (result) {
        return {
          ...result,
          target: {
            kind: "local",
            filePath: file.getFilePath(),
            name: symbolName,
          },
          isLocal: false,
        };
      }
    }

    return null;
  }

  /** Get the external module name for a symbol if it cannot be resolved */
  getExternalModuleName(
    symbolName: string,
    sourceFile?: SourceFile,
  ): string | null {
    const file = sourceFile || this.context.getSourceFile();

    for (const importDecl of file.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Skip relative imports
      if (moduleSpecifier.startsWith(".")) continue;

      const structure = importDecl.getStructure();
      const hasSymbol =
        (structure.namedImports &&
          Array.isArray(structure.namedImports) &&
          structure.namedImports.some(
            (imp: unknown) =>
              typeof imp === "object" &&
              imp !== null &&
              "name" in imp &&
              (imp as { name: string }).name === symbolName,
          )) ||
        structure.defaultImport === symbolName;

      if (hasSymbol) {
        // Try to resolve it first
        const resolved = this.externalResolver.resolve({
          symbolName,
          moduleSpecifier,
          sourceFile: file,
          isTypeOnlyImport: importDecl.isTypeOnly(),
        });

        // Only return module name if we couldn't resolve it
        return resolved ? null : moduleSpecifier;
      }
    }

    return null;
  }

  /** Type analysis methods using TypeAnalyzer utility */

  isGenericType(typeNode: TypeNode): boolean {
    return TypeAnalyzer.isGenericType(typeNode);
  }

  extractGenericArguments(typeNode: TypeNode): string[] {
    return TypeAnalyzer.getGenericArgumentsFromNode(typeNode);
  }

  getBaseTypeName(typeNode: TypeNode): string {
    return TypeAnalyzer.getBaseTypeName(typeNode);
  }

  isPrimitiveTypeAlias(declaration: TypeAliasDeclaration): boolean {
    return TypeAnalyzer.isPrimitiveTypeAlias(declaration);
  }

  getPrimitiveFromTypeAlias(
    declaration: TypeAliasDeclaration,
  ): "string" | "number" | "boolean" | null {
    return TypeAnalyzer.getPrimitiveFromTypeAlias(declaration);
  }

  /** Expand a type alias to get its underlying structure */
  expandTypeAlias(
    declaration: TypeAliasDeclaration,
    visitedTypes: Set<string> = new Set<string>(),
  ): PropertyInfo | null {
    const typeName = declaration.getName();

    // Prevent infinite recursion
    if (visitedTypes.has(typeName)) {
      return null;
    }
    visitedTypes.add(typeName);

    try {
      const typeNode = declaration.getTypeNode();
      if (!typeNode) return null;

      return {
        kind: "non-terminal",
        type: "object",
        name: typeName,
        typeAsString: typeNode.getText(),
        properties: [],
      };
    } finally {
      visitedTypes.delete(typeName);
    }
  }

  /** Cache management methods */

  clearCache(): void {
    this.cache.clear();
  }
}
