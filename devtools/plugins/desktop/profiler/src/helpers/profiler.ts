import type { ProfilerNode } from "../types";

export const profiler = () => {
  let rootNode: ProfilerNode = {
    name: "root",
    children: [],
  };

  let record: { [key: string]: number[] } = {};
  let durations: { hookName: string; duration: number }[] = [];

  const start = () => {
    rootNode = {
      name: "root",
      startTime: performance.now(),
      children: [],
    };
    record = {};
    durations = [];
  };

  const addNodeToTree = (newNode: ProfilerNode, parentNode: ProfilerNode) => {
    parentNode.children.push(newNode);
    return newNode;
  };

  const startTimer = (hookName: string) => {
    const startTime = performance.now();

    if (!record[hookName] || record[hookName].length === 2) {
      record[hookName] = [];
      record[hookName].push(startTime);
    }
  };

  const endTimer = ({
    hookName,
    parentNode = rootNode,
    children,
  }: {
    hookName: string;
    parentNode?: ProfilerNode;
    children?: ProfilerNode[];
  }) => {
    let startTime: number | undefined;
    let duration: number | undefined;

    const endTime = performance.now();

    for (const key in record) {
      if (key === hookName && record[key].length === 1) {
        [startTime] = record[key];
        duration = endTime - startTime;
        record[key].push(endTime);
      }
    }

    const value = Math.ceil((duration || 0.01) * 1000);

    const newNode: ProfilerNode = {
      name: hookName,
      startTime,
      endTime,
      value,
      tooltip: `${hookName}, ${(duration || 0.01).toFixed(4)} (ms)`,
      children: children ?? [],
    };

    addNodeToTree(newNode, parentNode);

    // Push the hookName and duration into durations array
    durations.push({ hookName, duration: duration ? duration : 0.01 });

    return newNode;
  };

  const stopProfiler = (): {
    rootNode: ProfilerNode;
    durations: { name: string; duration: string }[];
  } => {
    const endTime = performance.now();
    const totalTime = endTime - (rootNode.startTime ?? 0);

    rootNode.endTime = endTime;
    rootNode.value = Math.ceil((totalTime || 0.01) * 1000);
    rootNode.tooltip = `Profiler total time span ${totalTime.toFixed(4)} (ms)`;

    // Sort durations array in descending order
    durations.sort((a, b) => b.duration - a.duration);

    return {
      rootNode,
      durations: durations.map(({ hookName, duration }) => ({
        name: hookName,
        duration: duration.toFixed(4),
      })),
    };
  };

  return {
    start,
    startTimer,
    endTimer,
    stopProfiler,
  };
};
