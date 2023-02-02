import type { Asset } from '@player-ui/types';
import type { DropTargetAsset, DropTargetAssetContext } from '../types';
import { DragAndDropAssetType, UUIDSymbol } from '../types';

/** Creates a drop target asset */
export const makeDropTarget = (
  id: string,
  context?: DropTargetAssetContext
): DropTargetAsset => {
  const symbol = Symbol(`${id}-drop-target`);
  return {
    __type: DragAndDropAssetType,
    id,
    type: 'drop-target',
    [UUIDSymbol]: symbol,
    context,
    values: [],
  };
};

/** Returns the shadow ID for any given asset */
export const getAssetSymbol = (asset: Asset): symbol => {
  return (asset as any)[UUIDSymbol];
};
