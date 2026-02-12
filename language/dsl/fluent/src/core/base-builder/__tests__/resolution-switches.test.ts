import { describe, test, expect, beforeEach, vi } from "vitest";
import type { BaseBuildContext, SwitchMetadata } from "../types";
import { StorageKeys } from "../types";
import { AuxiliaryStorage } from "../storage/auxiliary-storage";
import { resolveSwitches } from "../resolution/steps/switches";

// Mock setValueAtPath for path resolution testing
vi.mock("../resolution/path-resolver", () => ({
  setValueAtPath: vi.fn((result, path, value) => {
    if (path.length === 1) {
      result[String(path[0])] = value;
    } else if (path.length === 2) {
      const key = String(path[0]);
      if (!result[key]) result[key] = [];
      (result[key] as unknown[])[path[1] as number] = value;
    }
  }),
}));

import { setValueAtPath } from "../resolution/path-resolver";

describe("resolveSwitches - Case Index Tracking", () => {
  let auxiliaryStorage: AuxiliaryStorage;
  let arrayProperties: ReadonlySet<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    auxiliaryStorage = new AuxiliaryStorage();
    arrayProperties = new Set(["values"]);
  });

  test("starts global case index at 0", () => {
    let capturedCaseIndex: number | undefined;

    const switchFn = vi.fn((_ctx: BaseBuildContext, caseIndex: number) => {
      capturedCaseIndex = caseIndex;
      return {
        staticSwitch: [{ case: true, asset: { id: "test-1", type: "text" } }],
      };
    });

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["value"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(capturedCaseIndex).toBe(0);
  });

  test("increments by number of cases in first switch", () => {
    const capturedCaseIndices: number[] = [];

    const firstSwitchFn = vi.fn((_ctx: BaseBuildContext, caseIndex: number) => {
      capturedCaseIndices.push(caseIndex);
      return {
        staticSwitch: [
          { case: "cond1", asset: { id: "test-1", type: "text" } },
          { case: "cond2", asset: { id: "test-2", type: "text" } },
          { case: true, asset: { id: "test-3", type: "text" } },
        ],
      };
    });

    const secondSwitchFn = vi.fn(
      (_ctx: BaseBuildContext, caseIndex: number) => {
        capturedCaseIndices.push(caseIndex);
        return {
          staticSwitch: [{ case: true, asset: { id: "test-4", type: "text" } }],
        };
      },
    );

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["value"], switchFn: firstSwitchFn },
      { path: ["label"], switchFn: secondSwitchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(capturedCaseIndices).toEqual([0, 3]); // Second switch starts at index 3
  });

  test("correctly offsets second switch case indices", () => {
    const capturedCaseIndices: number[] = [];

    const createSwitchFn =
      (numCases: number) => (_ctx: BaseBuildContext, caseIndex: number) => {
        capturedCaseIndices.push(caseIndex);
        return {
          staticSwitch: Array(numCases)
            .fill(null)
            .map((_, i) => ({
              case: i === numCases - 1 ? true : `cond${i}`,
              asset: { id: `test-${i}`, type: "text" },
            })),
        };
      };

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["value"], switchFn: createSwitchFn(2) },
      { path: ["label"], switchFn: createSwitchFn(3) },
      { path: ["title"], switchFn: createSwitchFn(1) },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    // First: 0, Second: 0+2=2, Third: 2+3=5
    expect(capturedCaseIndices).toEqual([0, 2, 5]);
  });

  test("handles switches with varying case counts", () => {
    const capturedCaseIndices: number[] = [];

    // Switch with 5 cases
    const largeSwitchFn = vi.fn((_ctx: BaseBuildContext, caseIndex: number) => {
      capturedCaseIndices.push(caseIndex);
      return {
        staticSwitch: [
          { case: "c1", asset: { id: "1" } },
          { case: "c2", asset: { id: "2" } },
          { case: "c3", asset: { id: "3" } },
          { case: "c4", asset: { id: "4" } },
          { case: true, asset: { id: "5" } },
        ],
      };
    });

    // Switch with 1 case
    const smallSwitchFn = vi.fn((_ctx: BaseBuildContext, caseIndex: number) => {
      capturedCaseIndices.push(caseIndex);
      return {
        dynamicSwitch: [{ case: true, asset: { id: "6" } }],
      };
    });

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["large"], switchFn: largeSwitchFn },
      { path: ["small"], switchFn: smallSwitchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(capturedCaseIndices).toEqual([0, 5]);
  });
});

describe("resolveSwitches - Array Property Wrapping", () => {
  let auxiliaryStorage: AuxiliaryStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    auxiliaryStorage = new AuxiliaryStorage();
  });

  test("wraps switch result in array for array properties", () => {
    const arrayProperties = new Set(["values"]);

    const switchFn = vi.fn(() => ({
      staticSwitch: [{ case: true, asset: { id: "test", type: "text" } }],
    }));

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["values"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    // Should wrap in array when path.length === 1 and property is array type
    expect(setValueAtPath).toHaveBeenCalledWith(
      result,
      ["values"],
      [{ staticSwitch: [{ case: true, asset: { id: "test", type: "text" } }] }],
    );
  });

  test("does not wrap for non-array properties", () => {
    const arrayProperties = new Set(["values"]);

    const switchFn = vi.fn(() => ({
      staticSwitch: [{ case: true, asset: { id: "test", type: "text" } }],
    }));

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["label"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    // Should NOT wrap because 'label' is not in arrayProperties
    expect(setValueAtPath).toHaveBeenCalledWith(result, ["label"], {
      staticSwitch: [{ case: true, asset: { id: "test", type: "text" } }],
    });
  });

  test("does not wrap when path length > 1", () => {
    const arrayProperties = new Set(["values"]);

    const switchFn = vi.fn(() => ({
      staticSwitch: [{ case: true, asset: { id: "test", type: "text" } }],
    }));

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["values", 0], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = { values: [] };
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    // Should NOT wrap because path.length > 1 (specific element)
    expect(setValueAtPath).toHaveBeenCalledWith(result, ["values", 0], {
      staticSwitch: [{ case: true, asset: { id: "test", type: "text" } }],
    });
  });
});

describe("resolveSwitches - Path Resolution", () => {
  let auxiliaryStorage: AuxiliaryStorage;
  let arrayProperties: ReadonlySet<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    auxiliaryStorage = new AuxiliaryStorage();
    arrayProperties = new Set();
  });

  test("sets value at single-segment path", () => {
    const switchFn = vi.fn(() => ({
      staticSwitch: [{ case: true, asset: { id: "test" } }],
    }));

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["value"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(setValueAtPath).toHaveBeenCalledWith(
      result,
      ["value"],
      expect.objectContaining({ staticSwitch: expect.any(Array) }),
    );
  });

  test("sets value at multi-segment path", () => {
    const switchFn = vi.fn(() => ({
      staticSwitch: [{ case: true, asset: { id: "test" } }],
    }));

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["nested", "deep"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(setValueAtPath).toHaveBeenCalledWith(
      result,
      ["nested", "deep"],
      expect.objectContaining({ staticSwitch: expect.any(Array) }),
    );
  });
});

describe("resolveSwitches - Edge Cases", () => {
  let auxiliaryStorage: AuxiliaryStorage;
  let arrayProperties: ReadonlySet<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    auxiliaryStorage = new AuxiliaryStorage();
    arrayProperties = new Set();
  });

  test("returns early when no switches in storage", () => {
    // Don't set any switches
    const result: Record<string, unknown> = { existingValue: "test" };
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    // Result should be unchanged
    expect(result).toEqual({ existingValue: "test" });
    expect(setValueAtPath).not.toHaveBeenCalled();
  });

  test("returns early when empty switches array in storage", () => {
    auxiliaryStorage.set(StorageKeys.SWITCHES, []);

    const result: Record<string, unknown> = { existingValue: "test" };
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(result).toEqual({ existingValue: "test" });
    expect(setValueAtPath).not.toHaveBeenCalled();
  });

  test("returns early when no context provided", () => {
    const switchFn = vi.fn(() => ({
      staticSwitch: [{ case: true, asset: { id: "test" } }],
    }));

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["value"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};

    resolveSwitches(auxiliaryStorage, result, undefined, arrayProperties);

    expect(switchFn).not.toHaveBeenCalled();
    expect(setValueAtPath).not.toHaveBeenCalled();
  });

  test("handles dynamicSwitch correctly", () => {
    const capturedCaseIndex: number[] = [];

    const firstSwitchFn = vi.fn((_ctx: BaseBuildContext, caseIndex: number) => {
      capturedCaseIndex.push(caseIndex);
      return {
        dynamicSwitch: [
          { case: "cond", asset: { id: "1" } },
          { case: true, asset: { id: "2" } },
        ],
      };
    });

    const secondSwitchFn = vi.fn(
      (_ctx: BaseBuildContext, caseIndex: number) => {
        capturedCaseIndex.push(caseIndex);
        return {
          staticSwitch: [{ case: true, asset: { id: "3" } }],
        };
      },
    );

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["first"], switchFn: firstSwitchFn },
      { path: ["second"], switchFn: secondSwitchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "test" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    // First has 2 cases (dynamicSwitch), second starts at index 2
    expect(capturedCaseIndex).toEqual([0, 2]);
  });
});

describe("resolveSwitches - Context Creation", () => {
  let auxiliaryStorage: AuxiliaryStorage;
  let arrayProperties: ReadonlySet<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    auxiliaryStorage = new AuxiliaryStorage();
    arrayProperties = new Set();
  });

  test("creates switch context with property name in parentId", () => {
    let capturedContext: BaseBuildContext | undefined;

    const switchFn = vi.fn((ctx: BaseBuildContext) => {
      capturedContext = ctx;
      return { staticSwitch: [{ case: true, asset: { id: "test" } }] };
    });

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["label"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: "parent" };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.parentId).toBe("parent-label");
    expect(capturedContext?.branch).toBeUndefined();
  });

  test("handles context without parentId", () => {
    let capturedContext: BaseBuildContext | undefined;

    const switchFn = vi.fn((ctx: BaseBuildContext) => {
      capturedContext = ctx;
      return { staticSwitch: [{ case: true, asset: { id: "test" } }] };
    });

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["label"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = { parentId: undefined };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.parentId).toBe("label");
  });

  test("clears branch from switch context", () => {
    let capturedContext: BaseBuildContext | undefined;

    const switchFn = vi.fn((ctx: BaseBuildContext) => {
      capturedContext = ctx;
      return { staticSwitch: [{ case: true, asset: { id: "test" } }] };
    });

    const switches: SwitchMetadata<BaseBuildContext>[] = [
      { path: ["value"], switchFn },
    ];
    auxiliaryStorage.set(StorageKeys.SWITCHES, switches);

    const result: Record<string, unknown> = {};
    const context: BaseBuildContext = {
      parentId: "parent",
      branch: { type: "slot", name: "test" },
    };

    resolveSwitches(auxiliaryStorage, result, context, arrayProperties);

    expect(capturedContext).toBeDefined();
    expect(capturedContext?.branch).toBeUndefined();
  });
});
