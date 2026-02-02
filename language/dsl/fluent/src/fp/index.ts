import type { Result, Success, Failure } from "../types";

/**
 * Function composition utility that applies a sequence of functions to an initial value
 * Each function receives the result of the previous function
 * @param initialValue The initial value to start the pipeline
 * @param fns The functions to apply in sequence
 * @returns The final result after applying all functions
 */
export function pipe<A, B>(initialValue: A, fn1: (input: A) => B): B;
export function pipe<A, B, C>(
  initialValue: A,
  fn1: (input: A) => B,
  fn2: (input: B) => C,
): C;
export function pipe<A, B, C, D>(
  initialValue: A,
  fn1: (input: A) => B,
  fn2: (input: B) => C,
  fn3: (input: C) => D,
): D;
export function pipe<A, B, C, D, E>(
  initialValue: A,
  fn1: (input: A) => B,
  fn2: (input: B) => C,
  fn3: (input: C) => D,
  fn4: (input: D) => E,
): E;
export function pipe<A, B, C, D, E, F>(
  initialValue: A,
  fn1: (input: A) => B,
  fn2: (input: B) => C,
  fn3: (input: C) => D,
  fn4: (input: D) => E,
  fn5: (input: E) => F,
): F;
export function pipe<A, B, C, D, E, F, G>(
  initialValue: A,
  fn1: (input: A) => B,
  fn2: (input: B) => C,
  fn3: (input: C) => D,
  fn4: (input: D) => E,
  fn5: (input: E) => F,
  fn6: (input: F) => G,
): G;
export function pipe<A, B, C, D, E, F, G, H>(
  initialValue: A,
  fn1: (input: A) => B,
  fn2: (input: B) => C,
  fn3: (input: C) => D,
  fn4: (input: D) => E,
  fn5: (input: E) => F,
  fn6: (input: F) => G,
  fn7: (input: G) => H,
): H;
export function pipe(
  initialValue: unknown,
  ...fns: Array<(value: unknown) => unknown>
): unknown {
  return fns.reduce((value, fn) => fn(value), initialValue);
}

/**
 * Create a success result
 * @param value The success value
 * @returns A Success result
 */
export function success<T>(value: T): Success<T> {
  return { success: true, value };
}

/**
 * Create a failure result
 * @param error The error object
 * @returns A Failure result
 */
export function failure<E = Error>(error: E): Failure<E> {
  return { success: false, error };
}

/**
 * Type guard to check if a result is a Success
 * @param result The result to check
 * @returns Whether the result is a Success
 */
export function isSuccess<T, E = Error>(
  result: Result<T, E>,
): result is Success<T> {
  return result.success === true;
}

/**
 * Type guard to check if a result is a Failure
 * @param result The result to check
 * @returns Whether the result is a Failure
 */
export function isFailure<T, E = Error>(
  result: Result<T, E>,
): result is Failure<E> {
  return result.success === false;
}

/**
 * Map a function over a Result if it's a Success
 * @param result The result to map over
 * @param fn The mapping function
 * @returns A new result with the mapping applied
 */
export function map<T, U, E = Error>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (isSuccess(result)) {
    return success(fn(result.value));
  }
  return result;
}

/**
 * Chain results together with a function that returns a new Result
 * @param result The result to chain from
 * @param fn The function that returns a new result
 * @returns The result of applying the function
 */
export function flatMap<T, U, E = Error, F = Error>(
  result: Result<T, E>,
  fn: (value: T) => Result<U, F>,
): Result<U, E | F> {
  if (isSuccess(result)) {
    return fn(result.value);
  }
  return result;
}

/**
 * Apply a recovery function to transform a Failure into a Success
 * @param result The result to recover from
 * @param fn The recovery function
 * @returns A Success result
 */
export function recover<T, E = Error>(
  result: Result<T, E>,
  fn: (error: E) => T,
): Success<T> {
  if (isSuccess(result)) {
    return result;
  }
  return success(fn(result.error));
}

/**
 * Get the value from a Result or throw if it's a Failure
 * @param result The result to get the value from
 * @returns The success value
 * @throws The error from the Failure
 */
export function getOrThrow<T, E extends Error>(result: Result<T, E>): T {
  if (isSuccess(result)) {
    return result.value;
  }
  throw result.error;
}

/**
 * Get the value or a default if it's a Failure
 * @param result The result to get the value from
 * @param defaultValue The default value to use
 * @returns The success value or the default
 */
export function getOrElse<T, E = Error>(
  result: Result<T, E>,
  defaultValue: T,
): T {
  if (isSuccess(result)) {
    return result.value;
  }
  return defaultValue;
}

/**
 * Execute a function and return its result wrapped in a Result
 * @param fn The function to execute
 * @returns A Result containing the function's return value or error
 */
export function tryResult<T>(fn: () => T): Result<T, Error> {
  try {
    return success(fn());
  } catch (error) {
    return failure(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Handle both success and error cases with dedicated handlers
 * @param result The result to match against
 * @param onSuccess Handler for success case
 * @param onFailure Handler for failure case
 * @returns The result of the appropriate handler
 */
export function match<T, E = Error, U = unknown>(
  result: Result<T, E>,
  onSuccess: (value: T) => U,
  onFailure: (error: E) => U,
): U {
  if (isSuccess(result)) {
    return onSuccess(result.value);
  }
  return onFailure(result.error);
}

/**
 * Filter an array and return only successful results
 * @param results Array of results to filter
 * @returns Array of successful values
 */
export function filterSuccesses<T, E = Error>(
  results: Array<Result<T, E>>,
): T[] {
  return results.filter(isSuccess).map((result) => result.value);
}

/**
 * Transform an array of values using a function that returns Results
 * @param values Array of values to transform
 * @param fn Function that transforms each value to a Result
 * @returns Array of Results
 */
export function mapToResults<T, U, E = Error>(
  values: T[],
  fn: (value: T) => Result<U, E>,
): Array<Result<U, E>> {
  return values.map(fn);
}

/**
 * Validate a value using a predicate function
 * @param value The value to validate
 * @param predicate The validation function
 * @param errorMessage Error message if validation fails
 * @returns Success if valid, Failure if invalid
 */
export function validate<T>(
  value: T,
  predicate: (value: T) => boolean,
  errorMessage: string,
): Result<T, Error> {
  if (predicate(value)) {
    return success(value);
  }
  return failure(new Error(errorMessage));
}

/**
 * Create a memoized version of a function
 * @param fn The function to memoize
 * @returns Memoized function
 */
export function memoize<T extends unknown[], R>(
  fn: (...args: T) => R,
): (...args: T) => R {
  const cache = new Map<string, R>();

  return (...args: T): R => {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

/**
 * Check if a value is not null or undefined
 * @param value The value to check
 * @returns Type guard for non-null values
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Safe array access that returns a Result
 * @param array The array to access
 * @param index The index to access
 * @returns Success with the value or Failure if index is out of bounds
 */
export function safeArrayAccess<T>(
  array: T[],
  index: number,
): Result<T, Error> {
  if (index < 0 || index >= array.length) {
    return failure(
      new Error(
        `Index ${index} is out of bounds for array of length ${array.length}`,
      ),
    );
  }
  return success(array[index]);
}

/**
 * Combine multiple Results into a single Result containing an array
 * @param results Array of Results to combine
 * @returns Success with array of values if all succeed, Failure with first error if any fail
 */
export function combineResults<T, E = Error>(
  results: Array<Result<T, E>>,
): Result<T[], E> {
  const values: T[] = [];

  for (const result of results) {
    if (isFailure(result)) {
      return result;
    }
    values.push(result.value);
  }

  return success(values);
}

/**
 * Result-aware pipe function that follows the railway pattern
 * Chains functions that return Results, short-circuiting on the first failure
 * @param initialResult The initial Result to start the pipeline
 * @param fns The functions to apply in sequence, each taking a value and returning a Result
 * @returns The final Result after applying all functions, or the first failure encountered
 */
export function pipeResult<A, B, E = Error>(
  initialResult: Result<A, E>,
  fn1: (input: A) => Result<B, E>,
): Result<B, E>;
export function pipeResult<A, B, C, E = Error>(
  initialResult: Result<A, E>,
  fn1: (input: A) => Result<B, E>,
  fn2: (input: B) => Result<C, E>,
): Result<C, E>;
export function pipeResult<A, B, C, D, E = Error>(
  initialResult: Result<A, E>,
  fn1: (input: A) => Result<B, E>,
  fn2: (input: B) => Result<C, E>,
  fn3: (input: C) => Result<D, E>,
): Result<D, E>;
export function pipeResult<A, B, C, D, E, Err = Error>(
  initialResult: Result<A, Err>,
  fn1: (input: A) => Result<B, Err>,
  fn2: (input: B) => Result<C, Err>,
  fn3: (input: C) => Result<D, Err>,
  fn4: (input: D) => Result<E, Err>,
): Result<E, Err>;
export function pipeResult<A, B, C, D, E, F, Err = Error>(
  initialResult: Result<A, Err>,
  fn1: (input: A) => Result<B, Err>,
  fn2: (input: B) => Result<C, Err>,
  fn3: (input: C) => Result<D, Err>,
  fn4: (input: D) => Result<E, Err>,
  fn5: (input: E) => Result<F, Err>,
): Result<F, Err>;
export function pipeResult<A, B, C, D, E, F, G, Err = Error>(
  initialResult: Result<A, Err>,
  fn1: (input: A) => Result<B, Err>,
  fn2: (input: B) => Result<C, Err>,
  fn3: (input: C) => Result<D, Err>,
  fn4: (input: D) => Result<E, Err>,
  fn5: (input: E) => Result<F, Err>,
  fn6: (input: F) => Result<G, Err>,
): Result<G, Err>;
export function pipeResult<A, B, C, D, E, F, G, H, Err = Error>(
  initialResult: Result<A, Err>,
  fn1: (input: A) => Result<B, Err>,
  fn2: (input: B) => Result<C, Err>,
  fn3: (input: C) => Result<D, Err>,
  fn4: (input: D) => Result<E, Err>,
  fn5: (input: E) => Result<F, Err>,
  fn6: (input: F) => Result<G, Err>,
  fn7: (input: G) => Result<H, Err>,
): Result<H, Err>;
export function pipeResult<E = Error>(
  initialResult: Result<unknown, E>,
  ...fns: Array<(value: unknown) => Result<unknown, E>>
): Result<unknown, E> {
  return fns.reduce((result, fn) => flatMap(result, fn), initialResult);
}
