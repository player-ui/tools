import React from 'react';
import { useSelector } from 'react-redux';
import type { Flow as FlowType } from '@player-ui/types';
import {
  type StoreState,
  selectCurrentFlow,
} from '@player-tools/devtools-common';
import styles from '../app.css';
import { Flow } from './Flow';

export const FlowPanel = () => {
  const flow = useSelector<StoreState, FlowType | undefined>(selectCurrentFlow);

  if (!flow) {
    return <div className={styles.noData}>No flow details available</div>;
  }

  return <Flow flow={flow} />;
};
