import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCurrentFlow,
  selectFlowInfo,
  selectSelectedPlayerId,
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

  const currentPlayerID = useSelector(selectSelectedPlayerId);
  const info = useSelector(selectFlowInfo);
  const flow = useSelector(selectCurrentFlow);

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
