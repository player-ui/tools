import type { Schema, Language } from "@player-ui/types";
import { SyncWaterfallHook } from "tapable-ts";
import { dequal } from "dequal";
import { SchemaGeneratorInput } from "./types";

/** Symbol to indicate that a schema node should be generated with a different name */
export const SchemaTypeName = Symbol.for("Schema Rename");

export type LoggingInterface = Pick<Console, "warn" | "error" | "log">;

interface SchemaChildren {
  /** Object property that will be used to create the intermediate type */
  name: string;

  /** Object properties children that will be parsed */
  child: Record<string, unknown>;
}

type SchemaNode = (Schema.DataType | Language.DataTypeRef) & {
  /** Overwrite the name of the generated type */
  [SchemaTypeName]?: string;
};

interface GeneratedDataType {
  /** The SchemaNode that was generated */
  node: SchemaNode;
  /** How many times it has been generated */
  count: number;
}

/**
 * Type Guard for the `Schema.DataType` and `Language.DataTypeRef` type
 * A bit hacky but since `Schema.Schema` must have a `Schema.DataType` as
 * the final product we have to call it that even if it is a `Language.DataTypeRef`
 */
const isTypeDef = (property: SchemaNode): property is Schema.DataType => {
  return (property as Schema.DataType).type !== undefined;
};

/**
 * Generator for `Schema.Schema` Objects
 */
export class SchemaGenerator {
  private children: SchemaChildren[] = [];
  private generatedDataTypes: Map<string, GeneratedDataType> = new Map();
  private typeNameCache: Map<string, string> = new Map();
  private logger: LoggingInterface;

  public hooks = {
    createSchemaNode: new SyncWaterfallHook<
      [
        node: Schema.DataType,
        originalProperty: Record<string | symbol, unknown>,
      ]
    >(),
  };

  constructor(logger?: LoggingInterface) {
    this.logger = logger ?? console;
  }

  /**
   * Converts an object to a `Schema.Schema` representation
   * Optimized to minimize object operations and memory allocations
   */
  public toSchema = (schema: SchemaGeneratorInput): Schema.Schema => {
    // Clear state efficiently
    this.children.length = 0;
    this.generatedDataTypes.clear();
    this.typeNameCache.clear();

    const newSchema: Schema.Schema = {
      ROOT: {},
    };

    // Pre-allocate arrays and use for...in for better performance
    const rootKeys = Object.keys(schema);
    for (let i = 0; i < rootKeys.length; i++) {
      const property = rootKeys[i];
      const subType = schema[property] as SchemaNode;
      newSchema.ROOT[property] = this.hooks.createSchemaNode.call(
        this.processChild(property, subType),
        subType as unknown as Record<string | symbol, unknown>,
      );
    }

    // Process children using optimized iteration
    while (this.children.length > 0) {
      const { name, child } = this.children.pop()!;
      const typeDef: Record<string, Schema.DataType> = {};

      const childKeys = Object.keys(child);
      for (let i = 0; i < childKeys.length; i++) {
        const property = childKeys[i];
        const subType = child[property] as SchemaNode;
        typeDef[property] = this.hooks.createSchemaNode.call(
          this.processChild(property, subType),
          subType as unknown as Record<string | symbol, unknown>,
        );
      }
      newSchema[name] = typeDef;
    }

    return newSchema;
  };

  private processChild(property: string, subType: SchemaNode): Schema.DataType {
    if (isTypeDef(subType)) {
      return subType;
    }

    let intermediateType: Schema.DataType;
    let child: Record<string, unknown>;

    if (Array.isArray(subType)) {
      if (subType.length > 1) {
        this.logger.warn(
          `Type ${property} has multiple types in array, should only contain one top level object type. Only taking first defined type`,
        );
      }

      const subTypeName = subType[0][SchemaTypeName] ?? property;
      intermediateType = this.makePlaceholderArrayType(subTypeName);
      child = subType[0] as Record<string, unknown>;
    } else {
      const subTypeName = subType[SchemaTypeName] ?? property;
      intermediateType = this.makePlaceholderType(subTypeName);
      child = subType as unknown as Record<string, unknown>;
    }

    const typeName = intermediateType.type;

    if (this.generatedDataTypes.has(typeName)) {
      const generatedType = this.generatedDataTypes.get(typeName)!;

      // Use deep equality check to ensure types are actually different
      if (
        !dequal(child, this.generatedDataTypes.get(typeName)?.node as object)
      ) {
        generatedType.count += 1;
        const newTypeName = `${typeName}${generatedType.count}`;
        intermediateType = {
          ...intermediateType,
          type: newTypeName,
        };
        this.logger.warn(
          `WARNING: Generated two intermediate types with the name: ${typeName} that are of different shapes, using artificial type ${newTypeName}`,
        );

        // Add new type mapping for the new artificial type
        this.generatedDataTypes.set(newTypeName, {
          node: subType,
          count: 1,
        });
        this.children.push({ name: newTypeName, child });
        return intermediateType;
      }
    } else {
      this.generatedDataTypes.set(typeName, {
        node: subType,
        count: 1,
      });
    }

    this.children.push({ name: intermediateType.type, child });
    return intermediateType;
  }

  /**
   * Cached type name generation
   */
  private makePlaceholderType = (typeName: string): Schema.DataType => {
    let cachedName = this.typeNameCache.get(typeName);
    if (!cachedName) {
      cachedName = `${typeName}Type`;
      this.typeNameCache.set(typeName, cachedName);
    }
    return { type: cachedName };
  };

  /**
   * Cached array type name generation
   */
  private makePlaceholderArrayType(typeName: string): Schema.DataType {
    let cachedName = this.typeNameCache.get(typeName);
    if (!cachedName) {
      cachedName = `${typeName}Type`;
      this.typeNameCache.set(typeName, cachedName);
    }
    return {
      type: cachedName,
      isArray: true,
    };
  }
}
