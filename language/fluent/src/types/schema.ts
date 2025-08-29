import type { Language, Schema } from "@player-ui/types";
import type { TaggedTemplateValue } from "./tagged-template";
import { SCHEMA_TYPE_NAME_MARKER } from "./markers";

/**
 * Maps Player-UI Schema primitive types to their corresponding TypeScript types.
 * This mapping enables automatic type inference from schema definitions.
 */
type PrimitiveTypeMap = {
  /** String type mapping */
  StringType: string;
  /** Number type mapping */
  NumberType: number;
  /** Boolean type mapping */
  BooleanType: boolean;
};

/**
 * Utility type to force TypeScript to fully evaluate and display a complex type.
 * This improves IDE tooltip display for complex computed types.
 *
 * @template T The type to evaluate and display clearly
 */
type Evaluate<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

/**
 * Type predicate to check if a schema type name represents a primitive type.
 *
 * @template T The type name to check
 */
type IsPrimitiveType<T extends string> = T extends keyof PrimitiveTypeMap
  ? true
  : false;

/**
 * Converts a primitive schema type name to its corresponding TaggedTemplateValue type.
 *
 * @template T The primitive type name from the schema
 */
type PrimitiveToBinding<T extends string> = T extends keyof PrimitiveTypeMap
  ? TaggedTemplateValue<PrimitiveTypeMap[T]>
  : TaggedTemplateValue<string>;

/**
 * Processes a single field from a schema node into its binding representation.
 * Handles both array and non-array fields, mapping them to appropriate TaggedTemplateValue types.
 *
 * @template Field The schema field type to process
 * @template S The complete schema containing all type definitions
 * @template CurrentPath The current path in the schema hierarchy
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
 * Processes all fields in a schema node, converting them to their binding representations.
 * Creates a mapped type where each field becomes a type-safe binding.
 *
 * @template Node The schema node containing the fields to process
 * @template S The complete schema containing all type definitions
 * @template BasePath The base path for generating field paths
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
 * Main utility type to extract type-safe bindings from a Player-UI schema.
 * Processes the ROOT node of a schema and generates a complete binding interface.
 *
 * @template S The Player-UI schema to extract bindings from
 *
 * @example
 * ```typescript
 * const mySchema = {
 *   ROOT: {
 *     user: { type: "UserType" },
 *     settings: { type: "SettingsType" }
 *   },
 *   UserType: {
 *     name: { type: "StringType" },
 *     age: { type: "NumberType" }
 *   },
 *   SettingsType: {
 *     theme: { type: "StringType" },
 *     notifications: { type: "BooleanType" }
 *   }
 * } as const;
 *
 * type Bindings = ExtractedBindings<typeof mySchema>;
 * // Result: {
 * //   user: {
 * //     name: TaggedTemplateValue<string>;
 * //     age: TaggedTemplateValue<number>;
 * //   };
 * //   settings: {
 * //     theme: TaggedTemplateValue<string>;
 * //     notifications: TaggedTemplateValue<boolean>;
 * //   };
 * // }
 * ```
 */
export type ExtractedBindings<S extends Schema.Schema> = S extends {
  ROOT: infer RootNode;
}
  ? RootNode extends Schema.Node
    ? ProcessNodeFields<RootNode, S, "">
    : never
  : never;

/**
 * Union type representing all valid schema data types that can be used
 * in schema generation and validation.
 */
type SchemaDataType = Schema.DataType | Schema.RecordType | Schema.ArrayType;

/**
 * Input type for schema generators that accept various data structures
 * and convert them into Player-UI compatible schemas.
 *
 * @example
 * ```typescript
 * const schemaInput: SchemaGeneratorInput = {
 *   user: {
 *     name: "string",
 *     age: "number",
 *     preferences: {
 *       theme: "string",
 *       notifications: "boolean"
 *     }
 *   },
 *   tags: ["string"],
 *   metadata: { custom: "value" }
 * };
 * ```
 */
export type SchemaGeneratorInput = Record<
  string,
  SchemaDataType | Record<string, unknown> | unknown[]
>;

/**
 * Logging interface for the schema generator.
 *
 * Provides a minimal console-like interface for logging warnings, errors,
 * and informational messages during schema generation. This allows for
 * customizable logging behavior while maintaining a simple interface.
 */
export type LoggingInterface = Pick<Console, "warn" | "error" | "log">;

/**
 * Represents a child schema node that needs to be processed during generation.
 *
 * This interface is used internally to track schema nodes that need to be
 * converted into intermediate types during the schema generation process.
 * Each child represents a nested object structure that will become its own
 * type definition in the final schema.
 */
export interface SchemaChildren {
  /** The name that will be used for the generated intermediate type */
  name: string;
  /** The nested object properties that will be processed into type definitions */
  child: Record<string, unknown>;
}

/**
 * Union type representing a schema node that can be processed by the generator.
 *
 * Schema nodes can be either fully-defined DataType objects or DataTypeRef
 * references. They may also include the SCHEMA_TYPE_NAME_MARKER symbol to override
 * the default type name generation behavior.
 */
export type SchemaNode = (Schema.DataType | Language.DataTypeRef) & {
  /** Optional override for the generated type name */
  [SCHEMA_TYPE_NAME_MARKER]?: string;
};

/**
 * Tracking information for generated data types.
 *
 * This interface is used internally to track which types have been generated
 * and how many times, enabling conflict detection and resolution when
 * multiple schema nodes would generate the same type name.
 */
export interface GeneratedDataType {
  /** The original schema node that was used to generate this type */
  node: SchemaNode;
  /** The number of times this type name has been generated (for conflict resolution) */
  count: number;
}

/**
 * Type guard to determine if a schema node is a fully-defined DataType.
 *
 * This function distinguishes between complete Schema.DataType objects and
 * Language.DataTypeRef references. While this is somewhat of a workaround
 * due to the type system constraints, it's necessary because the final
 * Schema.Schema must contain only Schema.DataType objects, even if the
 * input contains Language.DataTypeRef references.
 *
 * @param property - The schema node to check
 * @returns True if the node is a complete DataType, false if it's a reference
 *
 * @example
 * ```typescript
 * const dataType = { type: "StringType" };
 * const reference = { name: "User", properties: { ... } };
 *
 * isTypeDef(dataType);  // true - has a 'type' property
 * isTypeDef(reference); // false - missing 'type' property
 * ```
 */
export function isTypeDef(property: SchemaNode): property is Schema.DataType {
  return (property as Schema.DataType).type !== undefined;
}
