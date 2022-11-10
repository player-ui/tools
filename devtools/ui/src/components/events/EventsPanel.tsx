import React from 'react';
import { useSelector } from 'react-redux';
import { type Runtime, selectEvents } from '@player-tools/devtools-common';
import { Events } from './Events';
import styles from '../app.css';

export const EventsPanel = () => {
  const events: Array<
    | Runtime.PlayerDataChangeEvent
    | Runtime.PlayerLogEvent
    | Runtime.PlayerFlowStartEvent
  > = useSelector(selectEvents);

  if (!events || !events.length) {
    return <div className={styles.noData}>No events available</div>;
  }

  return <Events events={events} />;
};
