import type {
  ExpressionEvaluator,
  Player,
  ViewInstance,
} from "@player-ui/react";
import { Flow } from "@player-ui/types";

export interface Evaluation {
  /** A unique key for this expression */
  id: string;
  /** The expression itself */
  expression: string;
  /** The result for a given expression */
  result?: unknown;
  /** Whether there were any errors with the result */
  severity?: "error" | "warning";
}

export interface WrapperComponentProps {
  /** component's children */
  readonly children: React.ReactNode;
  /** Inspected player data */
  data: Record<string, unknown>;
  /** Inspected player config */
  playerConfig: Record<string, unknown>;
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
  /** override flow */
  overrideFlow?: Player["start"];
}
