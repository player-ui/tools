import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectAllBindings,
  selectSelectedBinding,
  selectSelectedPlayerId,
  Actions,
  GET_DATA_BINDING_DETAILS,
} from '@player-tools/devtools-client';
import type { ASTNode, ResolvedASTNode } from '@devtools-ds/object-parser';
import { Data } from './Data';

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
  const allBindings = useSelector(selectAllBindings);
  const selectedBinding = useSelector(selectSelectedBinding);
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
          dispatch(Actions['clear-selected-data-details']());
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
