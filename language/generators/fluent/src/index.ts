/**
 * @player-tools/fluent-generator
 *
 * Generates fluent builders from XLR types for Player-UI assets.
 */

export {
  generateFluentBuilder,
  generateFluentBuilderWithWarnings,
  type GeneratorConfig,
  type BuilderInfo,
  type GeneratorResult,
  type UnexportedTypeInfo,
  type TypeScriptContext,
} from "./generator";
export * from "./utils";
export {
  TsMorphTypeDefinitionFinder,
  type UnexportedTypeLocation,
} from "./ts-morph-type-finder";
export {
  createTypeScriptResolver,
  isBuiltInDeclarationPath,
  isDeclarationExported,
  type TypeResolutionResult,
} from "./type-resolver";
export {
  isNodeModulesPath,
  extractPackageNameFromPath,
  createRelativeImportPath,
  resolveRelativeImportPath,
} from "./path-utils";
export {
  categorizeTypes,
  groupExternalTypesByPackage,
  type TypeCategories,
  type CategorizerOptions,
} from "./type-categorizer";
