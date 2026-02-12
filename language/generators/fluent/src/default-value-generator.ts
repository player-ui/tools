import type { NodeType, ObjectType } from "@player-tools/xlr";
import {
  isStringType,
  isNumberType,
  isBooleanType,
  isObjectType,
  isArrayType,
  isRefType,
  isOrType,
  isAndType,
  isPrimitiveConst,
  isAssetWrapperRef,
  isExpressionRef,
  isBindingRef,
} from "./utils";

/**
 * Configuration for default value generation
 */
export interface DefaultValueConfig {
  /**
   * Maximum depth for recursive object defaults.
   * Prevents infinite recursion for deeply nested or circular types.
   *
   * The depth counter starts at 0 for the root object and increments
   * for each nested object level. When depth equals maxDepth, nested
   * objects are returned as empty `{}` instead of recursing further.
   *
   * Example with maxDepth=3:
   * - Root object (depth 0): full defaults generated
   * - level1.nested (depth 1): full defaults generated
   * - level1.nested.child (depth 2): full defaults generated
   * - level1.nested.child.deep (depth 3): returns {} (depth limit reached)
   *
   * Default: 3
   */
  maxDepth?: number;

  /**
   * Type names to skip (user must provide these values).
   * Typically includes "Asset" and "AssetWrapper".
   */
  skipTypes?: Set<string>;
}

const DEFAULT_CONFIG: Required<DefaultValueConfig> = {
  maxDepth: 3,
  skipTypes: new Set(["Asset", "AssetWrapper"]),
};

/**
 * Context for tracking default generation state
 */
interface GenerationContext {
  depth: number;
  config: Required<DefaultValueConfig>;
}

/**
 * Generates smart default values for builder classes.
 *
 * This generator creates sensible defaults for required fields:
 * - String → ""
 * - Number → 0
 * - Boolean → false
 * - Array → []
 * - Object → {} or recursive defaults for required properties
 * - Expression/Binding → ""
 * - Union types → uses the first non-null/undefined variant
 * - AssetWrapper → SKIPPED (user must provide)
 */
export class DefaultValueGenerator {
  private readonly config: Required<DefaultValueConfig>;

  constructor(config: DefaultValueConfig = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      skipTypes: config.skipTypes ?? DEFAULT_CONFIG.skipTypes,
    };
  }

  /**
   * Generate default values for an ObjectType.
   *
   * @param objectType - The XLR ObjectType to generate defaults for
   * @param assetType - Optional asset type string for Asset types
   * @returns Record of property names to default values
   */
  generateDefaults(
    objectType: ObjectType,
    assetType?: string,
  ): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    // Add asset type default if this is an asset
    if (assetType) {
      defaults["type"] = assetType;
    }

    // Add default ID for assets (types that extend Asset)
    if (objectType.extends?.ref.startsWith("Asset")) {
      defaults["id"] = "";
    }
    // Also add default ID for non-Asset types that have an 'id' property
    else if ("id" in objectType.properties) {
      defaults["id"] = "";
    }

    // Process each property
    const context: GenerationContext = {
      depth: 0,
      config: this.config,
    };

    for (const [propName, prop] of Object.entries(objectType.properties)) {
      // Const values take precedence
      if (isPrimitiveConst(prop.node)) {
        defaults[propName] = prop.node.const;
        continue;
      }

      // Only generate defaults for required properties
      if (!prop.required) {
        continue;
      }

      // Skip if we already have a default (e.g., id)
      if (propName in defaults) {
        continue;
      }

      const defaultValue = this.getDefaultForType(prop.node, context);
      if (defaultValue !== undefined) {
        defaults[propName] = defaultValue;
      }
    }

    return defaults;
  }

  /**
   * Get the default value for a specific type node.
   *
   * @param node - The type node
   * @param context - Generation context for tracking depth
   * @returns The default value, or undefined if the type should be skipped
   */
  private getDefaultForType(
    node: NodeType,
    context: GenerationContext,
  ): unknown {
    // Skip AssetWrapper - user must provide
    if (isAssetWrapperRef(node)) {
      return undefined;
    }

    // Check for other skip types
    if (isRefType(node)) {
      const baseName = node.ref.split("<")[0];
      if (context.config.skipTypes.has(baseName)) {
        return undefined;
      }
    }

    // Handle primitive types
    if (isStringType(node)) {
      return "";
    }

    if (isNumberType(node)) {
      return 0;
    }

    if (isBooleanType(node)) {
      return false;
    }

    // Handle Expression and Binding refs
    if (isExpressionRef(node) || isBindingRef(node)) {
      return "";
    }

    // Handle arrays
    if (isArrayType(node)) {
      return [];
    }

    // Handle union types - pick first non-null/undefined variant
    if (isOrType(node)) {
      return this.getDefaultForUnion(node.or, context);
    }

    // Handle intersection types - try to merge defaults
    if (isAndType(node)) {
      return this.getDefaultForIntersection(node.and, context);
    }

    // Handle object types with depth limit
    if (isObjectType(node)) {
      if (context.depth >= context.config.maxDepth) {
        return {};
      }

      return this.getDefaultForObject(node, {
        ...context,
        depth: context.depth + 1,
      });
    }

    // Handle null/undefined types
    if (node.type === "null") {
      return null;
    }

    if (node.type === "undefined") {
      return undefined;
    }

    // Refs to other types - return empty object as a safe default
    if (isRefType(node)) {
      return {};
    }

    return undefined;
  }

  /**
   * Get default for a union type by picking the first non-null/undefined variant.
   */
  private getDefaultForUnion(
    variants: NodeType[],
    context: GenerationContext,
  ): unknown {
    for (const variant of variants) {
      // Skip null and undefined
      if (variant.type === "null" || variant.type === "undefined") {
        continue;
      }

      const defaultValue = this.getDefaultForType(variant, context);
      if (defaultValue !== undefined) {
        return defaultValue;
      }
    }

    // If all variants are null/undefined, return undefined
    return undefined;
  }

  /**
   * Get default for an intersection type by attempting to merge.
   */
  private getDefaultForIntersection(
    parts: NodeType[],
    context: GenerationContext,
  ): unknown {
    // For intersections, we need to satisfy all parts
    // Start with an empty object and merge
    const merged: Record<string, unknown> = {};

    for (const part of parts) {
      const partDefault = this.getDefaultForType(part, context);

      if (
        partDefault !== undefined &&
        typeof partDefault === "object" &&
        partDefault !== null &&
        !Array.isArray(partDefault)
      ) {
        Object.assign(merged, partDefault);
      }
    }

    return Object.keys(merged).length > 0 ? merged : {};
  }

  /**
   * Get default for an object type by processing required properties.
   */
  private getDefaultForObject(
    node: ObjectType,
    context: GenerationContext,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [propName, prop] of Object.entries(node.properties)) {
      // Const values take precedence
      if (isPrimitiveConst(prop.node)) {
        result[propName] = prop.node.const;
        continue;
      }

      // Only generate defaults for required properties
      if (!prop.required) {
        continue;
      }

      const defaultValue = this.getDefaultForType(prop.node, context);
      if (defaultValue !== undefined) {
        result[propName] = defaultValue;
      }
    }

    return result;
  }
}
