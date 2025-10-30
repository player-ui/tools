import type { Schema } from "@player-ui/types";

export const TaggedTemplateValueSymbol: unique symbol = Symbol(
  "TaggedTemplateValue",
);

export interface TemplateRefOptions {
  nestedContext?: "binding" | "expression";
}

export interface TaggedTemplateValue<T = unknown> {
  [TaggedTemplateValueSymbol]: true;
  /** Phantom type marker - not available at runtime */
  readonly _phantomType?: T;
  toValue(): string;
  toRefString(options?: TemplateRefOptions): string;
  toString(): string;
}

export function isTaggedTemplateValue(
  value: unknown,
): value is TaggedTemplateValue {
  return (
    typeof value === "object" &&
    value !== null &&
    TaggedTemplateValueSymbol in value
  );
}

/**
 * Type that converts an object type to a bindable proxy type
 * Each property access returns a TaggedTemplateValue with the correct type
 */
export type BindableProxy<T> = {
  readonly [K in keyof T]: T[K] extends unknown[]
    ? TaggedTemplateValue<T[K]> // Arrays become bindings directly
    : T[K] extends object
      ? BindableProxy<T[K]> // Objects become nested proxies
      : TaggedTemplateValue<T[K]>; // Primitives become bindings
};

/**
 * Maps primitive Schema types to their corresponding TypeScript types
 */
type PrimitiveTypeMap = {
  StringType: string;
  NumberType: number;
  BooleanType: boolean;
};

/**
 * Utility to force TypeScript to fully evaluate a type
 */
type Evaluate<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/**
 * Check if a type name is primitive
 */
type IsPrimitiveType<T extends string> = T extends keyof PrimitiveTypeMap
  ? true
  : false;

/**
 * Convert a primitive type name to its TaggedTemplateValue
 */
type PrimitiveToBinding<T extends string> = T extends keyof PrimitiveTypeMap
  ? TaggedTemplateValue<PrimitiveTypeMap[T]>
  : TaggedTemplateValue<string>;

/**
 * Process a single field from a node into its binding representation
 */
type ProcessField<
  Field extends Schema.DataTypes,
  S extends Schema.Schema,
  CurrentPath extends string,
> = Field extends { type: infer TypeName extends string }
  ? Field extends { isArray: true }
    ? // Handle array fields
      IsPrimitiveType<TypeName> extends true
      ? TypeName extends "StringType"
        ? { name: PrimitiveToBinding<TypeName> }
        : { value: PrimitiveToBinding<TypeName> }
      : TypeName extends keyof S
        ? S[TypeName] extends Schema.Node
          ? ProcessNodeFields<S[TypeName], S, `${CurrentPath}._current_`>
          : TaggedTemplateValue<string>
        : TaggedTemplateValue<string>
    : // Handle non-array fields
      IsPrimitiveType<TypeName> extends true
      ? PrimitiveToBinding<TypeName>
      : TypeName extends keyof S
        ? S[TypeName] extends Schema.Node
          ? ProcessNodeFields<S[TypeName], S, CurrentPath>
          : TaggedTemplateValue<string>
        : TaggedTemplateValue<string>
  : TaggedTemplateValue<string>;

/**
 * Process all fields in a node
 */
type ProcessNodeFields<
  Node extends Schema.Node,
  S extends Schema.Schema,
  BasePath extends string,
> = Evaluate<{
  [K in keyof Node]: ProcessField<
    Node[K],
    S,
    BasePath extends "" ? K & string : `${BasePath}.${K & string}`
  >;
}>;

/**
 * Main type to extract bindings from a schema
 */
export type ExtractedBindings<S extends Schema.Schema> = S extends {
  ROOT: infer RootNode;
}
  ? RootNode extends Schema.Node
    ? ProcessNodeFields<RootNode, S, "">
    : never
  : never;
