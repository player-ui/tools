import React from 'react';
import {
  selectProfiler,
  selectSelectedPlayerId,
  START_PROFILER,
  STOP_PROFILER,
} from '@player-tools/devtools-client';
import { useDispatch, useSelector } from 'react-redux';
import { Profiler } from './Profiler';
import styles from '../app.css';

/**
 * displays the profiler panel for a player instance
 * @returns
 */
export const ProfilerPanel = () => {
  const currentPlayerID = useSelector(selectSelectedPlayerId);
  const profiler = useSelector(selectProfiler);
  const dispatch = useDispatch();

  const StartProfiler = () => {
    dispatch({ type: START_PROFILER, payload: { playerID: currentPlayerID } });
  };

  const StopProfiler = () => {
    dispatch({ type: STOP_PROFILER, payload: { playerID: currentPlayerID } });
  };

  if (!currentPlayerID) {
    return <div className={styles.noData}>No player instance available</div>;
  }

  return (
    <Profiler
      profiler={profiler}
      onStart={StartProfiler}
      onStop={StopProfiler}
    />
  );
};
