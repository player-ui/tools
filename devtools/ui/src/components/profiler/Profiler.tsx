import React from "react";
import { FlameGraph } from "react-flame-graph";
import { ObjectInspector } from "@devtools-ds/object-inspector";
import type { ProfilerNode } from "@player-tools/devtools-common";
import styles from "../app.css";

interface ProfilerProps {
  profiler?: ProfilerNode;
  onStart: () => void;
  onStop: () => void;
}

/**
 * displays the profiler panel for a player instance
 * @returns
 */
export const Profiler = ({ profiler, onStart, onStop }: ProfilerProps) => (
  <div>
    <button type="button" onClick={onStart}>
      {" "}
      Start Profiler{" "}
    </button>
    <button type="button" onClick={onStop}>
      {" "}
      Stop Profiler{" "}
    </button>

    {profiler?.value ? (
      <FlameGraph data={profiler} height={200} width={500} />
    ) : (
      <div className={styles.noData}>No flame chart available</div>
    )}

    {profiler ? (
      <ObjectInspector
        data={profiler}
        includePrototypes={false}
        expandLevel={4}
      />
    ) : (
      <div className={styles.noData}>No profiler details available</div>
    )}
  </div>
);
