import {
  SourceFile,
  Project,
  SyntaxKind,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  EnumDeclaration,
} from "ts-morph";
import type { PropertyInfo, ResolvedSymbol } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type { AnalysisOptions } from "../analyzers/TypeAnalyzer.js";
import { ExternalModuleResolver } from "./strategies/ExternalModuleResolver.js";
import { TypeGuards } from "../utils/TypeGuards.js";
import { PropertyFactory } from "../factories/PropertyFactory.js";
import { logAnalysisWarning } from "../analyzers/utils.js";

/** Result of external type resolution. */
export interface ExternalTypeResolutionResult {
  /** The resolved property information */
  property: PropertyInfo | null;
  /** Whether the type was successfully resolved */
  resolved: boolean;
  /** The module that contained the type (if resolved) */
  moduleSpecifier?: string;
  /** Error message if resolution failed */
  error?: string;
}

/** Enhanced resolver for external module types with improved architecture. */
export class ExternalTypeResolver {
  private readonly externalResolver: ExternalModuleResolver;

  constructor(private readonly project: Project) {
    this.externalResolver = new ExternalModuleResolver(project);
  }

  /** Resolve an external type from imported modules. */
  resolve(config: {
    typeName: string;
    name: string;
    context: ExtractorContext;
    options?: AnalysisOptions;
  }): ExternalTypeResolutionResult {
    const { typeName, name, context, options = {} } = config;
    const sourceFile = context.getSourceFile();

    try {
      // Find the import declaration that contains this type
      const importResult = this.findImportForType(typeName, sourceFile);
      if (!importResult) {
        return {
          property: null,
          resolved: false,
          error: `No import found for type: ${typeName}`,
        };
      }

      // Resolve the external type using the external module resolver
      const resolvedSymbol = this.externalResolver.resolve({
        symbolName: typeName,
        moduleSpecifier: importResult.moduleSpecifier,
        sourceFile,
        isTypeOnlyImport: importResult.isTypeOnly,
      });

      if (!resolvedSymbol) {
        // Add dependency even if we can't resolve it
        this.addExternalDependency(
          context,
          importResult.moduleSpecifier,
          typeName,
        );

        return {
          property: null,
          resolved: false,
          moduleSpecifier: importResult.moduleSpecifier,
          error: `Could not resolve external type: ${typeName} from ${importResult.moduleSpecifier}`,
        };
      }

      // Add dependency to context
      context.addDependency({
        target: resolvedSymbol.target,
        dependency: typeName,
      });

      // Analyze the resolved declaration
      const property = this.analyzeResolvedDeclaration({
        name,
        typeName,
        resolvedSymbol,
        context,
        options,
      });

      return {
        property,
        resolved: property !== null,
        moduleSpecifier: importResult.moduleSpecifier,
      };
    } catch (error) {
      logAnalysisWarning(
        "ExternalTypeResolver",
        `Error resolving external type: ${typeName}`,
        { error: error instanceof Error ? error.message : String(error) },
      );

      return {
        property: PropertyFactory.createFallbackProperty({
          name,
          typeAsString: typeName,
          options,
        }),
        resolved: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Find the import declaration that contains the specified type. */
  private findImportForType(
    typeName: string,
    sourceFile: SourceFile,
  ): { moduleSpecifier: string; isTypeOnly: boolean } | null {
    for (const importDecl of sourceFile.getImportDeclarations()) {
      const moduleSpecifier = importDecl.getModuleSpecifierValue();

      // Skip relative imports (should be handled by local resolution)
      if (TypeGuards.isRelativeImport(moduleSpecifier)) {
        continue;
      }

      // Check if this import contains the type we're looking for
      if (TypeGuards.importContainsSymbol(importDecl, typeName)) {
        return {
          moduleSpecifier,
          isTypeOnly: importDecl.isTypeOnly(),
        };
      }
    }

    return null;
  }

  /** Analyze a resolved external declaration. */
  private analyzeResolvedDeclaration(config: {
    name: string;
    typeName: string;
    resolvedSymbol: ResolvedSymbol;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    const { name, typeName, resolvedSymbol, context, options } = config;
    const { declaration } = resolvedSymbol;

    // Handle different declaration types using proper type guards
    if (declaration.getKind() === SyntaxKind.InterfaceDeclaration) {
      return this.analyzeExternalInterface({
        name,
        typeName,
        declaration: declaration as InterfaceDeclaration,
        context,
        options,
      });
    }

    if (declaration.getKind() === SyntaxKind.TypeAliasDeclaration) {
      return this.analyzeExternalTypeAlias({
        name,
        typeName,
        declaration: declaration as TypeAliasDeclaration,
        context,
        options,
      });
    }

    if (declaration.getKind() === SyntaxKind.EnumDeclaration) {
      return this.analyzeExternalEnum({
        name,
        typeName,
        declaration: declaration as EnumDeclaration,
        options,
      });
    }

    logAnalysisWarning(
      "ExternalTypeResolver",
      `Unsupported external declaration type: ${declaration.getKindName()}`,
      { typeName, declarationKind: declaration.getKindName() },
    );

    return null;
  }

  /** Analyze an external interface declaration. */
  private analyzeExternalInterface(config: {
    name: string;
    typeName: string;
    declaration: InterfaceDeclaration;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo {
    // For external interfaces, create a simple object property
    // The actual property extraction would be handled by the main analyzer
    return PropertyFactory.createObjectProperty({
      name: config.name,
      typeAsString: config.typeName,
      properties: [], // Empty properties for external types - these would be resolved later
      options: config.options,
      documentation: `External interface: ${config.typeName}`,
    });
  }

  /** Analyze an external type alias declaration. */
  private analyzeExternalTypeAlias(config: {
    name: string;
    typeName: string;
    declaration: TypeAliasDeclaration;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    // For external type aliases, create a placeholder that can be expanded later
    return PropertyFactory.createObjectProperty({
      name: config.name,
      typeAsString: config.typeName,
      properties: [],
      options: config.options,
      documentation: `External type alias: ${config.typeName}`,
    });
  }

  /** Analyze an external enum declaration. */
  private analyzeExternalEnum(config: {
    name: string;
    typeName: string;
    declaration: EnumDeclaration;
    options: AnalysisOptions;
  }): PropertyInfo {
    // Extract enum values if possible
    let values: (string | number)[] = [];
    try {
      values = config.declaration
        .getMembers()
        .map((member) => member.getValue())
        .filter((val) => typeof val === "string" || typeof val === "number");
    } catch (error) {
      logAnalysisWarning(
        "ExternalTypeResolver",
        `Could not extract enum values from external enum: ${config.typeName}`,
        { error: error instanceof Error ? error.message : String(error) },
      );
      // Use a default placeholder value
      values = ["<external-enum-value>"];
    }

    return PropertyFactory.createEnumProperty({
      name: config.name,
      enumName: config.typeName,
      values,
      options: config.options,
      documentation: `External enum: ${config.typeName}`,
    });
  }

  /** Add an external dependency even when resolution fails. */
  private addExternalDependency(
    context: ExtractorContext,
    moduleSpecifier: string,
    dependencyName: string,
  ): void {
    context.addDependency({
      target: { kind: "module", name: moduleSpecifier },
      dependency: dependencyName,
    });
  }
}
