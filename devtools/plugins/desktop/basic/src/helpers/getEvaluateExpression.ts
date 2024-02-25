import { ExpressionEvaluator } from "@player-ui/react";
import { Evaluation } from "../types";

export const getEvaluateExpression =
  (expressionEvaluator?: WeakRef<ExpressionEvaluator>) =>
  (expression: string): Evaluation => {
    if (!expressionEvaluator) {
      return {
        status: "error",
        data: "Expression evaluator not available",
        expression,
      };
    }

    let result: Evaluation = {
      status: "error",
      data: "Something went wrong",
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
        status: "success",
        data: evaluatorResult,
        expression,
      };
    } catch (error) {
      if (error instanceof Error) {
        result = {
          status: "error",
          data: error.message,
          expression,
        };
      }
    }

    return result;
  };
