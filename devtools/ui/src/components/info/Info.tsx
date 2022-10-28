import React from 'react';
import { Runtime } from '@player-tools/devtools-common';
import styles from '../sidebar.css';
import { Button } from '@chakra-ui/react';
import copy from 'copy-to-clipboard';

interface InfoProps {
  info: Runtime.PlayerRuntimeInfoRPC['result'];
}

/**
 * Displays Current flow information
 * @returns
 */
export const Info = ({ info }: InfoProps) => (
  <section>
    <h3>Flow Info</h3>
    {info?.currentFlowState ? (
      <ul className={styles.infoSection}>
        <li>
          <p className={styles.infoTitle}>Flow Id</p>
          <p>{info?.currentFlowID}</p>
        </li>
        <li>
          <p className={styles.infoTitle}>View Id</p>
          <p>{info?.currentViewID}</p>
        </li>
        <li>
          <p className={styles.infoTitle}>Flow State</p>
          <p>{info?.currentFlowState}</p>
        </li>
        <li>
          <Button
            colorScheme="blue"
            onClick={() => {
              copy(JSON.stringify(info.currentFlow, null, 2));
            }}
          >
            Copy Flow
          </Button>
        </li>
      </ul>
    ) : (
      <p>No flow information available for this player instance.</p>
    )}
  </section>
);
