import { useDrop } from 'react-dnd';
import type {
  ExtensionProviderAssetIdentifier,
  TransformedDropTargetAssetType,
} from '../types';
import { DroppedItemTypes } from '../types';

export const useDroppableAsset = (props: TransformedDropTargetAssetType) => {
  const [p, ref] = useDrop({
    accept: DroppedItemTypes.ASSET,
    drop: (item: ExtensionProviderAssetIdentifier, monitor) => {
      if (monitor.didDrop()) {
        return;
      }

      props.replaceAsset(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  return [p, ref] as const;
};
