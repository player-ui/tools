import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectConsole,
  selectSelectedPlayerId,
  GET_CONSOLE_EVAL,
  Actions,
} from '@player-tools/devtools-client';
import { Console } from './Console';
import styles from '../app.css';

export const ConsolePanel = () => {
  const consoleState = useSelector(selectConsole);
  const currentPlayerID = useSelector(selectSelectedPlayerId);
  const dispatch = useDispatch();

  if (!currentPlayerID || !consoleState) {
    return <div className={styles.noData}>No console available</div>;
  }

  return (
    <Console
      consoleState={consoleState}
      onClear={() => {
        dispatch(Actions['clear-console']());
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
