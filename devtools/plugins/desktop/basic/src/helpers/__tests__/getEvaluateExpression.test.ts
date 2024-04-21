import { describe, it, expect, vi } from "vitest";
import { getEvaluateExpression } from "../getEvaluateExpression";
import type { Evaluation } from "../../types";

vi.mock("uuid", () => ({
  v4: () => "test-uuid",
}));

const getMockExpressionEvaluator = (
  evaluate: ReturnType<typeof vi.fn>,
  throwError = false
): any => {
  class MockExpressionEvaluator {
    interceptor: Record<string, any> = {};
    evaluate(...args: any[]) {
      if (throwError) {
        throw new Error("Evaluation error");
      }
      return evaluate(...args);
    }
    hooks = {
      onError: {
        intercept: (args: Record<string, any>) => {
          this.interceptor = args;
        },
      },
    };
  }
  return new MockExpressionEvaluator();
};

describe("getEvaluateExpression", () => {
  it("returns an error Evaluation if expressionEvaluator is not available", () => {
    const evaluateExpression = getEvaluateExpression();
    const expression = "1 + 1";
    const expected: Evaluation = {
      id: "test-uuid",
      severity: "error",
      result: "Expression evaluator not available",
      expression,
    };

    const result = evaluateExpression(expression);

    expect(result).toEqual(expected);
  });

  it("evaluates expressions correctly when evaluator is available", () => {
    const mockEvaluate = vi.fn().mockReturnValue(2);
    const mockExpressionEvaluator = getMockExpressionEvaluator(mockEvaluate);
    const evaluateExpression = getEvaluateExpression(
      new WeakRef(mockExpressionEvaluator)
    );
    const expression = "1 + 1";
    const expected: Evaluation = {
      id: "test-uuid",
      result: 2,
      expression,
    };

    const result = evaluateExpression(expression);

    expect(result).toEqual(expected);
  });

  it("captures and returns an error if evaluation throws an error", () => {
    const mockEvaluate = vi.fn();
    const mockExpressionEvaluator = getMockExpressionEvaluator(
      mockEvaluate,
      true
    );
    const evaluateExpression = getEvaluateExpression(
      new WeakRef(mockExpressionEvaluator)
    );
    const expression = "invalid expression";
    const expected: Evaluation = {
      id: "test-uuid",
      severity: "error",
      result: "Evaluation error",
      expression,
    };

    const result = evaluateExpression(expression);

    expect(result).toEqual(expected);
  });

  it("handles errors triggered by onError hook", () => {
    const mockEvaluate = vi.fn();
    const mockExpressionEvaluator = getMockExpressionEvaluator(
      mockEvaluate,
      false
    );
    const evaluateExpression = getEvaluateExpression(
      new WeakRef(mockExpressionEvaluator)
    );
    const expression = "trigger hook error";

    evaluateExpression(expression);

    expect(() => {
      mockExpressionEvaluator.interceptor.call(new Error("Hook error"));
      evaluateExpression(expression);
    }).toThrow("Hook error");
  });
});
