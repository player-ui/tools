/**
 * Error codes for fluent builder errors.
 * Use these codes for programmatic error handling.
 */
export const ErrorCodes = {
  /** Context is missing when required */
  MISSING_CONTEXT: "FLUENT_MISSING_CONTEXT",
  /** Invalid branch type in ID generation */
  INVALID_BRANCH: "FLUENT_INVALID_BRANCH",
  /** Template produced no output */
  TEMPLATE_NO_OUTPUT: "FLUENT_TEMPLATE_NO_OUTPUT",
  /** Invalid path in value resolution */
  INVALID_PATH: "FLUENT_INVALID_PATH",
} as const;

/**
 * Type for error codes
 */
export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

/**
 * Custom error class for fluent builder errors.
 * Provides structured error information with error codes.
 */
export class FluentError extends Error {
  readonly code: ErrorCode;
  readonly context?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>,
  ) {
    const contextStr = context ? ` Context: ${JSON.stringify(context)}` : "";
    super(`[${code}] ${message}${contextStr}`);
    this.name = "FluentError";
    this.code = code;
    this.context = context;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FluentError);
    }
  }
}

/**
 * Creates a FluentError with the given code and message.
 * This is a convenience function for creating errors.
 *
 * @param code - The error code from ErrorCodes
 * @param message - Human-readable error message
 * @param context - Optional context object with additional details
 * @returns A FluentError instance
 *
 * @example
 * throw createFluentError(
 *   ErrorCodes.MISSING_CONTEXT,
 *   "Context is required for template resolution",
 *   { templateCount: 3 }
 * );
 */
export function createFluentError(
  code: ErrorCode,
  message: string,
  context?: Record<string, unknown>,
): FluentError {
  return new FluentError(code, message, context);
}
