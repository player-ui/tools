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
    const { startTimer, endTimer, stopProfiler, reset } = profiler();

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
      children: [
        {
          children: [],
          endTime: 2490.2,
          name: "process1",
          startTime: 2490.1,
          tooltip: "process1, 0.1000 (ms), 13.00%",
          value: 13,
        },
        {
          children: [
            {
              children: [],
              endTime: 2490.5999999999995,
              name: "process2.1",
              startTime: 2490.3999999999996,
              tooltip: "process2.1, 0.2000 (ms), 25.00%",
              value: 25,
            },
            {
              children: [],
              endTime: 2490.6999999999994,
              name: "process2.2",
              startTime: 2490.4999999999995,
              tooltip: "process2.2, 0.2000 (ms), 25.00%",
              value: 25,
            },
          ],
          endTime: 2490.7999999999993,
          name: "process2",
          startTime: 2490.2999999999997,
          tooltip: "process2, 0.5000 (ms), 63.00%",
          value: 63,
        },
      ],
      endTime: 2490.899999999999,
      name: "root",
      startTime: 2490.1,
      tooltip: "root, 0.8000 (ms), 100.00%",
      value: 100,
    });

    // reset
    reset();

    expect(rootNode).toStrictEqual({
      name: "root",
      children: [],
    });
  });
});
