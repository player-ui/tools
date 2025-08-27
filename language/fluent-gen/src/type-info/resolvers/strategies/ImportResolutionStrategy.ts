import {
  Project,
  SourceFile,
  ImportDeclaration,
  ImportSpecifier,
} from "ts-morph";
import type { ResolvedSymbol, ResolutionContext } from "../../types.js";
import type { ResolutionStrategy } from "./ResolutionStrategy.js";
import { FileSystemUtils } from "../utils/FileSystemUtils.js";
import { LocalDeclarationStrategy } from "./LocalDeclarationStrategy.js";
import type { ExternalModuleResolver } from "../strategies/ExternalModuleResolver.js";

export class ImportResolutionStrategy implements ResolutionStrategy {
  name = "ImportResolution";

  constructor(
    private readonly project: Project,
    private readonly localStrategy: LocalDeclarationStrategy,
    private readonly externalResolver: ExternalModuleResolver,
  ) {}

  canResolve(context: ResolutionContext): boolean {
    // Check if the symbol is imported
    return context.sourceFile
      .getImportDeclarations()
      .some((importDecl: ImportDeclaration) =>
        this.isSymbolImported(context.symbolName, importDecl.getStructure()),
      );
  }

  resolve(context: ResolutionContext): ResolvedSymbol | null {
    for (const importDecl of context.sourceFile.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      if (
        !this.isSymbolImported(context.symbolName, importDecl.getStructure())
      ) {
        continue;
      }

      // Handle relative imports
      if (moduleSpecifier.startsWith(".")) {
        const result = this.resolveLocalImport(
          context.symbolName,
          moduleSpecifier,
          context.sourceFile,
        );
        if (result) return result;
      } else {
        // Handle external module imports
        const isTypeOnly =
          importDecl.isTypeOnly() ||
          importDecl
            .getNamedImports()
            .some(
              (namedImport: ImportSpecifier) =>
                namedImport.getName() === context.symbolName &&
                namedImport.isTypeOnly(),
            );

        return this.resolveExternalImport(
          context.symbolName,
          moduleSpecifier,
          context.sourceFile,
          isTypeOnly,
        );
      }
    }

    return null;
  }

  private isSymbolImported(
    symbolName: string,
    importStructure: ReturnType<
      typeof import("ts-morph").ImportDeclaration.prototype.getStructure
    >,
  ): boolean {
    // Check named imports
    if (
      importStructure.namedImports &&
      Array.isArray(importStructure.namedImports)
    ) {
      return importStructure.namedImports.some(
        (imp: unknown) =>
          typeof imp === "object" &&
          imp !== null &&
          "name" in imp &&
          (imp as { name: string }).name === symbolName,
      );
    }

    // Check default import
    return importStructure.defaultImport === symbolName;
  }

  private resolveLocalImport(
    symbolName: string,
    moduleSpecifier: string,
    sourceFile: SourceFile,
  ): ResolvedSymbol | null {
    try {
      const resolvedPath = FileSystemUtils.resolveRelativeImport(
        moduleSpecifier,
        sourceFile.getFilePath(),
      );

      const importedFile = this.project.addSourceFileAtPath(resolvedPath);
      const declaration = this.localStrategy.resolve({
        symbolName,
        sourceFile: importedFile,
      })?.declaration;

      if (declaration) {
        return {
          declaration,
          target: { kind: "local", filePath: resolvedPath, name: symbolName },
          isLocal: false,
        };
      }
    } catch (error) {
      console.debug(
        `Failed to resolve local import: ${moduleSpecifier}`,
        error,
      );
    }

    return null;
  }

  private resolveExternalImport(
    symbolName: string,
    moduleSpecifier: string,
    sourceFile: SourceFile,
    isTypeOnly: boolean,
  ): ResolvedSymbol | null {
    try {
      return this.externalResolver.resolve({
        symbolName,
        moduleSpecifier,
        sourceFile,
        isTypeOnlyImport: isTypeOnly,
      });
    } catch (error) {
      console.warn(
        `Failed to resolve external module ${moduleSpecifier} for symbol ${symbolName}:`,
        error,
      );
      return null;
    }
  }
}
