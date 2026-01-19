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
} from "./generator";
export * from "./utils";
export { TypeDefinitionFinder } from "./type-definition-finder";
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
