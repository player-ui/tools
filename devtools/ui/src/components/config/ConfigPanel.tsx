import React, { useEffect } from 'react';
import {
  selectConfig,
  selectSelectedPlayerId,
  GET_CONFIG_DETAILS,
} from '@player-tools/devtools-client';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../app.css';
import { Config } from './Config';

export const ConfigPanel = () => {
  const currentPlayerID = useSelector(selectSelectedPlayerId);
  const configState = useSelector(selectConfig);

  const dispatch = useDispatch();

  useEffect(() => {
    if (!currentPlayerID) {
      return;
    }

    dispatch({
      type: GET_CONFIG_DETAILS,
      payload: { playerID: currentPlayerID },
    });
  }, [currentPlayerID, dispatch]);

  if (!configState) {
    return <div className={styles.noData}>No config details available</div>;
  }

  return <Config configState={configState} />;
};
