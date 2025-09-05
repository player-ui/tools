import type { Asset, AssetWrapper } from "@player-ui/types";
import type { FluentBuilder, ParentCtx } from "../types";
import { isFluentBuilder } from "../types";
import { genId, peekId } from "../id-generator";

/**
 * Creates an AssetWrapper for any nested asset
 * This handles proper ID generation for nested assets
 * @param asset The asset or asset function to wrap
 * @param ctx The parent context
 * @param slotName The slot name for the nested asset
 * @returns An AssetWrapper containing the resolved asset
 */
export function createAssetWrapper<T extends Asset, K extends ParentCtx>(
  asset: T | FluentBuilder<T, K>,
  ctx: K,
  slotName: string,
): AssetWrapper<T> {
  if (isFluentBuilder<T, K>(asset)) {
    // For asset functions, peek at the parent ID without registering it
    const parentId = peekId(ctx);

    // Create nested context with the peeked parent ID and slot branch
    const nestedCtx: K = {
      ...ctx,
      parentId,
      branch: {
        type: "slot",
        name: slotName,
      },
    };

    return { asset: asset(nestedCtx) };
  }

  // For asset objects, check if they already have an ID
  if (asset.id) {
    // Return a copy of the asset to avoid mutations
    return { asset: { ...asset } };
  }

  // For assets without IDs, peek at the parent ID without registering it
  const parentId = peekId(ctx);

  // Create a proper context for the slot with the peeked parent ID
  const slotCtx: ParentCtx = {
    parentId,
    branch: { type: "slot", name: slotName },
  };

  return {
    asset: {
      ...asset,
      id: genId(slotCtx),
    },
  };
}
