/**
 * Represents a computation result that can either succeed or fail.
 * This is a common pattern for error handling without throwing exceptions.
 *
 * @template T The type of the success value
 * @template E The type of the error (defaults to Error)
 *
 * @example
 * ```typescript
 * function parseNumber(input: string): Result<number, string> {
 *   const num = Number(input);
 *   if (isNaN(num)) {
 *     return { success: false, error: "Invalid number format" };
 *   }
 *   return { success: true, value: num };
 * }
 *
 * const result = parseNumber("42");
 * if (result.success) {
 *   console.log(result.value); // TypeScript knows this is number
 * } else {
 *   console.error(result.error); // TypeScript knows this is string
 * }
 * ```
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Represents a successful computation result.
 * Contains the computed value and a success flag.
 *
 * @template T The type of the success value
 */
export interface Success<T> {
  /** Indicates this is a success result */
  success: true;
  /** The computed value */
  value: T;
}

/**
 * Represents a failed computation result.
 * Contains the error information and a failure flag.
 *
 * @template E The type of the error (defaults to Error)
 */
export interface Failure<E = Error> {
  /** Indicates this is a failure result */
  success: false;
  /** The error that occurred */
  error: E;
}
