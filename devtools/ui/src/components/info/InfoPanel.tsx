import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Flow } from '@player-ui/types';
import {
  selectCurrentFlow,
  selectFlowInfo,
  selectSelectedPlayerId,
  Runtime,
  StoreState,
  GET_INFO_DETAILS,
} from '@player-tools/devtools-client';
import { Info } from './Info';
import styles from '../app.css';

/**
 * Displays Current flow information
 * @returns
 */
export const InfoPanel = () => {
  const dispatch = useDispatch();

  const currentPlayerID = useSelector<StoreState, string | null>(
    selectSelectedPlayerId
  );

  const info = useSelector<
    StoreState,
    Runtime.PlayerRuntimeInfoRPC['result'] | null
  >(selectFlowInfo);

  const flow = useSelector<StoreState, Flow | undefined>(selectCurrentFlow);

  React.useEffect(() => {
    if (
      !currentPlayerID ||
      (currentPlayerID && flow && info?.currentFlowState)
    ) {
      return;
    }

    dispatch({
      type: GET_INFO_DETAILS,
      payload: { playerID: currentPlayerID },
    });
  }, [currentPlayerID, dispatch, flow, info?.currentFlowState]);

  if (!info) {
    return <div className={styles.noData}>No view details available</div>;
  }

  return <Info info={info} />;
};
