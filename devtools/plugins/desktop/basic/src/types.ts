import { ExpressionEvaluator, ViewInstance } from "@player-ui/react";
import { Flow } from "@player-ui/types";

export interface Evaluation {
  /** evaluation status */
  status: "success" | "error";
  /** evaluation result or error message */
  data: string;
  /** evaluated expression */
  expression: string;
}

export interface WrapperComponentProps {
  /** component's children */
  readonly children: React.ReactNode;
  /** Inspected player data */
  data: Record<string, unknown>;
  /** Inspected player logs */
  logs: {
    /** Log severity */
    severity: string;
    /** Log message */
    message: string;
  }[];
  /** Inspected player flow */
  flow?: Flow;
  /** expression evaluator */
  expressionEvaluator?: WeakRef<ExpressionEvaluator>;
  /** view instace */
  view?: WeakRef<ViewInstance>;
}
