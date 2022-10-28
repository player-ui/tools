import React, { useEffect } from 'react';
import {
  Runtime,
  selectConfig,
  selectSelectedPlayerId,
  StoreState,
  GET_CONFIG_DETAILS,
} from '@player-tools/devtools-client';
import { useDispatch, useSelector } from 'react-redux';
import styles from '../app.css';
import { Config } from './Config';

export const SUB_PANEL_IDS = ['plugins', 'schema', 'expressions'] as const;

export const ConfigPanel = () => {
  const currentPlayerID = useSelector<StoreState, string | null>(
    selectSelectedPlayerId
  );
  const configState = useSelector<
    StoreState,
    Runtime.PlayerConfigRPC['result']
  >(selectConfig);

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
