import { determineSlotName, genId, peekId } from "./id/generator";
import type {
  BaseBuildContext,
  NestedContextParams,
  AssetMetadata,
} from "./types";

function buildContextParams<C extends BaseBuildContext>(
  parentContext: C,
  parameterName: string,
  index?: number,
): NestedContextParams<C> {
  const params: NestedContextParams<C> = {
    parentContext,
    parameterName,
  };
  if (index !== undefined) {
    return { ...params, index };
  }

  return params;
}

/**
 * Creates a nested context for child builders with automatic ID generation.
 *
 * 1. Determines the appropriate slot name from the parameter name
 * 2. Generates a unique ID using the slot name
 * 3. Creates a new context with the generated ID
 *
 * Use this when you want automatic ID generation for nested builders.
 * For manual context manipulation, use object spreading directly.
 */
export function createNestedContext<C extends BaseBuildContext>({
  parentContext,
  parameterName,
  index,
  assetMetadata,
}: {
  readonly parentContext: C;
  readonly parameterName: string;
  readonly index?: number;
  readonly assetMetadata?: AssetMetadata;
}): C {
  if (parentContext.nestedContextGenerator) {
    const contextParams = buildContextParams(
      parentContext,
      parameterName,
      index,
    );
    const generated = parentContext.nestedContextGenerator(contextParams);
    // Safe assertion: nestedContextGenerator returns the same context type
    return generated as C;
  }

  const slotName = determineSlotName(parameterName, assetMetadata);

  let generatedId: string | undefined;
  let branch: BaseBuildContext["branch"];

  if (parentContext && "parentId" in parentContext) {
    // For array items, use peekId to avoid registering the same slot multiple times
    // For non-array items, use genId to register the slot
    if (index !== undefined) {
      generatedId = peekId({
        parentId: parentContext.parentId,
        branch: { type: "slot", name: slotName },
      });
      branch = { type: "array-item", index };
    } else {
      generatedId = genId({
        parentId: parentContext.parentId,
        branch: { type: "slot", name: slotName },
      });
    }
  }

  const newContext: BaseBuildContext =
    index !== undefined
      ? {
          ...parentContext,
          parameterName,
          index,
          ...(generatedId ? { parentId: generatedId } : {}),
          ...(assetMetadata ? { assetMetadata } : {}),
          ...(branch ? { branch } : {}),
        }
      : {
          ...parentContext,
          parameterName,
          ...(generatedId ? { parentId: generatedId } : {}),
          ...(assetMetadata ? { assetMetadata } : {}),
        };

  // Safe assertion: newContext extends BaseBuildContext with additional properties
  return newContext as C;
}

/**
 * Creates a template context for template value generation.
 *
 * Template contexts use a special template branch with depth tracking
 * to support nested templates (_index_, _index1_, _index2_, etc.).
 */
export function createTemplateContext<C extends BaseBuildContext>({
  parentContext,
  depth = 0,
}: {
  readonly parentContext: C;
  readonly depth?: number;
}): C {
  const parentId = genId(parentContext);

  const templateContext: BaseBuildContext = {
    ...parentContext,
    parentId,
    branch: {
      type: "template",
      depth,
    },
  };

  return templateContext as C;
}

/**
 * Creates a switch context for switch case asset generation.
 *
 * Switch contexts use a special switch branch with index tracking and kind
 * to support sequential case indexing across all switches.
 */
export function createSwitchContext<C extends BaseBuildContext>({
  parentContext,
  index,
  kind,
}: {
  readonly parentContext: C;
  readonly index: number;
  readonly kind: "static" | "dynamic";
}): C {
  const switchContext: BaseBuildContext = {
    ...parentContext,
    branch: {
      type: "switch",
      index,
      kind,
    },
  };

  return switchContext as C;
}
