import type { Asset, AssetWrapper } from "@player-ui/types";
import type { FluentBuilder, ParentCtx } from "../types";
import { isFluentBuilder } from "../types";
import { genId } from "../id-generator";

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
    // For asset functions, first generate an ID for the parent context
    const parentId = genId(ctx);

    // Create nested context with the generated parent ID and slot branch
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

  // For assets without IDs, generate an ID using the original context
  // but don't add it to the asset (the ID is for internal context purposes)
  genId(ctx);

  return {
    asset: {
      ...asset,
      id: genId({ ...ctx, branch: { type: "slot", name: slotName } }),
    },
  };
}
