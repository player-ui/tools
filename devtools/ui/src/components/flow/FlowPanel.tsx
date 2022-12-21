import React from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentFlow } from '@player-tools/devtools-client';
import styles from '../app.css';
import { Flow } from './Flow';

export const FlowPanel = () => {
  const flow = useSelector(selectCurrentFlow);

  if (!flow) {
    return <div className={styles.noData}>No flow details available</div>;
  }

  return <Flow flow={flow} />;
};
