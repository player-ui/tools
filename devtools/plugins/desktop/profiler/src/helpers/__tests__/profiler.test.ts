import { describe, expect, test, vi } from "vitest";
import { profiler } from "..";
import { ProfilerNode } from "../../types";

// mock performance.now
let count = 2490.0;
const now = vi.fn(() => {
  count += 0.1;
  return count;
});
global.performance = { ...global.performance, now };

describe("Profiler", () => {
  test("starts the profiler, keep track of the events, and return the profiler tree", () => {
    const { startTimer, endTimer, stopProfiler, start } = profiler();

    start();

    // process with no children
    startTimer("process1");
    endTimer({ hookName: "process1" });

    // process with children
    const parentNode: ProfilerNode = {
      name: "process2",
      children: [],
    };

    startTimer("process2");
    startTimer("process2.1");
    startTimer("process2.2");
    endTimer({ hookName: "process2.1", parentNode });
    endTimer({ hookName: "process2.2", parentNode });
    endTimer({ hookName: "process2", children: parentNode.children });

    const rootNode = stopProfiler();

    expect(rootNode).toStrictEqual({
      durations: [
        { name: "process2", duration: "0.5000" },
        { name: "process2.1", duration: "0.2000" },
        { name: "process2.2", duration: "0.2000" },
        { name: "process1", duration: "0.1000" },
      ],
      rootNode: {
        children: [
          {
            children: [],
            endTime: 2490.2999999999997,
            name: "process1",
            startTime: 2490.2,
            tooltip: "process1, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [
              {
                children: [],
                endTime: 2490.6999999999994,
                name: "process2.1",
                startTime: 2490.4999999999995,
                tooltip: "process2.1, 0.2000 (ms)",
                value: 200,
              },
              {
                children: [],
                endTime: 2490.7999999999993,
                name: "process2.2",
                startTime: 2490.5999999999995,
                tooltip: "process2.2, 0.2000 (ms)",
                value: 200,
              },
            ],
            endTime: 2490.899999999999,
            name: "process2",
            startTime: 2490.3999999999996,
            tooltip: "process2, 0.5000 (ms)",
            value: 500,
          },
        ],
        endTime: 2490.999999999999,
        name: "root",
        startTime: 2490.1,
        tooltip: "Profiler total time span 0.9000 (ms)",
        value: 900,
      },
    });

    // (re)start
    start();
    const { rootNode: rootNode2, durations } = stopProfiler();

    expect(durations).toStrictEqual([]);

    expect(rootNode2).toStrictEqual({
      name: "root",
      endTime: 2491.199999999999,
      startTime: 2491.099999999999,
      tooltip: "Profiler total time span 0.1000 (ms)",
      value: 100,
      children: [],
    });
  });
});
