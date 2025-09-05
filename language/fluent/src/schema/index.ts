import type { Schema } from "@player-ui/types";
import { SyncWaterfallHook } from "tapable-ts";
import { dequal } from "dequal";
import type {
  GeneratedDataType,
  LoggingInterface,
  SchemaChildren,
  SchemaGeneratorInput,
  SchemaNode,
} from "../types";
import { isTypeDef, SCHEMA_TYPE_NAME_MARKER } from "../types";

/**
 * Generator for converting fluent schema input into Player UI Schema.Schema objects.
 *
 * The SchemaGenerator is the core class responsible for transforming user-friendly
 * schema input into the formal Schema.Schema format required by Player UI. It handles
 * complex scenarios including type name conflicts, nested object structures, array
 * types, and provides extensibility through hooks.
 *
 * Key features:
 * - **Type Name Generation**: Automatically generates type names from property names
 * - **Conflict Resolution**: Handles naming conflicts by generating unique type names
 * - **Extensibility**: Provides hooks for custom schema node processing
 * - **Deep Equality Checking**: Ensures type consistency across schema generation
 * - **Array Support**: Special handling for array types with proper type generation
 *
 * @example
 * ```typescript
 * const generator = new SchemaGenerator();
 *
 * const input = {
 *   user: {
 *     name: { type: "StringType" },
 *     age: { type: "NumberType" },
 *     preferences: {
 *       theme: { type: "StringType" },
 *       notifications: { type: "BooleanType" }
 *     }
 *   },
 *   posts: [{
 *     title: { type: "StringType" },
 *     content: { type: "StringType" },
 *     author: { type: "userType" } // Reference to generated user type
 *   }]
 * };
 *
 * const schema = generator.toSchema(input);
 * // Result:
 * // {
 * //   ROOT: {
 * //     user: { type: "userType" },
 * //     posts: { type: "postsType", isArray: true }
 * //   },
 * //   userType: {
 * //     name: { type: "StringType" },
 * //     age: { type: "NumberType" },
 * //     preferences: { type: "preferencesType" }
 * //   },
 * //   preferencesType: {
 * //     theme: { type: "StringType" },
 * //     notifications: { type: "BooleanType" }
 * //   },
 * //   postsType: {
 * //     title: { type: "StringType" },
 * //     content: { type: "StringType" },
 * //     author: { type: "userType" }
 * //   }
 * // }
 * ```
 */
export class SchemaGenerator {
  /** Queue of child schema nodes that need to be processed into intermediate types */
  private children: SchemaChildren[] = [];

  /** Map tracking generated data types to detect naming conflicts and duplicates */
  private generatedDataTypes: Map<string, GeneratedDataType> = new Map();

  /** Cache for generated type names to improve performance on repeated operations */
  private typeNameCache: Map<string, string> = new Map();

  /** Logger instance for outputting warnings and errors during generation */
  private logger: LoggingInterface;

  /**
   * Hook system for extending schema generation behavior.
   *
   * The hooks allow external code to modify or enhance the schema generation
   * process. The createSchemaNode hook is called for each node during processing,
   * enabling custom transformations, validations, or augmentations.
   */
  public hooks: {
    /**
     * Hook called when creating each schema node.
     * Allows modification of the generated node before it's added to the schema.
     *
     * @param node - The generated schema data type
     * @param originalProperty - The original input property that generated this node
     * @returns The potentially modified schema data type
     */
    createSchemaNode: SyncWaterfallHook<
      [
        node: Schema.DataType,
        originalProperty: Record<string | symbol, unknown>,
      ]
    >;
  } = {
    createSchemaNode: new SyncWaterfallHook<
      [
        node: Schema.DataType,
        originalProperty: Record<string | symbol, unknown>,
      ]
    >(),
  };

  /**
   * Creates a new SchemaGenerator instance.
   *
   * @param logger - Optional custom logger for outputting messages. Defaults to console.
   */
  constructor(logger?: LoggingInterface) {
    this.logger = logger ?? console;
  }

  /**
   * Converts a fluent schema input object into a formal Player UI Schema.Schema representation.
   *
   * This is the main public method of the SchemaGenerator. It takes a user-friendly
   * schema input and transforms it into the strict Schema.Schema format required by
   * Player UI. The conversion process handles nested objects, arrays, type references,
   * and automatically generates intermediate types as needed.
   *
   * @param schemaInput - The fluent schema input to convert
   * @returns A complete Schema.Schema object with ROOT and all intermediate types
   *
   * @example
   * ```typescript
   * const generator = new SchemaGenerator();
   *
   * // Simple nested object
   * const input = {
   *   user: {
   *     profile: {
   *       name: { type: "StringType" },
   *       avatar: { type: "StringType" }
   *     },
   *     settings: {
   *       theme: { type: "StringType" },
   *       notifications: { type: "BooleanType" }
   *     }
   *   }
   * };
   *
   * const schema = generator.toSchema(input);
   * // Generates:
   * // - ROOT.user -> userType
   * // - userType.profile -> profileType
   * // - userType.settings -> settingsType
   * // - profileType with name and avatar properties
   * // - settingsType with theme and notifications properties
   *
   * // Array types
   * const arrayInput = {
   *   items: [{
   *     id: { type: "StringType" },
   *     value: { type: "NumberType" }
   *   }]
   * };
   *
   * const arraySchema = generator.toSchema(arrayInput);
   * // Generates:
   * // - ROOT.items -> { type: "itemsType", isArray: true }
   * // - itemsType with id and value properties
   * ```
   *
   * @throws {Error} Potentially throws if schema input is malformed or contains circular references
   */
  public toSchema = (schemaInput: SchemaGeneratorInput): Schema.Schema => {
    // Clear internal state efficiently to prepare for new generation
    this.children.length = 0;
    this.generatedDataTypes.clear();
    this.typeNameCache.clear();

    // Initialize the result schema with empty ROOT
    const resultSchema: Schema.Schema = {
      ROOT: {},
    };

    // Process root-level properties with optimized iteration
    const rootProperties = Object.keys(schemaInput);
    for (let i = 0; i < rootProperties.length; i++) {
      const propertyName = rootProperties[i];
      const schemaNode = schemaInput[propertyName] as SchemaNode;

      // Process the property and apply hooks
      resultSchema.ROOT[propertyName] = this.hooks.createSchemaNode.call(
        this.processChild(propertyName, schemaNode),
        schemaNode as unknown as Record<string | symbol, unknown>,
      );
    }

    // Process queued child nodes iteratively until all are resolved
    while (this.children.length > 0) {
      const { name: typeName, child: childProperties } = this.children.pop()!;
      const typeDefinition: Record<string, Schema.DataType> = {};

      // Process each property of the child type
      const childPropertyNames = Object.keys(childProperties);
      for (let i = 0; i < childPropertyNames.length; i++) {
        const propertyName = childPropertyNames[i];
        const schemaNode = childProperties[propertyName] as SchemaNode;

        // Process property and apply hooks
        typeDefinition[propertyName] = this.hooks.createSchemaNode.call(
          this.processChild(propertyName, schemaNode),
          schemaNode as unknown as Record<string | symbol, unknown>,
        );
      }

      // Add the completed type definition to the schema
      resultSchema[typeName] = typeDefinition;
    }

    return resultSchema;
  };

  /**
   * Processes a child schema node to determine its type and handle intermediate type generation.
   *
   * This private method is responsible for the core logic of schema processing. It determines
   * whether a schema node is already a complete DataType or needs to be processed into an
   * intermediate type. It handles arrays, nested objects, type name conflicts, and maintains
   * the queue of child nodes that need further processing.
   *
   * Key responsibilities:
   * - Distinguish between complete DataTypes and objects requiring processing
   * - Handle array type detection and processing
   * - Generate appropriate type names using SCHEMA_TYPE_NAME_MARKER overrides or property names
   * - Detect and resolve type name conflicts using deep equality checking
   * - Queue child nodes for subsequent processing
   * - Maintain consistency across duplicate type definitions
   *
   * @param propertyName - The property name being processed (used for type name generation)
   * @param schemaNode - The schema node to process
   * @returns A Schema.DataType representing this node
   *
   * @example
   * ```typescript
   * // Processing a complete DataType (returns as-is)
   * processChild("name", { type: "StringType" });
   * // Returns: { type: "StringType" }
   *
   * // Processing a nested object (creates intermediate type)
   * processChild("user", {
   *   name: { type: "StringType" },
   *   age: { type: "NumberType" }
   * });
   * // Returns: { type: "userType" }
   * // Queues userType for processing
   *
   * // Processing an array (creates array type)
   * processChild("items", [{
   *   id: { type: "StringType" }
   * }]);
   * // Returns: { type: "itemsType", isArray: true }
   * // Queues itemsType for processing
   * ```
   */
  private processChild(
    propertyName: string,
    schemaNode: SchemaNode,
  ): Schema.DataType {
    // If this is already a complete DataType, return it as-is
    if (isTypeDef(schemaNode)) {
      return schemaNode;
    }

    let intermediateType: Schema.DataType;
    let childProperties: Record<string, unknown>;

    // Handle array types specially
    if (Array.isArray(schemaNode)) {
      // Validate array structure - should contain exactly one element type
      if (schemaNode.length > 1) {
        this.logger.warn(
          `Type ${propertyName} has multiple types in array, should only contain one top level object type. Only taking first defined type`,
        );
      }

      // Extract type name and create array type
      const typeNameOverride =
        schemaNode[0][SCHEMA_TYPE_NAME_MARKER] ?? propertyName;
      intermediateType = this.makePlaceholderArrayType(typeNameOverride);
      childProperties = schemaNode[0] as Record<string, unknown>;
    } else {
      // Handle regular object types
      const typeNameOverride =
        schemaNode[SCHEMA_TYPE_NAME_MARKER] ?? propertyName;
      intermediateType = this.makePlaceholderType(typeNameOverride);
      childProperties = schemaNode as unknown as Record<string, unknown>;
    }

    const generatedTypeName = intermediateType.type;

    // Check for existing types with the same name
    if (this.generatedDataTypes.has(generatedTypeName)) {
      const existingType = this.generatedDataTypes.get(generatedTypeName)!;

      // Use deep equality to check if types are actually different
      const existingNode = this.generatedDataTypes.get(generatedTypeName)?.node;
      if (!dequal(childProperties, existingNode as object)) {
        // Types have same name but different structure - create conflict resolution
        existingType.count += 1;
        const conflictResolvedTypeName = `${generatedTypeName}${existingType.count}`;

        intermediateType = {
          ...intermediateType,
          type: conflictResolvedTypeName,
        };

        this.logger.warn(
          `WARNING: Generated two intermediate types with the name: ${generatedTypeName} that are of different shapes, using artificial type ${conflictResolvedTypeName}`,
        );

        // Register the new artificial type
        this.generatedDataTypes.set(conflictResolvedTypeName, {
          node: schemaNode,
          count: 1,
        });

        // Queue for processing
        this.children.push({
          name: conflictResolvedTypeName,
          child: childProperties,
        });

        return intermediateType;
      }
      // Types are identical - reuse existing type without creating duplicate
    } else {
      // First time seeing this type name - register it
      this.generatedDataTypes.set(generatedTypeName, {
        node: schemaNode,
        count: 1,
      });
    }

    // Queue the child for processing
    this.children.push({
      name: intermediateType.type,
      child: childProperties,
    });

    return intermediateType;
  }

  /**
   * Generates a placeholder DataType for regular (non-array) object types with caching.
   *
   * This method creates a Schema.DataType that serves as a placeholder reference
   * to an intermediate type that will be fully defined later in the processing.
   * It uses caching to ensure consistent type names across multiple calls with
   * the same input, improving performance and maintaining referential integrity.
   *
   * @param baseName - The base name to use for type generation
   * @returns A DataType with the generated type name
   *
   * @example
   * ```typescript
   * const type1 = makePlaceholderType("user");    // { type: "userType" }
   * const type2 = makePlaceholderType("user");    // { type: "userType" } (cached)
   * const type3 = makePlaceholderType("profile"); // { type: "profileType" }
   * ```
   */
  private makePlaceholderType = (baseName: string): Schema.DataType => {
    let cachedTypeName = this.typeNameCache.get(baseName);
    if (!cachedTypeName) {
      cachedTypeName = `${baseName}Type`;
      this.typeNameCache.set(baseName, cachedTypeName);
    }
    return { type: cachedTypeName };
  };

  /**
   * Generates a placeholder DataType for array types with caching.
   *
   * Similar to makePlaceholderType, but creates a DataType marked as an array.
   * The generated type represents an array of elements of the intermediate type
   * that will be defined later. Caching ensures consistent naming and performance.
   *
   * @param baseName - The base name to use for array element type generation
   * @returns A DataType with the generated type name and isArray flag set
   *
   * @example
   * ```typescript
   * const arrayType1 = makePlaceholderArrayType("item");  // { type: "itemType", isArray: true }
   * const arrayType2 = makePlaceholderArrayType("item");  // { type: "itemType", isArray: true } (cached)
   * const arrayType3 = makePlaceholderArrayType("user");  // { type: "userType", isArray: true }
   * ```
   */
  private makePlaceholderArrayType(baseName: string): Schema.DataType {
    let cachedTypeName = this.typeNameCache.get(baseName);
    if (!cachedTypeName) {
      cachedTypeName = `${baseName}Type`;
      this.typeNameCache.set(baseName, cachedTypeName);
    }
    return {
      type: cachedTypeName,
      isArray: true,
    };
  }
}
