import React from 'react';
import { ReactAsset } from '@player-ui/react';
import type { TransformedDropTargetAssetType } from '../types';
import { useDroppableAsset } from '../hooks/useDroppableAsset';

export const DropPrependComponent = (
  props: TransformedDropTargetAssetType & {
    action: 'prepend' | 'append';
  }
) => {
  const { action } = props;
  const [{ isOver }, drop] = useDroppableAsset(props, action);

  return (
    <div ref={drop} style={{ border: isOver ? '1px solid red' : undefined }}>
      <span>
        {action} - {props.context?.parent.assetName} -{' '}
        {props.context?.propertyName}
      </span>
    </div>
  );
};

export const DropComponent = (props: TransformedDropTargetAssetType) => {
  const [{ isOver }, drop] = useDroppableAsset(props, 'replace');
  const isArrayInsertion = props.context?.isArrayElement ?? false;

  if (!props.value && !props.context) {
    return (
      <div ref={drop}>
        <span>Please Select an Asset</span>
      </div>
    );
  }

  return (
    <div ref={drop} style={{ border: isOver ? '1px solid red' : undefined }}>
      {props.value && (
        <>
          {isOver && <DropPrependComponent {...props} action="prepend" />}
          <ReactAsset {...props.value.asset} />
          {isOver && <DropPrependComponent {...props} action="append" />}
        </>
      )}

      {!props.value && !isArrayInsertion && (
        <span>
          {props.context?.parent.assetName} - {props.context?.propertyName}
        </span>
      )}

      {!props.value && isArrayInsertion && (
        <span>
          Insert into {props.context?.parent.assetName} -{' '}
          {props.context?.propertyName} List
        </span>
      )}
    </div>
  );
};
