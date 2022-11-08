import { useDrag } from 'react-dnd';
import { DroppedItemTypes } from '../types';
import type { ExtensionProviderAssetIdentifier } from '../types';

export const useDraggableAsset = (
  identifier: ExtensionProviderAssetIdentifier
) => {
  const [p, ref] = useDrag(() => ({
    type: DroppedItemTypes.ASSET,
    item: identifier,
    collect: (m) => ({
      isDragging: m.isDragging(),
    }),
  }));

  return [p, ref] as const;
};
