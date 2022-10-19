import React from 'react';
import { useDrop } from 'react-dnd';
import { Asset } from '@player-ui/react-asset';
import { DroppedItemTypes } from '../types';
import type {
  TransformedDropTargetAssetType,
  ExtensionProviderAssetIdentifier,
} from '../types';

export const DropComponent = (props: TransformedDropTargetAssetType) => {
  const [{ isOver }, drop] = useDrop({
    accept: DroppedItemTypes.ASSET,
    drop: (item: ExtensionProviderAssetIdentifier) => {
      props.replaceAsset(item);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });

  if (props.value) {
    return (
      <div ref={drop} style={{ border: '1px solid red' }}>
        <Asset {...props.value.asset} />
      </div>
    );
  }

  return <div ref={drop}>Test</div>;
};
