import type { Asset, AssetWrapper, View } from '@player-ui/types';
import type { DropTargetAsset, DropTargetAssetContext } from '../types';
import { UUIDSymbol, DragAndDropAssetType, isDropTargetAsset } from '../types';

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

/** remove the drag and drop state from the view */
export const removeDndStateFromView = (baseView: View): View => {
  /** Walks the drag and drop state to remove any drop target assets */
  const removeDndState = (obj: unknown): any => {
    if (obj === baseView && isDropTargetAsset(obj)) {
      if (obj.value?.asset) {
        return removeDndState(obj.value.asset);
      }

      return undefined;
    }

    if (Array.isArray(obj)) {
      return obj
        .map((objectMember) => removeDndState(objectMember))
        .filter((n) => n !== null && n !== undefined);
    }

    if (typeof obj === 'object' && obj !== null) {
      if ('asset' in obj) {
        const asWrapper: AssetWrapper<DropTargetAsset> = obj as any;
        if ('asset' in obj && isDropTargetAsset(asWrapper.asset)) {
          if (asWrapper.asset.value) {
            const nestedValue = removeDndState(asWrapper.asset.value.asset);

            // eslint-disable-next-line max-depth
            if (nestedValue) {
              return {
                asset: nestedValue,
              };
            }
          }

          return undefined;
        }
      }

      return Object.fromEntries(
        Object.entries(obj).map(([key, value]) => [key, removeDndState(value)])
      );
    }

    return obj;
  };

  // remove any undefined values from the view
  // we only want JSON compliant values
  return JSON.parse(JSON.stringify(removeDndState(baseView)));
};
