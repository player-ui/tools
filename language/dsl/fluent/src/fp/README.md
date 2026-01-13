# Functional Programming Utilities

This module provides a collection of functional programming utilities for handling data transformations and error management in a type-safe way. It includes function composition utilities and a Result type system for elegant error handling.

## Table of Contents

- [Function Composition](#function-composition)
- [Result Type System](#result-type-system)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Function Composition

### `pipe`

The `pipe` function allows you to compose functions in a readable, left-to-right manner. It takes an initial value and applies a sequence of functions to it.

```typescript
import { pipe } from "./fp";

// Basic usage
const result = pipe(
  5,
  (x) => x + 1, // 6
  (x) => x * 2, // 12
  (x) => x.toString(), // "12"
);
console.log(result); // "12"

// Complex data transformation
const processUser = (userData: any) =>
  pipe(
    userData,
    (data) => ({ ...data, id: Math.random() }),
    (user) => ({ ...user, name: user.name.trim() }),
    (user) => ({ ...user, email: user.email.toLowerCase() }),
    (user) => ({ ...user, createdAt: new Date() }),
  );
```

The `pipe` function supports up to 7 functions and maintains type safety throughout the chain.

## Result Type System

The Result type system provides a way to handle operations that might fail without throwing exceptions. It's inspired by functional programming languages like Rust and Haskell.

### Core Types

```typescript
type Result<T, E = Error> = Success<T> | Failure<E>;

interface Success<T> {
  success: true;
  value: T;
}

interface Failure<E = Error> {
  success: false;
  error: E;
}
```

### Creating Results

```typescript
import { success, failure } from "./fp";

// Create a successful result
const successResult = success(42);
// { success: true, value: 42 }

// Create a failure result
const failureResult = failure(new Error("Something went wrong"));
// { success: false, error: Error("Something went wrong") }

// Custom error types
const customFailure = failure({ code: 404, message: "Not found" });
```

### Type Guards

```typescript
import { isSuccess, isFailure } from "./fp";

const result: Result<number, string> = success(42);

if (isSuccess(result)) {
  // TypeScript knows this is Success<number>
  console.log(result.value); // 42
}

if (isFailure(result)) {
  // TypeScript knows this is Failure<string>
  console.log(result.error); // string
}
```

## API Reference

### Function Composition

#### `pipe(initialValue, ...functions)`

Applies a sequence of functions to an initial value.

```typescript
pipe(value, fn1, fn2, fn3, ...); // fn3(fn2(fn1(value)))
```

### Result Creation

#### `success<T>(value: T): Success<T>`

Creates a successful result containing the given value.

#### `failure<E>(error: E): Failure<E>`

Creates a failure result containing the given error.

### Type Guards

#### `isSuccess<T, E>(result: Result<T, E>): result is Success<T>`

Type guard that checks if a result is successful.

#### `isFailure<T, E>(result: Result<T, E>): result is Failure<E>`

Type guard that checks if a result is a failure.

### Result Transformations

#### `map<T, U, E>(result: Result<T, E>, fn: (value: T) => U): Result<U, E>`

Transforms the value inside a successful result. Does nothing for failures.

```typescript
const result = success(5);
const doubled = map(result, (x) => x * 2);
// Success { value: 10 }

const failed = failure("error");
const stillFailed = map(failed, (x) => x * 2);
// Failure { error: "error" }
```

#### `flatMap<T, U, E, F>(result: Result<T, E>, fn: (value: T) => Result<U, F>): Result<U, E | F>`

Chains results together. Useful for operations that might fail.

```typescript
const parseNumber = (str: string): Result<number, string> => {
  const num = parseInt(str, 10);
  return isNaN(num) ? failure("Invalid number") : success(num);
};

const result = success("42");
const parsed = flatMap(result, parseNumber);
// Success { value: 42 }

const invalid = success("not-a-number");
const failed = flatMap(invalid, parseNumber);
// Failure { error: "Invalid number" }
```

#### `recover<T, E>(result: Result<T, E>, fn: (error: E) => T): Success<T>`

Recovers from a failure by providing a default value or transformation.

```typescript
const failed = failure("Network error");
const recovered = recover(failed, (error) => `Default: ${error}`);
// Success { value: "Default: Network error" }
```

### Value Extraction

#### `getOrThrow<T, E extends Error>(result: Result<T, E>): T`

Extracts the value from a successful result or throws the error.

```typescript
const success = success(42);
const value = getOrThrow(success); // 42

const failed = failure(new Error("Oops"));
const value2 = getOrThrow(failed); // throws Error("Oops")
```

#### `getOrElse<T, E>(result: Result<T, E>, defaultValue: T): T`

Extracts the value from a successful result or returns a default value.

```typescript
const success = success(42);
const value = getOrElse(success, 0); // 42

const failed = failure("error");
const value2 = getOrElse(failed, 0); // 0
```

### Utility Functions

#### `tryResult<T>(fn: () => T): Result<T, Error>`

Wraps a function that might throw in a Result.

```typescript
const safeParseJson = (str: string) => tryResult(() => JSON.parse(str));

const valid = safeParseJson('{"name": "John"}');
// Success { value: { name: "John" } }

const invalid = safeParseJson("invalid json");
// Failure { error: SyntaxError(...) }
```

#### `match<T, E, U>(result: Result<T, E>, onSuccess: (value: T) => U, onFailure: (error: E) => U): U`

Pattern matching for results. Always returns a value.

```typescript
const result = success(42);
const message = match(
  result,
  (value) => `Success: ${value}`,
  (error) => `Error: ${error}`,
);
// "Success: 42"
```

## Examples

### Basic Error Handling

```typescript
import { success, failure, map, flatMap, getOrElse } from "./fp";

// Simulate API calls that might fail
const fetchUser = (id: number): Result<User, string> => {
  if (id <= 0) return failure("Invalid user ID");
  return success({ id, name: "John Doe", email: "john@example.com" });
};

const validateEmail = (user: User): Result<User, string> => {
  if (!user.email.includes("@")) return failure("Invalid email");
  return success(user);
};

// Chain operations
const result = pipe(
  1,
  fetchUser,
  (res) => flatMap(res, validateEmail),
  (res) => map(res, (user) => ({ ...user, validated: true })),
  (res) =>
    getOrElse(res, { id: 0, name: "Unknown", email: "", validated: false }),
);
```

### Data Processing Pipeline

```typescript
import { pipe, tryResult, map, flatMap, recover } from "./fp";

const processData = (input: string) =>
  pipe(
    input,
    // Parse JSON safely
    (str) => tryResult(() => JSON.parse(str)),
    // Validate structure
    (res) =>
      flatMap(res, (data) =>
        typeof data === "object" && data.items
          ? success(data)
          : failure("Invalid data structure"),
      ),
    // Transform items
    (res) =>
      map(res, (data) => ({
        ...data,
        items: data.items.map((item: any) => ({ ...item, processed: true })),
      })),
    // Recover from errors with default
    (res) =>
      recover(res, (error) => ({
        items: [],
        error: error.message || String(error),
      })),
  );

const result = processData('{"items": [{"name": "test"}]}');
// Success with processed data
```

### Combining with Async Operations

```typescript
import { success, failure, flatMap, map } from "./fp";

// Wrap async operations in Results
const asyncFetchUser = async (id: number): Promise<Result<User, string>> => {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) return failure(`HTTP ${response.status}`);
    const user = await response.json();
    return success(user);
  } catch (error) {
    return failure(error.message);
  }
};

// Use with async/await
const processUser = async (id: number) => {
  const userResult = await asyncFetchUser(id);

  return pipe(
    userResult,
    (res) => map(res, (user) => ({ ...user, lastSeen: new Date() })),
    (res) =>
      flatMap(res, (user) =>
        user.active ? success(user) : failure("User is inactive"),
      ),
  );
};
```

## Best Practices

### 1. Use Descriptive Error Types

```typescript
// Good: Specific error types
type ValidationError = "INVALID_EMAIL" | "MISSING_NAME" | "INVALID_AGE";
const validateUser = (data: any): Result<User, ValidationError> => {
  // ...
};

// Avoid: Generic string errors
const validateUser = (data: any): Result<User, string> => {
  // ...
};
```

### 2. Chain Operations with flatMap

```typescript
// Good: Chain operations that might fail
const result = pipe(
  input,
  parseJson,
  (res) => flatMap(res, validateSchema),
  (res) => flatMap(res, transformData),
  (res) => map(res, finalTransform),
);

// Avoid: Nested if statements
if (isSuccess(parsed)) {
  const validated = validateSchema(parsed.value);
  if (isSuccess(validated)) {
    // ...
  }
}
```

### 3. Use recover for Default Values

```typescript
// Good: Provide meaningful defaults
const config = pipe(configFile, parseConfig, (res) =>
  recover(res, () => DEFAULT_CONFIG),
);

// Good: Transform errors into user-friendly messages
const userMessage = pipe(operation, (res) =>
  recover(res, (error) => `Operation failed: ${error}`),
);
```

### 4. Prefer match for Exhaustive Handling

```typescript
// Good: Handle both cases explicitly
const message = match(
  result,
  (user) => `Welcome, ${user.name}!`,
  (error) => `Login failed: ${error}`,
);

// Avoid: Only handling success case
if (isSuccess(result)) {
  console.log(`Welcome, ${result.value.name}!`);
}
```

### 5. Use tryResult for Exception-Prone Code

```typescript
// Good: Wrap risky operations
const safeOperation = (data: string) =>
  tryResult(() => {
    return JSON.parse(data).someProperty.deepValue;
  });

// Avoid: Letting exceptions bubble up
const riskyOperation = (data: string) => {
  return JSON.parse(data).someProperty.deepValue; // Might throw
};
```

This functional programming module provides a robust foundation for handling data transformations and errors in a type-safe, composable way. The Result type system eliminates the need for exception handling in many cases and makes error states explicit in your type signatures.
