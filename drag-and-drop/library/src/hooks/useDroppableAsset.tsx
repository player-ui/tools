import { useDrop } from 'react-dnd';
import type {
  ExtensionProviderAssetIdentifier,
  TransformedDropTargetAssetType,
} from '../types';
import { DroppedItemTypes } from '../types';

export const useDroppableAsset = (
  props: TransformedDropTargetAssetType,
  action: 'replace' | 'append' | 'prepend'
) => {
  const [p, ref] = useDrop({
    accept: DroppedItemTypes.ASSET,
    drop: (item: ExtensionProviderAssetIdentifier, monitor) => {
      if (monitor.didDrop()) {
        return;
      }

      props.placeAsset(item, action);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return [p, ref] as const;
};
