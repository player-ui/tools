import React from 'react';
import { ReactAsset } from '@player-ui/react';
import type { TransformedDropTargetAssetType } from '../types';
import { useDroppableAsset } from '../hooks/useDroppableAsset';

export const DropComponent = (props: TransformedDropTargetAssetType) => {
  const [{ isOver }, drop] = useDroppableAsset(props);

  if (!props.value && !props.context) {
    return (
      <div ref={drop}>
        <span>Please Select an Asset</span>
      </div>
    );
  }

  return (
    <div ref={drop} style={{ border: isOver ? '1px solid red' : undefined }}>
      {props.value ? (
        <ReactAsset {...props.value.asset} />
      ) : (
        <span>
          {props.context?.parent.name} - {props.context?.propertyName}
        </span>
      )}
    </div>
  );
};
