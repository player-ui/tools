import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  type StoreState,
  selectedPlayerAction,
  selectPlayerIds,
  selectSelectedPlayerId,
  selectPlayerVersion,
} from '@player-tools/devtools-common';
import logo from '../media/player-logo.png';
import { InfoPanel } from './info';
import styles from './sidebar.css';

/**
 * Sidebar component for showing running player instances and flow information.
 * @returns
 */
export const Sidebar = () => {
  const dispatch = useDispatch();
  const playerIDs = useSelector<StoreState, Array<string>>(selectPlayerIds);
  const selectedPlayerID = useSelector<StoreState, string | null>(
    selectSelectedPlayerId
  );
  const playerVersion = useSelector<StoreState, string | undefined>(
    selectPlayerVersion
  );

  const details = selectedPlayerID ? (
    <section>
      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className={styles.selectPlayerLabel} htmlFor="player-select">
        Select a player instance
      </label>
      <select
        className={styles.selectPlayer}
        name="playerInstances"
        id="player-select"
        value={selectedPlayerID}
        onChange={(event) => {
          dispatch(selectedPlayerAction(event.target.value));
        }}
      >
        {playerIDs.map((playerID) => (
          <option key={playerID} value={playerID}>
            {playerID}
          </option>
        ))}
      </select>
      <InfoPanel />
    </section>
  ) : (
    <p className={styles.noPlayer}>No player instances found</p>
  );
  return (
    <div className={styles.sidebar}>
      <section className={styles.titleContainer}>
        <img className={styles.logo} src={logo} alt="Player Logo" />
        <h2 className={styles.title}>Player Devtools</h2>
      </section>
      {playerVersion ? (
        <section>
          <p>
            <span className={styles.infoTitle}>Player Version:</span>
            <span>{playerVersion}</span>
          </p>
        </section>
      ) : null}
      {details}
    </div>
  );
};
