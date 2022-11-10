import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  type ConsoleState,
  type StoreState,
  selectConsole,
  selectSelectedPlayerId,
  consoleClearAction,
  GET_CONSOLE_EVAL,
} from '@player-tools/devtools-client';
import { Console } from './Console';
import styles from '../app.css';

export const ConsolePanel = () => {
  const consoleState = useSelector<StoreState, ConsoleState | undefined>(
    selectConsole
  );
  const currentPlayerID = useSelector<StoreState, string | null>(
    selectSelectedPlayerId
  );
  const dispatch = useDispatch();

  if (!currentPlayerID || !consoleState) {
    return <div className={styles.noData}>No console available</div>;
  }

  return (
    <Console
      consoleState={consoleState}
      onClear={() => {
        dispatch(consoleClearAction());
      }}
      onExecute={(expression) => {
        dispatch({
          type: GET_CONSOLE_EVAL,
          payload: { playerID: currentPlayerID, expression },
        });
        return expression;
      }}
    />
  );
};
