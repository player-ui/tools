import { describe, test, expect } from "vitest";
import type { Flow } from "@player-ui/react";
import { flowDiff } from "../flowDiff";

const mockFlow1: Flow = {
  id: "flow",
  views: [
    {
      id: "view",
      type: "info",
    },
  ],
  data: {
    foo: "bar",
  },
  navigation: {
    BEGIN: "BEGIN",
  },
};

const mockFlow2: Flow = {
  id: "flow",
  views: [
    {
      id: "view",
      type: "info",
    },
  ],
  data: {
    foo: "bar",
    something: "else",
  },
  navigation: {
    BEGIN: "BEGIN",
  },
};

const mockFlow3: Flow = {
  id: "another_flow",
  views: [
    {
      id: "view",
      type: "info",
    },
  ],
  data: {
    foo: "bar",
  },
  navigation: {
    BEGIN: "BEGIN",
  },
};

describe("flowDiff", () => {
  test("returns null if no changes", () => {
    const result = flowDiff({ curr: mockFlow1, next: mockFlow1 });

    expect(result).toBeNull();
  });

  test("returns flow change if base flow is different", () => {
    const result = flowDiff({ curr: mockFlow1, next: mockFlow3 });

    expect(result).toEqual({ change: "flow", value: mockFlow3 });
  });

  test("returns data change if data is different", () => {
    const result = flowDiff({ curr: mockFlow1, next: mockFlow2 });

    expect(result).toEqual({ change: "data", value: mockFlow2.data });
  });
});
