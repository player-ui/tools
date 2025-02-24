import type { Node } from "jsonc-parser";

/** Support Export Formats */
export type ExportTypes = "TypeScript";

export interface BaseValidationMessage<ErrorType extends string = string> {
  /** Validation Type */
  type: ErrorType;

  /** Error message text */
  message: string;

  /** JSONC node that the error originates from */
  node: Node;

  /** Level of the message */
  severity: ValidationSeverity;
}

export interface TypeValidationError extends BaseValidationMessage<"type"> {
  /** Expected types */
  expected?: string[] | string | number | boolean;
}

export type MissingValidationError = BaseValidationMessage<"missing">;

export type UnknownValidationError = BaseValidationMessage<"unknown">;

export interface ValueValidationError extends BaseValidationMessage<"value"> {
  /** Expected value */
  expected?: string;
}

export type UnexpectedValidationError = BaseValidationMessage<"unexpected">;

export type ValidationMessage =
  | TypeValidationError
  | MissingValidationError
  | UnknownValidationError
  | ValueValidationError
  | UnexpectedValidationError;

export enum ValidationSeverity {
  Error = 1,
  Warning = 2,
  Info = 3,
  Trace = 4,
}
