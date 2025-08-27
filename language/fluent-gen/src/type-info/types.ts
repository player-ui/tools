import type {
  InterfaceDeclaration,
  EnumDeclaration,
  TypeAliasDeclaration,
  SourceFile,
} from "ts-morph";

export type FluentBuilder<T extends object, K extends object> = (ctx: K) => T;

export type Declaration =
  | InterfaceDeclaration
  | EnumDeclaration
  | TypeAliasDeclaration;

export interface ResolvedSymbol {
  declaration: Declaration;
  target: ResolutionTarget;
  isLocal: boolean;
}

export type ResolutionTarget =
  | { kind: "local"; filePath: string; name: string }
  | { kind: "module"; name: string };

export interface ResolutionContext {
  symbolName: string;
  sourceFile: SourceFile;
  visitedPaths?: Set<string>;
}

export interface ModuleResolutionOptions {
  symbolName: string;
  moduleSpecifier: string;
  sourceFile: SourceFile;
  isTypeOnlyImport?: boolean;
}

export interface TypeMetadata {
  isUtilityType?: boolean;
  isGeneric?: boolean;
  baseType?: string;
  genericArgs?: string[];
}

export interface Dependency {
  /** The location of the dependency - either a local file or an external module */
  target: ResolutionTarget;
  /** The name of the dependency (the imported/referenced type name) */
  dependency: string;
  /** Whether this dependency uses a default import (import Foo from '...' vs import { Foo } from '...') */
  isDefaultImport?: boolean;
  /** The alias used for the import (import { Foo as Bar } from '...') */
  alias?: string;
}

/** Enhanced import information for code generation */
export interface ImportInfo {
  /** Module name for external imports */
  moduleName?: string;
  /** File path for local imports */
  filePath?: string;
  /** Whether this is a default import */
  isDefaultImport?: boolean;
  /** Import alias if used */
  alias?: string;
  /** Complete import statement ready for generation */
  importStatement?: string;
}

export interface ExtendsInfo {
  typeAsString: string;
  typeArguments: string[];
}

// Base property interface with discriminating tag
export interface BaseProperty<
  T extends string,
  K extends "terminal" | "non-terminal" = "non-terminal",
> {
  /** If the property is a terminal type (string, number, boolean) we shounld not expand it further */
  kind: K;
  /** The general type category */
  type: T;
  /** Property name */
  name: string;
  /** Type as string (e.g., "string", "TextAsset", "Pick<User, 'name'>") */
  typeAsString: string;
  /** If the property is an array */
  isArray?: boolean;
  /** If the property is optional */
  isOptional?: boolean;
  /** JSDoc documentation for this property */
  documentation?: string;
}

// Primitive types
export interface StringProperty extends BaseProperty<"string", "terminal"> {
  value?: string; // for literal string types like 'active'
}

export interface NumberProperty extends BaseProperty<"number", "terminal"> {
  value?: number; // for literal number types
}

export interface BooleanProperty extends BaseProperty<"boolean", "terminal"> {
  value?: boolean; // for literal boolean types
}

/** Enum types - for TypeScript enums */
export interface EnumProperty extends BaseProperty<"enum", "terminal"> {
  /** The possible enum values (e.g., ["Active", "Inactive"]) */
  values: (string | number)[];
}

export type UnknownProperty = BaseProperty<"unknown", "terminal">;

export type MethodProperty = BaseProperty<"method", "terminal">;

/**
 * Object/Interface type - unified for all complex types (interfaces, classes, utility types, etc.)
 *
 * This represents any type that has properties and can potentially have a fluent builder generated for it.
 */
export interface ObjectProperty extends BaseProperty<"object"> {
  /** The full type as string (e.g., "TextAsset", "Pick<User, 'name'>", "AssetWrapper<TextAsset>") */
  typeAsString: string;
  /** The properties of this object type (empty if Record<string, unknown | any>) */
  properties: PropertyInfo[];
  /** JSDoc documentation for this property */
  documentation?: string;
  /** Accept unknown properties (for index signatures or Record<string, unknown>) */
  acceptsUnknownProperties?: boolean;
}

/** Union types - for discriminated unions and type unions */
export interface UnionProperty extends BaseProperty<"union"> {
  /** The individual types in the union */
  elements: PropertyInfo[];
  /** JSDoc documentation for this property */
  documentation?: string;
}

/** Union of all property types */
export type PropertyInfo =
  | StringProperty
  | NumberProperty
  | BooleanProperty
  | ObjectProperty
  | UnionProperty
  | EnumProperty
  | UnknownProperty
  | MethodProperty;

export interface ExtractResult extends ObjectProperty {
  filePath: string;
  dependencies: Dependency[];
}

/** Result of circular dependency analysis */
export interface CircularDependencyAnalysis {
  hasCircularDependencies: boolean;
  affectedTypes: Set<string>;
  dependencyGraph: Map<string, Set<string>>;
}

/** Options for circular dependency detection */
export interface DetectionOptions {
  maxDepth?: number;
  includeExternalDependencies?: boolean;
  followTypeAliases?: boolean;
  includeGenericConstraints?: boolean;
}

// Type guards for property types
export const isStringProperty = (prop: PropertyInfo): prop is StringProperty =>
  prop.type === "string";

export const isNumberProperty = (prop: PropertyInfo): prop is NumberProperty =>
  prop.type === "number";

export const isBooleanProperty = (
  prop: PropertyInfo,
): prop is BooleanProperty => prop.type === "boolean";

export const isObjectProperty = (prop: PropertyInfo): prop is ObjectProperty =>
  prop.type === "object";

export const isUnionProperty = (prop: PropertyInfo): prop is UnionProperty =>
  prop.type === "union";

export const isEnumProperty = (prop: PropertyInfo): prop is EnumProperty =>
  prop.type === "enum";

// Type guards for dependency targets
export const isLocalDependency = (
  dep: Dependency,
): dep is Dependency & {
  target: { kind: "local"; filePath: string; name: string };
} => dep.target.kind === "local";

export const isModuleDependency = (
  dep: Dependency,
): dep is Dependency & { target: { kind: "module"; name: string } } =>
  dep.target.kind === "module";
