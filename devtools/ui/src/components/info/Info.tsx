import React from "react";
import type { Runtime } from "@player-tools/devtools-common";
import { Button } from "@chakra-ui/react";
import copy from "copy-to-clipboard";
import styles from "../sidebar.css";

interface InfoProps {
  readonly info: Runtime.PlayerRuntimeInfoRPC["result"];
}

/**
 * Displays Current flow information
 * @returns
 */
export const Info = ({ info }: InfoProps) => {
  const copyFlowToClipboard = () => {
    info && copy(JSON.stringify(info.currentFlow, null, 2));
  };

  return (
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
            <Button colorScheme="blue" onClick={copyFlowToClipboard}>
              Copy Flow
            </Button>
          </li>
        </ul>
      ) : (
        <p>No flow information available for this player instance.</p>
      )}
    </section>
  );
};
