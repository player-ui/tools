import type { Asset, AssetWrapper } from "@player-ui/types";
import { BranchTypes, type BaseBuildContext } from "../types";
import {
  isFluentBuilder,
  isPlainObject,
  isAsset,
  isAssetWrapper,
} from "../guards";
import { createNestedContext } from "../context";
import { genId, peekId } from "../id/generator";
import { isTaggedTemplateValue } from "../../tagged-template";

/**
 * Type-safe value extraction utilities for handling TaggedTemplateValue
 * These functions properly unwrap TaggedTemplateValue while preserving structure
 */

interface ExtractValueOptions {
  readonly propertyKey?: string;
  readonly visited?: WeakSet<object>;
}

/**
 * Recursively extracts values from an object, handling nested TaggedTemplateValue instances
 */
function extractObject<T extends Record<string, unknown>>(
  value: T,
  options: ExtractValueOptions,
): T {
  const visited = options.visited ?? new WeakSet();

  if (visited.has(value)) {
    return value;
  }
  visited.add(value);

  const result: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(value)) {
    result[key] = extractValue(val, { propertyKey: key, visited });
  }

  return result as T;
}

/**
 * Recursively extracts values from a structure, converting TaggedTemplateValue instances
 * to their string representations while preserving arrays and objects.
 *
 * **Return Type Note**: This function returns `unknown` because the input type is unknown
 * and the transformation can change types (TaggedTemplateValue -> string). Callers should
 * validate the returned value using type guards before using it.
 *
 * **Transformation Behavior**:
 * - `TaggedTemplateValue` → `string` (via toString() or toValue())
 * - Arrays → Arrays (elements recursively transformed)
 * - Plain objects → Objects (properties recursively transformed)
 * - FluentBuilder/AssetWrapper → passed through unchanged (resolved later)
 * - Primitives → passed through unchanged
 *
 * @param value - The value to extract (may contain TaggedTemplateValue instances)
 * @param options - Extraction options (propertyKey for special handling, visited for cycle detection)
 * @returns The extracted value with TaggedTemplateValue instances converted to strings
 *
 * @example
 * ```typescript
 * const result = extractValue({ name: taggedTemplate`Hello` });
 * // result is { name: "Hello" } but typed as unknown
 *
 * // Caller must validate:
 * if (isPlainObject(result)) {
 *   const name = result.name; // Use safely
 * }
 * ```
 */
export function extractValue(
  value: unknown,
  options: ExtractValueOptions = {},
): unknown {
  const { propertyKey, visited = new WeakSet() } = options;

  // Handle TaggedTemplateValue
  if (isTaggedTemplateValue(value)) {
    // Special case: 'data' property (in templates) and 'binding' property should use toValue() to get raw string
    if (propertyKey === "data" || propertyKey === "binding") {
      return value.toValue();
    }
    // Default: use toString() to preserve expression/binding syntax (@[]@ and {{}})
    return value.toString();
  }

  // Handle arrays - recursively extract each element
  if (Array.isArray(value)) {
    if (visited.has(value)) {
      return value;
    }
    visited.add(value);
    // Don't pass propertyKey down to array elements
    return value.map((item) => extractValue(item, { visited }));
  }

  // Handle plain objects - recursively extract each property
  // But skip FluentBuilders and AssetWrappers (they'll be resolved later)
  if (
    isPlainObject(value) &&
    !isFluentBuilder(value) &&
    !isAssetWrapper(value)
  ) {
    return extractObject(value as Record<string, unknown>, { visited });
  }

  // Return primitives and special objects as-is
  return value;
}

/**
 * Creates an AssetWrapper for a nested asset
 */
function wrapAsset<T extends Asset, C extends BaseBuildContext>(
  asset: T,
  context: C | undefined,
  slotName: string,
): AssetWrapper<T> {
  if (!context) {
    return { asset };
  }

  // If asset already has an ID, preserve it
  // User-provided IDs should be respected
  if (asset.id) {
    return { asset: { ...asset } };
  }

  // Generate ID using slot branch for assets without IDs
  const parentId = peekId(context);
  const slotCtx: BaseBuildContext = {
    parentId,
    branch: { type: BranchTypes.SLOT, name: slotName },
  };

  return {
    asset: {
      ...asset,
      id: genId(slotCtx),
    },
  };
}

interface ResolveValueOptions<C extends BaseBuildContext = BaseBuildContext> {
  readonly context?: C;
  readonly propertyName?: string;
  readonly visited?: WeakSet<object>;
}

/**
 * Resolves a value, handling FluentBuilders, AssetWrappers, and nested structures
 */
export function resolveValue<T, C extends BaseBuildContext>(
  value: unknown,
  options: ResolveValueOptions<C> = {},
): unknown {
  const { context, propertyName, visited = new WeakSet() } = options;

  // Handle TaggedTemplateValue
  if (isTaggedTemplateValue(value)) {
    // Special case: 'data' property (in templates) and 'binding' property should use toValue() to get raw string
    if (propertyName === "data" || propertyName === "binding") {
      return value.toValue();
    }
    // Default: use toString() to preserve expression/binding syntax (@[]@ and {{}})
    return value.toString();
  }

  // Skip null or undefined values
  if (value === null || value === undefined) {
    return value;
  }

  // Handle FluentBuilder instances
  if (isFluentBuilder<T, C>(value)) {
    return value.build(context);
  }

  // Handle AssetWrapper types - unwrap, resolve inner asset, and re-wrap
  if (isAssetWrapper(value)) {
    if (visited.has(value)) return value;
    visited.add(value);

    const innerAsset = value.asset;

    // Resolve the inner asset if it's a builder or contains nested structures
    const resolvedAsset = resolveValue(innerAsset, {
      context,
      propertyName,
      visited,
    });

    // Return wrapped with the resolved asset
    return { asset: resolvedAsset };
  }

  // Handle arrays - recursively resolve each element
  if (Array.isArray(value)) {
    if (visited.has(value)) return value;
    visited.add(value);

    // Filter out null/undefined values before processing
    return value
      .filter((item) => item !== null && item !== undefined)
      .map((item, index) => {
        const arrayContext = context
          ? createNestedContext({
              parentContext: context,
              parameterName: propertyName || "array",
              index,
            })
          : undefined;
        return resolveValue(item, {
          context: arrayContext,
          propertyName: String(index),
          visited,
        });
      });
  }

  // Handle plain objects (but not Assets - they should be terminal)
  if (isPlainObject(value) && !isAsset(value)) {
    if (visited.has(value)) return value;
    visited.add(value);

    const resolved: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      const nestedContext = context
        ? createNestedContext({ parentContext: context, parameterName: key })
        : undefined;
      resolved[key] = resolveValue(val, {
        context: nestedContext,
        propertyName: key,
        visited,
      });
    }

    return resolved;
  }

  return value;
}

interface ResolveAndWrapAssetOptions<
  C extends BaseBuildContext = BaseBuildContext,
> {
  readonly context?: C;
  readonly slotName: string;
  readonly visited?: WeakSet<object>;
}

/**
 * Resolves and wraps a nested asset value
 * This is used when we know a property should contain an AssetWrapper
 */
export function resolveAndWrapAsset<C extends BaseBuildContext>(
  value: unknown,
  options: ResolveAndWrapAssetOptions<C>,
): AssetWrapper<Asset> | unknown {
  const { context, slotName, visited = new WeakSet() } = options;

  // Skip null or undefined values
  if (value === null || value === undefined) {
    return value;
  }

  // If it's already an AssetWrapper, just resolve its contents
  if (isAssetWrapper(value)) {
    if (visited.has(value)) return value;
    visited.add(value);

    const resolvedAsset = resolveValue(value.asset, {
      context,
      propertyName: slotName,
      visited,
    });
    return { asset: resolvedAsset };
  }

  // If it's a FluentBuilder, we need to call it with a context that has a slot branch
  // This ensures the built asset gets the correct ID based on the slot name
  if (isFluentBuilder(value)) {
    if (!context) {
      // Without context, just build and wrap
      const built = value.build(undefined);
      if (isAssetWrapper(built)) {
        return built;
      }
      // Only wrap if it's an Asset (has type field)
      if (isAsset(built)) {
        return { asset: built };
      }
      return built;
    }

    // Create a context with a slot branch for the builder.
    // We use peekId to get the parent's ID without registering it, then create
    // a slot branch context so the builder generates an ID like "parent-slotName".
    const parentId = peekId(context);
    const slotContext: C = {
      ...context,
      parentId,
      branch: { type: BranchTypes.SLOT, name: slotName },
    } as C;

    const built = value.build(slotContext);

    // If the builder produces an AssetWrapper, return it
    if (isAssetWrapper(built)) {
      return built;
    }

    // Only wrap if it's an Asset (has type field)
    if (isAsset(built)) {
      return { asset: built };
    }

    // Otherwise return as-is (for non-Asset objects like ChoiceItem)
    return built;
  }

  // If it's an Asset, wrap it
  if (isAsset(value)) {
    return wrapAsset(value, context, slotName);
  }

  return resolveValue(value, { context, propertyName: slotName, visited });
}
