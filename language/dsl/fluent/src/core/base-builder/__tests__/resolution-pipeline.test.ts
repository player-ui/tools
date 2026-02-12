import { describe, test, expect, beforeEach, vi } from "vitest";
import type { BaseBuildContext } from "../types";
import { ValueStorage } from "../storage/value-storage";
import { AuxiliaryStorage } from "../storage/auxiliary-storage";
import { executeBuildPipeline } from "../resolution/pipeline";

// Mock the resolution steps
vi.mock("../resolution/steps/static-values", () => ({
  resolveStaticValues: vi.fn(),
}));

vi.mock("../resolution/steps/asset-id", () => ({
  generateAssetIdForBuilder: vi.fn(),
}));

vi.mock("../resolution/steps/asset-wrappers", () => ({
  resolveAssetWrappers: vi.fn(),
}));

vi.mock("../resolution/steps/mixed-arrays", () => ({
  resolveMixedArrays: vi.fn(),
}));

vi.mock("../resolution/steps/builders", () => ({
  resolveBuilders: vi.fn(),
}));

vi.mock("../resolution/steps/switches", () => ({
  resolveSwitches: vi.fn(),
}));

vi.mock("../resolution/steps/templates", () => ({
  resolveTemplates: vi.fn(),
}));

import { resolveStaticValues } from "../resolution/steps/static-values";
import { generateAssetIdForBuilder } from "../resolution/steps/asset-id";
import { resolveAssetWrappers } from "../resolution/steps/asset-wrappers";
import { resolveMixedArrays } from "../resolution/steps/mixed-arrays";
import { resolveBuilders } from "../resolution/steps/builders";
import { resolveSwitches } from "../resolution/steps/switches";
import { resolveTemplates } from "../resolution/steps/templates";

interface TestType {
  id?: string;
  type?: string;
  value?: string;
  label?: string;
}

describe("executeBuildPipeline", () => {
  let valueStorage: ValueStorage<TestType>;
  let auxiliaryStorage: AuxiliaryStorage;
  let arrayProperties: ReadonlySet<string>;

  beforeEach(() => {
    vi.clearAllMocks();
    valueStorage = new ValueStorage<TestType>();
    auxiliaryStorage = new AuxiliaryStorage();
    arrayProperties = new Set(["values"]);
  });

  test("executes all 8 steps in correct order", () => {
    const callOrder: string[] = [];

    vi.mocked(resolveStaticValues).mockImplementation(() => {
      callOrder.push("resolveStaticValues");
    });
    vi.mocked(generateAssetIdForBuilder).mockImplementation(() => {
      callOrder.push("generateAssetIdForBuilder");
    });
    vi.mocked(resolveAssetWrappers).mockImplementation(() => {
      callOrder.push("resolveAssetWrappers");
    });
    vi.mocked(resolveMixedArrays).mockImplementation(() => {
      callOrder.push("resolveMixedArrays");
    });
    vi.mocked(resolveBuilders).mockImplementation(() => {
      callOrder.push("resolveBuilders");
    });
    vi.mocked(resolveSwitches).mockImplementation(() => {
      callOrder.push("resolveSwitches");
    });
    vi.mocked(resolveTemplates).mockImplementation(() => {
      callOrder.push("resolveTemplates");
    });

    const context: BaseBuildContext = { parentId: "test" };
    executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      undefined,
      context,
      arrayProperties,
    );

    expect(callOrder).toEqual([
      "resolveStaticValues",
      "generateAssetIdForBuilder",
      "resolveAssetWrappers",
      "resolveMixedArrays",
      "resolveBuilders",
      "resolveSwitches",
      "resolveTemplates",
    ]);
  });

  test("merges defaults into result", () => {
    const defaults: Partial<TestType> = {
      type: "test",
      id: "default-id",
    };

    const result = executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      defaults,
      undefined,
      arrayProperties,
    );

    expect(result).toMatchObject({
      type: "test",
      id: "default-id",
    });
  });

  test("handles empty storage gracefully", () => {
    const emptyValueStorage = new ValueStorage<TestType>();
    const emptyAuxiliaryStorage = new AuxiliaryStorage();

    const result = executeBuildPipeline(
      emptyValueStorage,
      emptyAuxiliaryStorage,
      undefined,
      undefined,
      new Set(),
    );

    expect(result).toEqual({});
    expect(resolveStaticValues).toHaveBeenCalled();
  });

  test("passes correct context to nested steps", () => {
    const context: BaseBuildContext = { parentId: "parent-1" };

    // Mock generateAssetIdForBuilder to set the id in result
    vi.mocked(generateAssetIdForBuilder).mockImplementation(
      (_storage, result) => {
        (result as Record<string, unknown>).id = "parent-1-test";
      },
    );

    executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      undefined,
      context,
      arrayProperties,
    );

    // Verify resolveAssetWrappers receives nested context with parentId
    expect(resolveAssetWrappers).toHaveBeenCalledWith(
      valueStorage,
      expect.objectContaining({ id: "parent-1-test" }),
      expect.objectContaining({ parentId: "parent-1-test", branch: undefined }),
    );
  });

  test("passes arrayProperties to resolveSwitches", () => {
    const context: BaseBuildContext = { parentId: "test" };
    const customArrayProps = new Set(["values", "actions", "items"]);

    executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      undefined,
      context,
      customArrayProps,
    );

    expect(resolveSwitches).toHaveBeenCalledWith(
      auxiliaryStorage,
      expect.any(Object),
      expect.any(Object),
      customArrayProps,
    );
  });
});

describe("createNestedParentContext", () => {
  // Test the context creation logic directly through executeBuildPipeline behavior

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("creates context with parentId from generated asset ID", () => {
    const valueStorage = new ValueStorage<TestType>();
    const auxiliaryStorage = new AuxiliaryStorage();
    const context: BaseBuildContext = { parentId: "root" };

    // Simulate generating an ID
    vi.mocked(generateAssetIdForBuilder).mockImplementation(
      (_storage, result) => {
        (result as Record<string, unknown>).id = "root-test";
      },
    );

    let capturedNestedContext: BaseBuildContext | undefined;
    vi.mocked(resolveAssetWrappers).mockImplementation(
      (_storage, _result, nestedCtx) => {
        capturedNestedContext = nestedCtx;
      },
    );

    executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      undefined,
      context,
      new Set(),
    );

    expect(capturedNestedContext).toBeDefined();
    expect(capturedNestedContext?.parentId).toBe("root-test");
  });

  test("clears branch from nested context", () => {
    const valueStorage = new ValueStorage<TestType>();
    const auxiliaryStorage = new AuxiliaryStorage();
    const context: BaseBuildContext = {
      parentId: "root",
      branch: { type: "slot", name: "label" },
    };

    vi.mocked(generateAssetIdForBuilder).mockImplementation(
      (_storage, result) => {
        (result as Record<string, unknown>).id = "root-label-test";
      },
    );

    let capturedNestedContext: BaseBuildContext | undefined;
    vi.mocked(resolveAssetWrappers).mockImplementation(
      (_storage, _result, nestedCtx) => {
        capturedNestedContext = nestedCtx;
      },
    );

    executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      undefined,
      context,
      new Set(),
    );

    expect(capturedNestedContext).toBeDefined();
    expect(capturedNestedContext?.branch).toBeUndefined();
  });

  test("returns undefined when no parent context", () => {
    const valueStorage = new ValueStorage<TestType>();
    const auxiliaryStorage = new AuxiliaryStorage();

    let capturedNestedContext: BaseBuildContext | undefined = {
      parentId: "should-be-cleared",
    };
    vi.mocked(resolveAssetWrappers).mockImplementation(
      (_storage, _result, nestedCtx) => {
        capturedNestedContext = nestedCtx;
      },
    );

    executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      undefined,
      undefined, // No context
      new Set(),
    );

    expect(capturedNestedContext).toBeUndefined();
  });

  test("preserves other context properties in nested context", () => {
    const valueStorage = new ValueStorage<TestType>();
    const auxiliaryStorage = new AuxiliaryStorage();

    interface ExtendedContext extends BaseBuildContext {
      customProperty: string;
    }

    const context: ExtendedContext = {
      parentId: "root",
      customProperty: "custom-value",
      branch: { type: "slot", name: "test" },
    };

    vi.mocked(generateAssetIdForBuilder).mockImplementation(
      (_storage, result) => {
        (result as Record<string, unknown>).id = "root-test-asset";
      },
    );

    let capturedNestedContext: ExtendedContext | undefined;
    vi.mocked(resolveAssetWrappers).mockImplementation(
      (_storage, _result, nestedCtx) => {
        capturedNestedContext = nestedCtx as ExtendedContext;
      },
    );

    executeBuildPipeline(
      valueStorage,
      auxiliaryStorage,
      undefined,
      context,
      new Set(),
    );

    expect(capturedNestedContext).toBeDefined();
    expect(capturedNestedContext?.customProperty).toBe("custom-value");
    expect(capturedNestedContext?.parentId).toBe("root-test-asset");
    expect(capturedNestedContext?.branch).toBeUndefined();
  });
});

describe("Pipeline Step Order Verification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("static values are resolved before asset ID generation", () => {
    const callOrder: number[] = [];

    vi.mocked(resolveStaticValues).mockImplementation(() => {
      callOrder.push(1);
    });
    vi.mocked(generateAssetIdForBuilder).mockImplementation(() => {
      callOrder.push(2);
    });

    executeBuildPipeline(
      new ValueStorage<TestType>(),
      new AuxiliaryStorage(),
      undefined,
      { parentId: "test" },
      new Set(),
    );

    expect(callOrder.indexOf(1)).toBeLessThan(callOrder.indexOf(2));
  });

  test("asset ID is generated before nested context is created", () => {
    let idWhenAssetWrappersCall: string | undefined;

    vi.mocked(generateAssetIdForBuilder).mockImplementation(
      (_storage, result) => {
        (result as Record<string, unknown>).id = "generated-id";
      },
    );

    vi.mocked(resolveAssetWrappers).mockImplementation(
      (_storage, result, _ctx) => {
        idWhenAssetWrappersCall = (result as Record<string, unknown>)
          .id as string;
      },
    );

    executeBuildPipeline(
      new ValueStorage<TestType>(),
      new AuxiliaryStorage(),
      undefined,
      { parentId: "test" },
      new Set(),
    );

    expect(idWhenAssetWrappersCall).toBe("generated-id");
  });

  test("templates are resolved last", () => {
    const callOrder: string[] = [];

    vi.mocked(resolveStaticValues).mockImplementation(() => {
      callOrder.push("static");
    });
    vi.mocked(generateAssetIdForBuilder).mockImplementation(() => {
      callOrder.push("id");
    });
    vi.mocked(resolveAssetWrappers).mockImplementation(() => {
      callOrder.push("wrappers");
    });
    vi.mocked(resolveMixedArrays).mockImplementation(() => {
      callOrder.push("mixedArrays");
    });
    vi.mocked(resolveBuilders).mockImplementation(() => {
      callOrder.push("builders");
    });
    vi.mocked(resolveSwitches).mockImplementation(() => {
      callOrder.push("switches");
    });
    vi.mocked(resolveTemplates).mockImplementation(() => {
      callOrder.push("templates");
    });

    executeBuildPipeline(
      new ValueStorage<TestType>(),
      new AuxiliaryStorage(),
      undefined,
      { parentId: "test" },
      new Set(),
    );

    expect(callOrder[callOrder.length - 1]).toBe("templates");
  });
});
