export {
  FLUENT_BUILDER_SYMBOL,
  BranchTypes,
  StorageKeys,
  PropertyKeys,
  type NestedContextParams,
  type NestedContextGenerator,
  type AssetMetadata,
  type BaseBuildContext,
  type FluentBuilder,
  type AnyAssetBuilder,
  type MixedArrayMetadata,
  type TemplateMetadata,
  type IdBranch,
  type SlotBranch,
  type ArrayItemBranch,
  type TemplateBranch,
  type SwitchBranch,
  type CustomBranch,
  type ValuePath,
  type SwitchMetadata,
  type ConditionalValue,
  type FluentPartial,
  type FluentPartialValue,
} from "./types";

export {
  isFluentBuilder,
  isBuilderArray,
  isPlainObject,
  isAsset,
  isAssetWrapper,
  isAssetWrapperWithAsset,
  needsAssetWrapper,
  isAssetWrapperValue,
  isSwitchResult,
  isStringOrUndefined,
} from "./guards";

export {
  determineSlotName,
  generateAssetId,
  genId,
  peekId,
  resetGlobalIdSet,
  globalIdRegistry,
  createIdRegistry,
  IDRegistry,
} from "./id/generator";

export {
  createNestedContext,
  createTemplateContext,
  createSwitchContext,
} from "./context";

export {
  extractValue,
  resolveValue,
  resolveAndWrapAsset,
} from "./resolution/value-resolver";

export { FluentBuilderBase } from "./fluent-builder-base";

export { createInspectMethod } from "./utils";

export {
  ErrorCodes,
  FluentError,
  createFluentError,
  type ErrorCode,
} from "./errors";
