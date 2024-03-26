import { ExpressionEvaluator } from "@player-ui/react";
import { v4 as uuid } from "uuid";
import { Evaluation } from "../types";

export const getEvaluateExpression =
  (expressionEvaluator?: WeakRef<ExpressionEvaluator>) =>
  (expression: string): Evaluation => {
    if (!expressionEvaluator) {
      return {
        id: uuid(),
        severity: "error",
        result: "Expression evaluator not available",
        expression,
      };
    }

    let result: Evaluation = {
      id: uuid(),
      severity: "error",
      result: "Something went wrong",
      expression,
    };

    try {
      expressionEvaluator.deref()?.hooks.onError.intercept({
        call: (error: Error) => {
          throw error;
        },
      });

      const evaluatorResult = expressionEvaluator.deref()?.evaluate(expression);

      result = {
        id: uuid(),
        result: evaluatorResult,
        expression,
      };
    } catch (error) {
      if (error instanceof Error) {
        result = {
          id: uuid(),
          severity: "error",
          result: error.message,
          expression,
        };
      }
    }

    return result;
  };
