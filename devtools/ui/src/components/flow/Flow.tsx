import React from 'react';
import { ObjectInspector } from '@devtools-ds/object-inspector';
import type { Flow as FlowType } from '@player-ui/types';
import styles from './flow.css';

interface FlowProps {
  flow: FlowType;
}

export const Flow = ({ flow }: FlowProps) => {
  return (
    <div className={styles['flow-panel-wrapper']}>
      <ObjectInspector includePrototypes={false} expandLevel={6} data={flow} />
    </div>
  );
};
