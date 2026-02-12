import type { ObjectType, NamedType } from "@player-tools/xlr";
import { isGenericNamedType } from "@player-tools/xlr-utils";
import {
  toFactoryName,
  toBuilderClassName,
  getAssetTypeFromExtends,
  type TypeRegistry,
} from "./utils";
import {
  type TypeScriptContext,
  type UnexportedTypeInfo,
} from "./type-resolver";
import { TypeCollector } from "./type-collector";
import { TypeTransformer } from "./type-transformer";
import {
  ImportGenerator,
  type ImportGeneratorConfig,
} from "./import-generator";
import {
  BuilderClassGenerator,
  type BuilderInfo,
} from "./builder-class-generator";

// Re-export types for public API
export type { TypeScriptContext, UnexportedTypeInfo } from "./type-resolver";
export type { BuilderInfo } from "./builder-class-generator";

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
  /**
   * Type registry for resolving nested interface references.
   * Maps type names to their XLR ObjectType definitions.
   * Used to find AssetWrapper paths in nested interfaces.
   */
  typeRegistry?: TypeRegistry;
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
 * Generates fluent builder TypeScript code from XLR types.
 * This class orchestrates the type collection, transformation, and code generation.
 */
export class FluentBuilderGenerator {
  private readonly namedType: NamedType<ObjectType>;
  private readonly config: GeneratorConfig;

  /** Import generator handles import tracking and generation */
  private readonly importGenerator: ImportGenerator;

  /** Type transformer handles XLR to TypeScript type conversion */
  private readonly typeTransformer: TypeTransformer;

  /** Type collector handles collecting type references */
  private readonly typeCollector: TypeCollector;

  /** Builder class generator handles class code generation */
  private readonly builderClassGenerator: BuilderClassGenerator;

  /** Map short type names to their full qualified names */
  private readonly namespaceMemberMap = new Map<string, string>();

  constructor(namedType: NamedType<ObjectType>, config: GeneratorConfig = {}) {
    this.namedType = namedType;
    this.config = config;

    // Create import generator config
    const importConfig: ImportGeneratorConfig = {
      fluentImportPath: config.fluentImportPath,
      typesImportPath: config.typesImportPath,
      tsContext: config.tsContext,
      typeImportPathGenerator: config.typeImportPathGenerator,
      sameFileTypes: config.sameFileTypes,
      externalTypes: config.externalTypes,
      typeRegistry: config.typeRegistry,
    };

    // Initialize the import generator
    this.importGenerator = new ImportGenerator(importConfig);

    // Initialize the type transformer with the import generator as context
    this.typeTransformer = new TypeTransformer(this.importGenerator);

    // Initialize the type collector with the import generator as tracker
    this.typeCollector = new TypeCollector(
      this.importGenerator,
      this.importGenerator.getGenericParamSymbols(),
      namedType.name,
      this.importGenerator.getNamespaceMemberMap(),
      config.typeRegistry,
    );

    // Initialize the builder class generator with the type transformer and type registry
    this.builderClassGenerator = new BuilderClassGenerator(
      this.typeTransformer,
      config.typeRegistry,
    );
  }

  /**
   * Get list of types that exist but need to be exported.
   * Call this after generate() to get warnings for the user.
   */
  getUnexportedTypes(): UnexportedTypeInfo[] {
    return this.importGenerator.getUnexportedTypes();
  }

  /**
   * Get list of types that couldn't be resolved at all.
   * These types are used in the generated code but won't be imported,
   * causing type errors. Often these are namespaced types (e.g., Validation.CrossfieldReference).
   */
  getUnresolvedTypes(): string[] {
    return this.importGenerator.getUnresolvedTypes();
  }

  /**
   * Generate the builder code
   */
  generate(): string {
    // Collect generic parameter symbols first so we can exclude them from imports
    // This MUST happen before createBuilderInfo since transformTypeForConstraint needs it
    this.typeCollector.collectGenericParamSymbols(this.namedType);

    const mainBuilder = this.createBuilderInfo(this.namedType);

    // Collect types from generic constraints/defaults for import generation
    this.typeCollector.collectTypesFromGenericTokens(this.namedType);

    // Collect all referenced types for imports (no nested builders are generated)
    this.typeCollector.collectReferencedTypes(this.namedType);

    // Generate main builder class (this also sets needsAssetImport flag)
    const mainBuilderCode =
      this.builderClassGenerator.generateBuilderClass(mainBuilder);

    // Generate imports after builder code so we know what imports are needed
    const imports = this.importGenerator.generateImports(mainBuilder.name);

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
            const constraintType =
              this.typeTransformer.transformTypeForConstraint(t.constraints);
            // Skip 'any' constraints - these represent unconstrained generics in TypeScript
            // Adding "extends any" is redundant and reduces type safety
            if (constraintType !== "any") {
              param += ` extends ${constraintType}`;
            }
          }
          if (t.default) {
            param += ` = ${this.typeTransformer.transformTypeForConstraint(t.default)}`;
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
