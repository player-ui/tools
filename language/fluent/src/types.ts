import type { Asset } from "@player-ui/types";
import type { TaggedTemplateValue } from "./core/tagged-template";
import type {
  BaseBuildContext,
  FLUENT_BUILDER_SYMBOL,
} from "./core/base-builder";

type AnyAssetBuilder<C extends BaseBuildContext = BaseBuildContext> = {
  readonly [FLUENT_BUILDER_SYMBOL]: true;
  build(context?: C): Asset;
  peek(key: string): unknown;
  has(key: string): boolean;
};

/**
 * Options for extracting type information
 */
export interface ExtractTypeInfoOptions {
  /** Path to the asset file */
  assetPath: string;
  /** Name of the interface to extract */
  interfaceName: string;
}

/**
 * Enhanced generic parameter information
 */
export interface GenericParameter {
  /** Name of the generic parameter */
  name: string;
  /** Type or constraint of the parameter */
  type: string;
  /** Constraint clause (extends X) */
  constraint?: string;
  /** Default type */
  default?: string;
  /** Position in the parameter list */
  position: number;
}

/**
 * Information about a property in a type
 */
export interface PropertyInfo {
  /** Name of the property */
  name: string;
  /** Type of the property */
  type: string;
  /** JSDoc comment for the property */
  jsDoc?: string;
  /** Whether the property is optional */
  isOptional?: boolean;
  /** Whether the property is readonly */
  isReadonly?: boolean;
  /** Whether the property is a constant */
  isStringLiteral?: boolean;
  /** Whether the property has generic parameters */
  isGeneric?: boolean;
  /** Generic parameters if any */
  genericParameters?: Array<GenericParameter>;
  /** Nested properties for object types */
  properties?: PropertyInfo[];
  /** Whether the property is an asset wrapper */
  isAssetWrapper?: boolean;
  /** Whether the property is an array type */
  isArrayType?: boolean;
  /** Whether the property is or contains an asset type */
  isAssetType?: boolean;
  /** Name of the parent object when this is a nested property */
  parentName?: string;
  /** Names of required sibling properties in the same parent object */
  requiredSiblings?: string[];
}

/**
 * Information about an import
 */
export interface ImportInfo {
  /** Module path the import is from */
  from: string;
  /** Named imports from the module */
  namedImports: string[];
}

/**
 * Complete type information extracted from an interface
 */
export interface TypeInfo {
  /** The name of the type */
  name: string;
  /** Type reference */
  type: string;
  /** JSDoc comment for the type */
  jsDoc?: string;
  /** Properties of the type */
  properties: PropertyInfo[];
  /** Dependencies of the type */
  dependencies: Set<ImportInfo>;
  /** Whether the type is an asset wrapper */
  isAssetWrapper?: boolean;
  /** Whether the type is or contains an asset type */
  isAssetType?: boolean;
  /** Interface-level generic parameters */
  interfaceGenerics: GenericParameter[];
}

/**
 * Result type representing either a success or failure
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Success result with a value
 */
export interface Success<T> {
  success: true;
  value: T;
}

/**
 * Failure result with an error
 */
export interface Failure<E = Error> {
  success: false;
  error: E;
}

/**
 * Helper type to check if a type is a literal type vs its general counterpart
 */
type IsLiteralType<T, Base> = T extends Base
  ? Base extends T
    ? false
    : true
  : false;

/**
 * Type utility to transform Asset types into builder friendly versions
 * - 'foo' | 'bar' → 'foo' | 'bar' | TaggedTemplateValue (preserves literal unions)
 * - string → string | TaggedTemplateValue
 * - true | false → true | false | TaggedTemplateValue (preserves boolean literals)
 * - boolean → boolean | TaggedTemplateValue
 * - 42 | 100 → 42 | 100 | TaggedTemplateValue (preserves number literals)
 * - number → number | TaggedTemplateValue
 * - Asset → Asset | FluentBuilder<Asset, C>
 * - AssetWrapper<T> → T | FluentBuilder<T, C>
 * - Array<T> → Array<TransformType<T>>
 * - Record<K, V> → Record<K, TransformType<V>>
 *
 * Uses a helper type to distinguish between literal and general types.
 * For literal types, we preserve the exact literal and add TaggedTemplateValue.
 * For general types, we use the general type and add TaggedTemplateValue.
 *
 * Order matters: we check for complex types first, then primitives.
 */
export type TransformType<
  T,
  C extends BaseBuildContext = BaseBuildContext,
> = T extends Asset & { id: unknown }
  ? T | AnyAssetBuilder<C>
  : T extends { asset: infer A }
    ? A | AnyAssetBuilder<C>
    : T extends Array<infer E>
      ? Array<TransformType<E>>
      : T extends Record<string, unknown>
        ? { [K in keyof T]: TransformType<T[K], C> }
        : T extends string
          ? IsLiteralType<T, string> extends true
            ? T | TaggedTemplateValue
            : string | TaggedTemplateValue
          : T extends boolean
            ? IsLiteralType<T, boolean> extends true
              ? T | TaggedTemplateValue
              : boolean | TaggedTemplateValue
            : T extends number
              ? IsLiteralType<T, number> extends true
                ? T | TaggedTemplateValue
                : number | TaggedTemplateValue
              : T extends bigint
                ? IsLiteralType<T, bigint> extends true
                  ? T | TaggedTemplateValue
                  : bigint | TaggedTemplateValue
                : T;

/**
 * Type utility to extract all properties from an Asset type including nested ones
 * Makes all properties non-optional for the builder args
 * Automatically adds applicability property for conditional asset visibility
 */
export type ExtractBuilderArgs<T> = {
  [K in keyof T as K extends "type" ? never : K]: K extends "metaData"
    ? T[K] extends Record<string, unknown>
      ? { [P in keyof T[K]]: TransformType<T[K][P]> }
      : TransformType<T[K]>
    : TransformType<T[K]>;
} & {
  /**
   * Applicability expression that conditionally shows or hides an asset
   * (and all of its children) from the view tree. Dynamically calculated
   * and automatically updates as data changes on the page.
   */
  applicability?: string | TaggedTemplateValue;
};
