import { test, expect } from "vitest";
import { setupTestEnv } from "@player-tools/test-utils";
import { TsConverter } from "..";

/**
 * Tests for handleHeritageClauses: when an interface extends a base that has
 * no index signature, but the current interface declares [key: string]: unknown,
 * the merged XLR must include the current interface's additionalProperties
 * (so the merged type allows extra keys).
 */
test("merged type includes current interface additionalProperties when extending base without index signature", () => {
  const sc = `
    interface NavigationBaseState {
      state_type: string;
      onStart?: string;
    }

    export interface NavigationFlowEndState extends NavigationBaseState {
      outcome: string;
      [key: string]: unknown;
    }
  `;

  const { sf, tc } = setupTestEnv(sc);
  const converter = new TsConverter(tc);
  const types = converter.convertSourceFile(sf).data.types;

  const endStateType = types.find(
    (t: { name?: string }) => t.name === "NavigationFlowEndState",
  );
  expect(endStateType).toBeDefined();
  expect(
    (endStateType as { additionalProperties?: unknown }).additionalProperties,
  ).not.toBe(false);
  expect(
    (
      (endStateType as { additionalProperties?: { type?: string } })
        .additionalProperties as { type?: string }
    )?.type,
  ).toBe("unknown");
});

test("merged type includes additionalProperties when only extended type has index signature", () => {
  const sc = `
    interface Base {
      required: string;
    }

    interface WithIndex {
      [key: string]: unknown;
    }

    export interface Child extends Base, WithIndex {
      extra: number;
    }
  `;

  const { sf, tc } = setupTestEnv(sc);
  const converter = new TsConverter(tc);
  const types = converter.convertSourceFile(sf).data.types;

  const childType = types.find((t: { name?: string }) => t.name === "Child");
  expect(childType).toBeDefined();
  const additionalProperties = (childType as { additionalProperties?: unknown })
    .additionalProperties;
  expect(additionalProperties).not.toBe(false);
  expect((additionalProperties as { type?: string })?.type).toBe("unknown");
});

test("merged type has no additionalProperties when no interface has index signature", () => {
  const sc = `
    interface Base {
      required: string;
    }

    export interface Child extends Base {
      extra: number;
    }
  `;

  const { sf, tc } = setupTestEnv(sc);
  const converter = new TsConverter(tc);
  const types = converter.convertSourceFile(sf).data.types;

  const childType = types.find((t: { name?: string }) => t.name === "Child");
  expect(childType).toBeDefined();
  const additionalProperties = (childType as { additionalProperties?: unknown })
    .additionalProperties;
  expect(additionalProperties).toBe(false);
});

test("merged type combines additionalProperties from current and extended when both have index signatures", () => {
  const sc = `
    interface Base {
      required: string;
      [key: string]: unknown;
    }

    export interface Child extends Base {
      extra: number;
      [key: string]: unknown;
    }
  `;

  const { sf, tc } = setupTestEnv(sc);
  const converter = new TsConverter(tc);
  const types = converter.convertSourceFile(sf).data.types;

  const childType = types.find((t: { name?: string }) => t.name === "Child");
  expect(childType).toBeDefined();
  const additionalProperties = (childType as { additionalProperties?: unknown })
    .additionalProperties;
  expect(additionalProperties).not.toBe(false);
  // When both have index sigs we merge (e.g. or of both); extra keys are allowed
  const ap = additionalProperties as { type?: string; or?: unknown[] };
  expect(
    ap.type === "unknown" || (ap.type === "or" && Array.isArray(ap.or)),
  ).toBe(true);
});
