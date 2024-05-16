import type { ProfilerNode } from "../types";

/** Profiler to record the performance of hooks */
export const profiler = () => {
  const rootNode: ProfilerNode = {
    name: "root",
    children: [],
  };

  const record: { [key: string]: number[] } = {};

  /** add newNode to its parent's children array */
  const addNodeToTree = (newNode: ProfilerNode, parentNode: ProfilerNode) => {
    parentNode.children.push(newNode);
    return newNode;
  };

  /** start timer and save start time in the record */
  const startTimer = (hookName: string) => {
    const startTime = performance.now();

    if (!rootNode.startTime) {
      rootNode.startTime = startTime;
    }

    if (!record[hookName] || record[hookName].length === 2) {
      // eslint-disable-next-line no-param-reassign
      record[hookName] = [];
      record[hookName].push(startTime);
    }
  };

  /** end timer and calculate duration */
  const endTimer = ({
    hookName,
    parentNode = rootNode,
    children,
  }: {
    hookName: string;
    parentNode?: ProfilerNode;
    children?: ProfilerNode[];
  }) => {
    let startTime;
    let duration;
    const endTime = performance.now();
    for (const key in record) {
      if (key === hookName && record[key].length === 1) {
        [startTime] = record[key];
        duration = endTime - startTime;
        record[key].push(endTime);
      }
    }

    const newNode: ProfilerNode = {
      name: hookName,
      startTime,
      endTime,
      // values will be calculated on stopProfiler, so they represent
      // the percentage of time spent based on the total
      value: 0,
      tooltip: `${hookName}, ${(duration ? duration : 0.01).toFixed(4)} (ms)`,
      children: children ?? [],
    };

    addNodeToTree(newNode, parentNode);

    return newNode;
  };

  const reset = () => {
    rootNode.children = [];
  };

  const stopProfiler = () => {
    rootNode.endTime = performance.now();
    if (rootNode.startTime) {
      const totalDuration = rootNode.endTime - rootNode.startTime;

      // set the value of each node based on the total duration (% of time spent in that node)
      const calculateValue = (node: ProfilerNode) => {
        if (node.children.length === 0) {
          const value =
            (((node.endTime ?? 0) - (node.startTime ?? 0)) / totalDuration) *
            100;
          node.value = Math.ceil(value);
        } else {
          const childrenValue = node.children.reduce((sum, child) => {
            calculateValue(child);
            return sum + (child.value ?? 0);
          }, 0);
          const nodeValue =
            (((node.endTime ?? 0) - (node.startTime ?? 0)) / totalDuration) *
            100;
          node.value = Math.ceil(Math.max(nodeValue, childrenValue));
        }
        node.tooltip = `${node.name}, ${(
          (node.endTime ?? 0) - (node.startTime ?? 0)
        ).toFixed(4)} (ms), ${node.value.toFixed(2)}%`;
      };

      calculateValue(rootNode);
    }
    return rootNode;
  };

  return {
    startTimer,
    endTimer,
    stopProfiler,
    reset,
  };
};
