import React from 'react';
import { useSelector } from 'react-redux';
import { selectEvents } from '@player-tools/devtools-client';
import { Events } from './Events';
import styles from '../app.css';

export const EventsPanel = () => {
  const events = useSelector(selectEvents);

  if (!events || !events.length) {
    return <div className={styles.noData}>No events available</div>;
  }

  return <Events events={events} />;
};
