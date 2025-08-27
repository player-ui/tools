/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect, vi, beforeEach, afterEach } from "vitest";
import {
  type AnalysisError,
  logAnalysisWarning,
  logAnalysisError,
  safeAnalyze,
} from "../utils.js";

let consoleWarnSpy: any;
let consoleErrorSpy: any;
let originalNodeEnv: string | undefined;

beforeEach(() => {
  consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  originalNodeEnv = process.env.NODE_ENV;
});

afterEach(() => {
  consoleWarnSpy.mockRestore();
  consoleErrorSpy.mockRestore();
  process.env.NODE_ENV = originalNodeEnv;
});

test("logAnalysisWarning logs in development environment", () => {
  process.env.NODE_ENV = "development";

  logAnalysisWarning("TestAnalyzer", "Test warning message");

  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "[TestAnalyzer] Test warning message",
    "",
  );
});

test("logAnalysisWarning logs with context in development environment", () => {
  process.env.NODE_ENV = "development";

  const context = { property: "testProp", type: "string" };
  logAnalysisWarning("TestAnalyzer", "Test warning with context", context);

  expect(consoleWarnSpy).toHaveBeenCalledWith(
    "[TestAnalyzer] Test warning with context",
    context,
  );
});

test("logAnalysisWarning does not log in production environment", () => {
  process.env.NODE_ENV = "production";

  logAnalysisWarning("TestAnalyzer", "Test warning message");

  expect(consoleWarnSpy).not.toHaveBeenCalled();
});

test("logAnalysisError logs error in development environment", () => {
  process.env.NODE_ENV = "development";

  const error: AnalysisError = {
    analyzer: "TestAnalyzer",
    property: "testProperty",
    typeText: "string",
    reason: "Test error reason",
  };

  logAnalysisError(error);

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    `[TestAnalyzer] Failed to analyze property "testProperty" (string): Test error reason`,
    undefined,
  );
});

test("logAnalysisError logs error with context in development environment", () => {
  process.env.NODE_ENV = "development";

  const context = { additionalInfo: "test context" };
  const error: AnalysisError = {
    analyzer: "TestAnalyzer",
    property: "testProperty",
    typeText: "string",
    reason: "Test error reason",
    context,
  };

  logAnalysisError(error);

  expect(consoleErrorSpy).toHaveBeenCalledWith(
    `[TestAnalyzer] Failed to analyze property "testProperty" (string): Test error reason`,
    context,
  );
});

test("logAnalysisError does not log in production environment", () => {
  process.env.NODE_ENV = "production";

  const error: AnalysisError = {
    analyzer: "TestAnalyzer",
    property: "testProperty",
    typeText: "string",
    reason: "Test error reason",
  };

  logAnalysisError(error);

  expect(consoleErrorSpy).not.toHaveBeenCalled();
});

test("safeAnalyze returns result when function succeeds", () => {
  const mockFn = vi.fn().mockReturnValue("success");
  const fallback = "fallback";

  const result = safeAnalyze({
    analyzer: "TestAnalyzer",
    property: "testProperty",
    typeText: "string",
    propertyFn: mockFn,
    fallback,
  });

  expect(result).toBe("success");
  expect(mockFn).toHaveBeenCalledOnce();
});

test("safeAnalyze returns fallback and logs error when function throws", () => {
  process.env.NODE_ENV = "development";
  const error = new Error("Test error");
  const mockFn = vi.fn().mockImplementation(() => {
    throw error;
  });
  const fallback = "fallback";

  const result = safeAnalyze({
    analyzer: "TestAnalyzer",
    property: "testProperty",
    typeText: "string",
    propertyFn: mockFn,
    fallback,
  });

  expect(result).toBe(fallback);
  expect(mockFn).toHaveBeenCalledOnce();
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    `[TestAnalyzer] Failed to analyze property "testProperty" (string): Test error`,
    { error },
  );
});

test("safeAnalyze handles non-Error thrown values", () => {
  process.env.NODE_ENV = "development";
  const mockFn = vi.fn().mockImplementation(() => {
    throw "string error";
  });
  const fallback = "fallback";

  const result = safeAnalyze({
    analyzer: "TestAnalyzer",
    property: "testProperty",
    typeText: "string",
    propertyFn: mockFn,
    fallback,
  });

  expect(result).toBe(fallback);
  expect(consoleErrorSpy).toHaveBeenCalledWith(
    `[TestAnalyzer] Failed to analyze property "testProperty" (string): Unknown error`,
    { error: "string error" },
  );
});

test("safeAnalyze works with different return types", () => {
  const objectResult = { test: "value" };
  const mockFn = vi.fn().mockReturnValue(objectResult);
  const fallback = { fallback: true };

  const result = safeAnalyze({
    analyzer: "TestAnalyzer",
    property: "testProperty",
    typeText: "object",
    propertyFn: mockFn,
    fallback,
  });

  expect(result).toBe(objectResult);
});
