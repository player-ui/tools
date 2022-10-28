import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Runtime,
  selectAllBindings,
  selectSelectedBinding,
  selectSelectedPlayerId,
  clearSelectedDataDetails,
  GET_DATA_BINDING_DETAILS,
} from '@player-tools/devtools-client';
import { Data } from './Data';
import { ASTNode, ResolvedASTNode } from '@devtools-ds/object-parser';

const getBindingFromSelectedNode = (
  node: ASTNode | ResolvedASTNode
): string => {
  const bindingSegments: Array<string | number> = [];
  let currentNode: ASTNode | ResolvedASTNode | undefined = node;

  while (currentNode.parent) {
    bindingSegments.push(currentNode.key);
    currentNode = currentNode.parent as ASTNode;
  }

  return bindingSegments.reverse().join('.');
};

export const DataPanel = () => {
  const allBindings: Runtime.PlayerDataBindingRPC['result'] =
    useSelector(selectAllBindings);
  const selectedBinding: Runtime.PlayerDataBindingRPC['result'] = useSelector(
    selectSelectedBinding
  );
  const currentPlayerID = useSelector(selectSelectedPlayerId);
  const dispatch = useDispatch();

  useEffect(() => {
    if (!currentPlayerID) {
      return;
    }

    dispatch({
      type: GET_DATA_BINDING_DETAILS,
      payload: { playerID: currentPlayerID, binding: '' },
    });
  }, [currentPlayerID, dispatch]);

  return (
    <Data
      allBindings={allBindings}
      selectedBinding={selectedBinding}
      onSelect={async (astNode: ASTNode | ResolvedASTNode | undefined) => {
        const binding = astNode
          ? getBindingFromSelectedNode(astNode)
          : undefined;

        if (!currentPlayerID) {
          return;
        }

        if (!binding) {
          dispatch(clearSelectedDataDetails());
          return;
        }

        dispatch({
          type: GET_DATA_BINDING_DETAILS,
          payload: { playerID: currentPlayerID, binding },
        });
      }}
    />
  );
};
