import React from "react";
import { test, vi, describe, expect } from "vitest";
import { ProfilerPlugin } from "..";

vi.mock("../WrapperComponent.tsx", () => ({
  WrapperComponent: vi.fn(),
}));

let count = 2490.0;

const now = vi.fn(() => {
  count += 0.1;
  return count;
});

global.performance = { ...global.performance, now };

class MockPlayer {
  callbacks: any[] = [];

  createHandles() {
    return {
      tap: (name: string, cb: any) => {
        this.callbacks.push(cb);
      },
      intercept: ({ call }: { call: any }) => {
        this.callbacks.push(call);
      },
    };
  }

  hooks = {
    onStart: this.createHandles(),
    flowController: this.createHandles(),
    flow: this.createHandles(),
    viewController: this.createHandles(),
    resolveView: this.createHandles(),
    view: this.createHandles(),
    onUpdate: this.createHandles(),
    parser: this.createHandles(),
    resolver: this.createHandles(),
    templatePlugin: this.createHandles(),
    expressionEvaluator: this.createHandles(),
    resolve: this.createHandles(),
    onError: this.createHandles(),
    dataController: this.createHandles(),
    resolveDataStages: this.createHandles(),
    resolveDefaultValue: this.createHandles(),
    onDelete: this.createHandles(),
    onSet: this.createHandles(),
    onGet: this.createHandles(),
    format: this.createHandles(),
    deformat: this.createHandles(),
    serialize: this.createHandles(),
    schema: this.createHandles(),
    resolveTypeForBinding: this.createHandles(),
    validationController: this.createHandles(),
    createValidatorRegistry: this.createHandles(),
    onAddValidation: this.createHandles(),
    onRemoveValidation: this.createHandles(),
    bindingParser: this.createHandles(),
    skipOptimization: this.createHandles(),
    beforeResolveNode: this.createHandles(),
    state: this.createHandles(),
    onEnd: this.createHandles(),
    resolveFlowContent: this.createHandles(),
  };

  runAllCallbacks() {
    this.callbacks.forEach((cb) => cb({ hooks: this.hooks }));
  }
}

describe("ProfilerPlugin", () => {
  test("profiling all hooks", () => {
    localStorage.setItem("player-ui-devtools-active", "true");
    const plugin = new ProfilerPlugin();
    const mockPlayer = new MockPlayer();
    let props: any;

    plugin.applyReact({
      player: mockPlayer,
      hooks: {
        webComponent: {
          tap: (_: string, cb: any) => {
            props = cb(() => <div />)().props;
          },
        },
      },
    } as any);

    const { startProfiler, stopProfiler } = props;

    startProfiler();

    mockPlayer.runAllCallbacks();

    const result = stopProfiler();

    expect(result).toStrictEqual({
      durations: [
        {
          duration: "0.1000 ms",
          name: "onStart",
        },
        {
          duration: "0.1000 ms",
          name: "flowController",
        },
        {
          duration: "0.1000 ms",
          name: "viewController",
        },
        {
          duration: "0.1000 ms",
          name: "view",
        },
        {
          duration: "0.1000 ms",
          name: "expressionEvaluator",
        },
        {
          duration: "0.1000 ms",
          name: "dataController",
        },
        {
          duration: "0.1000 ms",
          name: "schema",
        },
        {
          duration: "0.1000 ms",
          name: "validationController",
        },
        {
          duration: "0.1000 ms",
          name: "bindingParser",
        },
        {
          duration: "0.1000 ms",
          name: "state",
        },
        {
          duration: "0.1000 ms",
          name: "onEnd",
        },
        {
          duration: "0.1000 ms",
          name: "resolveFlowContent",
        },
      ],
      rootNode: {
        children: [
          {
            children: [],
            endTime: 2490.2999999999997,
            name: "onStart",
            startTime: 2490.2,
            tooltip: "onStart, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2490.4999999999995,
            name: "flowController",
            startTime: 2490.3999999999996,
            tooltip: "flowController, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2490.6999999999994,
            name: "viewController",
            startTime: 2490.5999999999995,
            tooltip: "viewController, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2490.899999999999,
            name: "view",
            startTime: 2490.7999999999993,
            tooltip: "view, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2491.099999999999,
            name: "expressionEvaluator",
            startTime: 2490.999999999999,
            tooltip: "expressionEvaluator, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2491.299999999999,
            name: "dataController",
            startTime: 2491.199999999999,
            tooltip: "dataController, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2491.4999999999986,
            name: "schema",
            startTime: 2491.3999999999987,
            tooltip: "schema, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2491.6999999999985,
            name: "validationController",
            startTime: 2491.5999999999985,
            tooltip: "validationController, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2491.8999999999983,
            name: "bindingParser",
            startTime: 2491.7999999999984,
            tooltip: "bindingParser, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2492.099999999998,
            name: "state",
            startTime: 2491.999999999998,
            tooltip: "state, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2492.299999999998,
            name: "onEnd",
            startTime: 2492.199999999998,
            tooltip: "onEnd, 0.1000 (ms)",
            value: 100,
          },
          {
            children: [],
            endTime: 2492.4999999999977,
            name: "resolveFlowContent",
            startTime: 2492.399999999998,
            tooltip: "resolveFlowContent, 0.1000 (ms)",
            value: 100,
          },
        ],
        endTime: 2492.5999999999976,
        name: "root",
        startTime: 2490.1,
        tooltip: "Profiler total time span 2.5000 (ms)",
        value: 1200,
      },
    });
  });
});
