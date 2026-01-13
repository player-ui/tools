import { describe, test, expect } from "vitest";
import {
  pipe,
  success,
  failure,
  isSuccess,
  isFailure,
  map,
  flatMap,
  recover,
  getOrThrow,
  getOrElse,
  tryResult,
  match,
  pipeResult,
  filterSuccesses,
  mapToResults,
  validate,
  memoize,
  isNotNullish,
  safeArrayAccess,
  combineResults,
} from "../index";
import type { Result } from "../../types";

describe("fp module", () => {
  describe("pipe function", () => {
    test("pipes a single function", () => {
      const add1 = (x: number) => x + 1;
      const result = pipe(5, add1);
      expect(result).toBe(6);
    });

    test("pipes two functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const result = pipe(5, add1, multiply2);
      expect(result).toBe(12);
    });

    test("pipes three functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      const result = pipe(5, add1, multiply2, toString);
      expect(result).toBe("12");
    });

    test("pipes four functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      const addPrefix = (x: string) => `value: ${x}`;
      const result = pipe(5, add1, multiply2, toString, addPrefix);
      expect(result).toBe("value: 12");
    });

    test("pipes five functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      const addPrefix = (x: string) => `value: ${x}`;
      const toUpperCase = (x: string) => x.toUpperCase();
      const result = pipe(5, add1, multiply2, toString, addPrefix, toUpperCase);
      expect(result).toBe("VALUE: 12");
    });

    test("pipes six functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      const addPrefix = (x: string) => `value: ${x}`;
      const toUpperCase = (x: string) => x.toUpperCase();
      const addSuffix = (x: string) => `${x}!`;
      const result = pipe(
        5,
        add1,
        multiply2,
        toString,
        addPrefix,
        toUpperCase,
        addSuffix,
      );
      expect(result).toBe("VALUE: 12!");
    });

    test("pipes seven functions", () => {
      const add1 = (x: number) => x + 1;
      const multiply2 = (x: number) => x * 2;
      const toString = (x: number) => x.toString();
      const addPrefix = (x: string) => `value: ${x}`;
      const toUpperCase = (x: string) => x.toUpperCase();
      const addSuffix = (x: string) => `${x}!`;
      const trim = (x: string) => x.trim();
      const result = pipe(
        5,
        add1,
        multiply2,
        toString,
        addPrefix,
        toUpperCase,
        addSuffix,
        trim,
      );
      expect(result).toBe("VALUE: 12!");
    });

    test("pipes with different types", () => {
      const numberToString = (x: number) => x.toString();
      const stringLength = (x: string) => x.length;
      const isEven = (x: number) => x % 2 === 0;
      const result = pipe(123, numberToString, stringLength, isEven);
      expect(result).toBe(false); // length is 3, which is odd
    });

    test("pipes with identity function", () => {
      const identity = <T>(x: T) => x;
      const result = pipe("hello", identity);
      expect(result).toBe("hello");
    });

    test("pipes with complex transformations", () => {
      const parseJson = (x: string) => JSON.parse(x);
      const getProperty = (x: { value: number }) => x.value;
      const square = (x: number) => x * x;
      const result = pipe('{"value": 5}', parseJson, getProperty, square);
      expect(result).toBe(25);
    });
  });

  describe("success function", () => {
    test("creates a success result with a value", () => {
      const result = success(42);
      expect(result).toEqual({ success: true, value: 42 });
    });

    test("creates a success result with string value", () => {
      const result = success("hello");
      expect(result).toEqual({ success: true, value: "hello" });
    });

    test("creates a success result with object value", () => {
      const obj = { name: "test", count: 5 };
      const result = success(obj);
      expect(result).toEqual({ success: true, value: obj });
    });

    test("creates a success result with null value", () => {
      const result = success(null);
      expect(result).toEqual({ success: true, value: null });
    });

    test("creates a success result with undefined value", () => {
      const result = success(undefined);
      expect(result).toEqual({ success: true, value: undefined });
    });
  });

  describe("failure function", () => {
    test("creates a failure result with an error", () => {
      const error = new Error("Something went wrong");
      const result = failure(error);
      expect(result).toEqual({ success: false, error });
    });

    test("creates a failure result with string error", () => {
      const result = failure("Error message");
      expect(result).toEqual({ success: false, error: "Error message" });
    });

    test("creates a failure result with custom error object", () => {
      const customError = { code: 404, message: "Not found" };
      const result = failure(customError);
      expect(result).toEqual({ success: false, error: customError });
    });
  });

  describe("isSuccess function", () => {
    test("returns true for success results", () => {
      const result = success(42);
      expect(isSuccess(result)).toBe(true);
    });

    test("returns false for failure results", () => {
      const result = failure(new Error("test"));
      expect(isSuccess(result)).toBe(false);
    });

    test("works as type guard", () => {
      const result: Result<number, Error> = success(42);
      if (isSuccess(result)) {
        // TypeScript should know this is a Success<number>
        expect(result.value).toBe(42);
      }
    });
  });

  describe("isFailure function", () => {
    test("returns false for success results", () => {
      const result = success(42);
      expect(isFailure(result)).toBe(false);
    });

    test("returns true for failure results", () => {
      const result = failure(new Error("test"));
      expect(isFailure(result)).toBe(true);
    });

    test("works as type guard", () => {
      const result: Result<number, Error> = failure(new Error("test error"));
      if (isFailure(result)) {
        // TypeScript should know this is a Failure<Error>
        expect(result.error.message).toBe("test error");
      }
    });
  });

  describe("map function", () => {
    test("maps over success values", () => {
      const result = success(5);
      const mapped = map(result, (x) => x * 2);
      expect(mapped).toEqual(success(10));
    });

    test("does not map over failure values", () => {
      const error = new Error("test");
      const result = failure(error);
      const mapped = map(result, (x: number) => x * 2);
      expect(mapped).toEqual(failure(error));
    });

    test("maps to different types", () => {
      const result = success(42);
      const mapped = map(result, (x) => x.toString());
      expect(mapped).toEqual(success("42"));
    });

    test("maps with complex transformations", () => {
      const result = success({ name: "John", age: 30 });
      const mapped = map(
        result,
        (person) => `${person.name} is ${person.age} years old`,
      );
      expect(mapped).toEqual(success("John is 30 years old"));
    });

    test("preserves failure type", () => {
      const customError = { code: 500, message: "Server error" };
      const result = failure(customError);
      const mapped = map(result, (x: string) => x.toUpperCase());
      expect(mapped).toEqual(failure(customError));
    });
  });

  describe("flatMap function", () => {
    test("chains success results", () => {
      const result = success(5);
      const chained = flatMap(result, (x) => success(x * 2));
      expect(chained).toEqual(success(10));
    });

    test("chains to failure", () => {
      const result = success(5);
      const error = new Error("chain error");
      const chained = flatMap(result, () => failure(error));
      expect(chained).toEqual(failure(error));
    });

    test("does not chain failure results", () => {
      const error = new Error("original error");
      const result = failure(error);
      const chained = flatMap(result, (x: number) => success(x * 2));
      expect(chained).toEqual(failure(error));
    });

    test("chains with type transformation", () => {
      const result = success(42);
      const chained = flatMap(result, (x) => success(x.toString()));
      expect(chained).toEqual(success("42"));
    });

    test("chains multiple operations", () => {
      const result = success("5");
      const parsed = flatMap(result, (str) => {
        const num = parseInt(str, 10);
        return isNaN(num) ? failure(new Error("Invalid number")) : success(num);
      });
      const doubled = flatMap(parsed, (num) => success(num * 2));
      expect(doubled).toEqual(success(10));
    });

    test("stops chain on first failure", () => {
      const result = success("not-a-number");
      const parsed = flatMap(result, (str) => {
        const num = parseInt(str, 10);
        return isNaN(num) ? failure(new Error("Invalid number")) : success(num);
      });
      const doubled = flatMap(parsed, (num) => success(num * 2));
      expect(isFailure(doubled)).toBe(true);
      if (isFailure(doubled)) {
        expect(doubled.error.message).toBe("Invalid number");
      }
    });
  });

  describe("recover function", () => {
    test("returns success unchanged", () => {
      const result = success(42);
      const recovered = recover(result, () => 0);
      expect(recovered).toEqual(success(42));
    });

    test("recovers from failure", () => {
      const error = new Error("test error");
      const result = failure(error);
      const recovered = recover(
        result,
        (err) => `Recovered from: ${err.message}`,
      );
      expect(recovered).toEqual(success("Recovered from: test error"));
    });

    test("recovers with default value", () => {
      const result = failure("error");
      const recovered = recover(result, () => "default");
      expect(recovered).toEqual(success("default"));
    });

    test("recovers with error transformation", () => {
      const result = failure({ code: 404, message: "Not found" });
      const recovered = recover(
        result,
        (err) => `Error ${err.code}: ${err.message}`,
      );
      expect(recovered).toEqual(success("Error 404: Not found"));
    });

    test("always returns success", () => {
      const result1 = success(1);
      const result2 = failure("error");
      const recovered1 = recover(result1, () => 0);
      const recovered2 = recover(result2, () => 0);

      expect(isSuccess(recovered1)).toBe(true);
      expect(isSuccess(recovered2)).toBe(true);
    });
  });

  describe("getOrThrow function", () => {
    test("returns value from success", () => {
      const result = success(42);
      expect(getOrThrow(result)).toBe(42);
    });

    test("throws error from failure", () => {
      const error = new Error("test error");
      const result = failure(error);
      expect(() => getOrThrow(result)).toThrow("test error");
    });

    test("throws the exact error object", () => {
      const customError = new TypeError("Type error");
      const result = failure(customError);
      expect(() => getOrThrow(result)).toThrow(customError);
    });

    test("returns complex values", () => {
      const obj = { name: "test", values: [1, 2, 3] };
      const result = success(obj);
      expect(getOrThrow(result)).toEqual(obj);
    });
  });

  describe("getOrElse function", () => {
    test("returns value from success", () => {
      const result = success(42);
      expect(getOrElse(result, 0)).toBe(42);
    });

    test("returns default from failure", () => {
      const result = failure(new Error("test"));
      expect(getOrElse(result, 0)).toBe(0);
    });

    test("returns default with same type", () => {
      const result = failure("error");
      expect(getOrElse(result, "default")).toBe("default");
    });

    test("returns complex default values", () => {
      const defaultObj = { name: "default", count: 0 };
      const result = failure(new Error("test"));
      expect(getOrElse(result, defaultObj)).toEqual(defaultObj);
    });

    test("preserves original value type", () => {
      const result = success("hello");
      expect(getOrElse(result, "default")).toBe("hello");
    });
  });

  describe("tryResult function", () => {
    test("wraps successful function execution", () => {
      const fn = () => 42;
      const result = tryResult(fn);
      expect(result).toEqual(success(42));
    });

    test("wraps function that throws Error", () => {
      const fn = () => {
        throw new Error("test error");
      };
      const result = tryResult(fn);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("test error");
      }
    });

    test("wraps function that throws string", () => {
      const fn = () => {
        throw "string error";
      };
      const result = tryResult(fn);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("string error");
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    test("wraps function that throws non-string, non-Error", () => {
      const fn = () => {
        throw { code: 500 };
      };
      const result = tryResult(fn);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("[object Object]");
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    test("wraps function that throws null", () => {
      const fn = () => {
        throw null;
      };
      const result = tryResult(fn);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("null");
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    test("wraps function that throws undefined", () => {
      const fn = () => {
        throw undefined;
      };
      const result = tryResult(fn);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("undefined");
        expect(result.error).toBeInstanceOf(Error);
      }
    });

    test("wraps function with complex return value", () => {
      const fn = () => ({ name: "test", values: [1, 2, 3] });
      const result = tryResult(fn);
      expect(result).toEqual(success({ name: "test", values: [1, 2, 3] }));
    });

    test("wraps function that returns undefined", () => {
      const fn = () => undefined;
      const result = tryResult(fn);
      expect(result).toEqual(success(undefined));
    });
  });

  describe("match function", () => {
    test("calls onSuccess for success results", () => {
      const result = success(42);
      const matched = match(
        result,
        (value) => `Success: ${value}`,
        (error) => `Error: ${error}`,
      );
      expect(matched).toBe("Success: 42");
    });

    test("calls onFailure for failure results", () => {
      const error = new Error("test error");
      const result = failure(error);
      const matched = match(
        result,
        (value) => `Success: ${value}`,
        (err) => `Error: ${err.message}`,
      );
      expect(matched).toBe("Error: test error");
    });

    test("transforms to different types", () => {
      const successResult = success("hello");
      const failureResult = failure("error");

      const successMatched = match(
        successResult,
        (value) => value.length,
        () => 0,
      );
      const failureMatched = match(
        failureResult,
        (value: string) => value.length,
        () => 0,
      );

      expect(successMatched).toBe(5);
      expect(failureMatched).toBe(0);
    });

    test("handles complex transformations", () => {
      const result = success({ name: "John", age: 30 });
      const matched = match(
        result,
        (person) => ({ ...person, isAdult: person.age >= 18 }),
        () => ({ name: "Unknown", age: 0, isAdult: false }),
      );
      expect(matched).toEqual({ name: "John", age: 30, isAdult: true });
    });

    test("preserves handler return types", () => {
      const result = failure("error");
      const matched = match(
        result,
        () => true,
        () => false,
      );
      expect(matched).toBe(false);
    });

    test("works with void handlers", () => {
      let sideEffect = "";
      const result = success("test");

      match(
        result,
        (value) => {
          sideEffect = `success: ${value}`;
        },
        (error) => {
          sideEffect = `error: ${error}`;
        },
      );

      expect(sideEffect).toBe("success: test");
    });
  });

  describe("integration tests", () => {
    test("combines multiple fp operations", () => {
      const parseNumber = (str: string): Result<number, string> => {
        const num = parseInt(str, 10);
        return isNaN(num) ? failure("Invalid number") : success(num);
      };

      const result = pipe(
        "42",
        (str) => parseNumber(str),
        (res) => map(res, (num) => num * 2),
        (res) =>
          flatMap(res, (num) =>
            num > 50 ? success(num) : failure("Too small"),
          ),
        (res) => recover(res, () => 0),
        (res) => getOrElse(res, -1),
      );

      expect(result).toBe(84);
    });

    test("handles error propagation through chain", () => {
      const parseNumber = (str: string): Result<number, string> => {
        const num = parseInt(str, 10);
        return isNaN(num) ? failure("Invalid number") : success(num);
      };

      const result = pipe(
        "not-a-number",
        (str) => parseNumber(str),
        (res) => map(res, (num) => num * 2),
        (res) => flatMap(res, (num) => success(num.toString())),
        (res) =>
          match(
            res,
            (value) => `Result: ${value}`,
            (error) => `Error: ${error}`,
          ),
      );

      expect(result).toBe("Error: Invalid number");
    });

    test("complex data transformation pipeline", () => {
      interface User {
        id: number;
        name: string;
        email: string;
      }

      const validateUser = (data: unknown): Result<User, string> => {
        if (typeof data !== "object" || data === null) {
          return failure("Data must be an object");
        }

        const obj = data as Record<string, unknown>;

        if (typeof obj.id !== "number") {
          return failure("ID must be a number");
        }

        if (typeof obj.name !== "string") {
          return failure("Name must be a string");
        }

        if (typeof obj.email !== "string") {
          return failure("Email must be a string");
        }

        return success({ id: obj.id, name: obj.name, email: obj.email });
      };

      const userData = { id: 1, name: "John Doe", email: "john@example.com" };

      const result = pipe(
        userData,
        validateUser,
        (res) =>
          map(res, (user) => ({
            ...user,
            displayName: `${user.name} <${user.email}>`,
          })),
        (res) =>
          getOrElse(res, {
            id: 0,
            name: "Unknown",
            email: "",
            displayName: "Unknown",
          }),
      );

      expect(result).toEqual({
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        displayName: "John Doe <john@example.com>",
      });
    });
  });

  describe("pipeResult", () => {
    test("should chain successful operations", () => {
      const addOne = (x: number) => success(x + 1);
      const multiplyByTwo = (x: number) => success(x * 2);
      const toString = (x: number) => success(x.toString());

      const result = pipeResult(success(5), addOne, multiplyByTwo, toString);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe("12"); // (5 + 1) * 2 = 12
      }
    });

    test("should short-circuit on first failure", () => {
      const addOne = (x: number) => success(x + 1);
      const failOperation = () => failure(new Error("Operation failed"));
      const multiplyByTwo = (x: number) => success(x * 2);

      const result = pipeResult(
        success(5),
        addOne,
        failOperation,
        multiplyByTwo, // This should not be called
      );

      expect(isSuccess(result)).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error.message).toBe("Operation failed");
      }
    });

    test("should handle initial failure", () => {
      const addOne = (x: number) => success(x + 1);

      const result = pipeResult(
        failure(new Error("Initial failure")),
        addOne, // This should not be called
      );

      expect(isSuccess(result)).toBe(false);
      if (!isSuccess(result)) {
        expect(result.error.message).toBe("Initial failure");
      }
    });

    test("should work with single operation", () => {
      const addOne = (x: number) => success(x + 1);

      const result = pipeResult(success(5), addOne);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(6);
      }
    });
  });

  describe("filterSuccesses", () => {
    test("filters out failures and returns only success values", () => {
      const results = [
        success(1),
        failure("error1"),
        success(2),
        success(3),
        failure("error2"),
      ];
      const filtered = filterSuccesses(results);
      expect(filtered).toEqual([1, 2, 3]);
    });

    test("returns empty array when all results are failures", () => {
      const results = [failure("error1"), failure("error2"), failure("error3")];
      const filtered = filterSuccesses(results);
      expect(filtered).toEqual([]);
    });

    test("returns all values when all results are successes", () => {
      const results = [success("a"), success("b"), success("c")];
      const filtered = filterSuccesses(results);
      expect(filtered).toEqual(["a", "b", "c"]);
    });

    test("handles empty array", () => {
      const results: Array<Result<number, string>> = [];
      const filtered = filterSuccesses(results);
      expect(filtered).toEqual([]);
    });

    test("preserves order of successful values", () => {
      const results = [
        success(10),
        failure("error"),
        success(20),
        failure("error"),
        success(30),
      ];
      const filtered = filterSuccesses(results);
      expect(filtered).toEqual([10, 20, 30]);
    });

    test("works with different value types", () => {
      const results = [
        success({ id: 1, name: "Alice" }),
        failure("validation error"),
        success({ id: 2, name: "Bob" }),
      ];
      const filtered = filterSuccesses(results);
      expect(filtered).toEqual([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
      ]);
    });
  });

  describe("mapToResults", () => {
    test("transforms array of values to array of Results", () => {
      const values = [1, 2, 3];
      const fn = (x: number) => success(x * 2);
      const results = mapToResults(values, fn);
      expect(results).toEqual([success(2), success(4), success(6)]);
    });

    test("handles function that returns failures", () => {
      const values = ["1", "not-a-number", "3"];
      const parseNumber = (str: string) => {
        const num = parseInt(str, 10);
        return isNaN(num) ? failure("Invalid number") : success(num);
      };
      const results = mapToResults(values, parseNumber);
      expect(results).toEqual([
        success(1),
        failure("Invalid number"),
        success(3),
      ]);
    });

    test("handles empty array", () => {
      const values: number[] = [];
      const fn = (x: number) => success(x * 2);
      const results = mapToResults(values, fn);
      expect(results).toEqual([]);
    });

    test("preserves order", () => {
      const values = [5, 4, 3, 2, 1];
      const fn = (x: number) => success(x.toString());
      const results = mapToResults(values, fn);
      expect(results).toEqual([
        success("5"),
        success("4"),
        success("3"),
        success("2"),
        success("1"),
      ]);
    });

    test("works with complex transformations", () => {
      const users = [
        { name: "Alice", age: 25 },
        { name: "Bob", age: 17 },
        { name: "Charlie", age: 30 },
      ];
      const validateAdult = (user: { name: string; age: number }) =>
        user.age >= 18
          ? success({ ...user, isAdult: true })
          : failure(`${user.name} is not an adult`);

      const results = mapToResults(users, validateAdult);
      expect(results).toEqual([
        success({ name: "Alice", age: 25, isAdult: true }),
        failure("Bob is not an adult"),
        success({ name: "Charlie", age: 30, isAdult: true }),
      ]);
    });
  });

  describe("validate", () => {
    test("returns success when predicate is true", () => {
      const result = validate(5, (x) => x > 0, "Must be positive");
      expect(result).toEqual(success(5));
    });

    test("returns failure when predicate is false", () => {
      const result = validate(-5, (x) => x > 0, "Must be positive");
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe("Must be positive");
      }
    });

    test("validates string length", () => {
      const validateLength = (str: string) =>
        validate(
          str,
          (s) => s.length >= 3,
          "String must be at least 3 characters",
        );

      expect(validateLength("hello")).toEqual(success("hello"));
      expect(isFailure(validateLength("hi"))).toBe(true);
    });

    test("validates email format", () => {
      const validateEmail = (email: string) =>
        validate(
          email,
          (e) => e.includes("@") && e.includes("."),
          "Invalid email format",
        );

      expect(validateEmail("user@example.com")).toEqual(
        success("user@example.com"),
      );
      expect(isFailure(validateEmail("invalid-email"))).toBe(true);
    });

    test("validates object properties", () => {
      const user = { name: "Alice", age: 25 };
      const validateUser = (u: typeof user) =>
        validate(u, (user) => user.age >= 18, "User must be an adult");

      expect(validateUser(user)).toEqual(success(user));
      expect(isFailure(validateUser({ name: "Bob", age: 16 }))).toBe(true);
    });

    test("validates array length", () => {
      const validateArray = (arr: number[]) =>
        validate(arr, (a) => a.length > 0, "Array cannot be empty");

      expect(validateArray([1, 2, 3])).toEqual(success([1, 2, 3]));
      expect(isFailure(validateArray([]))).toBe(true);
    });
  });

  describe("memoize", () => {
    test("caches function results", () => {
      let callCount = 0;
      const expensiveFunction = (x: number) => {
        callCount++;
        return x * x;
      };

      const memoized = memoize(expensiveFunction);

      expect(memoized(5)).toBe(25);
      expect(callCount).toBe(1);

      expect(memoized(5)).toBe(25);
      expect(callCount).toBe(1); // Should not increment

      expect(memoized(3)).toBe(9);
      expect(callCount).toBe(2);
    });

    test("handles multiple arguments", () => {
      let callCount = 0;
      const add = (a: number, b: number) => {
        callCount++;
        return a + b;
      };

      const memoizedAdd = memoize(add);

      expect(memoizedAdd(2, 3)).toBe(5);
      expect(callCount).toBe(1);

      expect(memoizedAdd(2, 3)).toBe(5);
      expect(callCount).toBe(1);

      expect(memoizedAdd(3, 2)).toBe(5);
      expect(callCount).toBe(2); // Different argument order
    });

    test("handles string arguments", () => {
      let callCount = 0;
      const concat = (a: string, b: string) => {
        callCount++;
        return a + b;
      };

      const memoizedConcat = memoize(concat);

      expect(memoizedConcat("hello", "world")).toBe("helloworld");
      expect(callCount).toBe(1);

      expect(memoizedConcat("hello", "world")).toBe("helloworld");
      expect(callCount).toBe(1);
    });

    test("handles complex object arguments", () => {
      let callCount = 0;
      const processUser = (user: { name: string; age: number }) => {
        callCount++;
        return `${user.name} is ${user.age} years old`;
      };

      const memoizedProcess = memoize(processUser);
      const user1 = { name: "Alice", age: 25 };
      const user2 = { name: "Alice", age: 25 };

      expect(memoizedProcess(user1)).toBe("Alice is 25 years old");
      expect(callCount).toBe(1);

      expect(memoizedProcess(user2)).toBe("Alice is 25 years old");
      expect(callCount).toBe(1); // Same content, should be cached
    });

    test("handles no arguments", () => {
      let callCount = 0;
      const getValue = () => {
        callCount++;
        return 42;
      };

      const memoizedGetValue = memoize(getValue);

      expect(memoizedGetValue()).toBe(42);
      expect(callCount).toBe(1);

      expect(memoizedGetValue()).toBe(42);
      expect(callCount).toBe(1);
    });

    test("handles functions that return objects", () => {
      let callCount = 0;
      const createUser = (name: string) => {
        callCount++;
        return { name, id: Math.random() };
      };

      const memoizedCreateUser = memoize(createUser);
      const user1 = memoizedCreateUser("Alice");
      const user2 = memoizedCreateUser("Alice");

      expect(callCount).toBe(1);
      expect(user1).toBe(user2); // Should be the exact same object
    });
  });

  describe("isNotNullish", () => {
    test("returns true for non-null, non-undefined values", () => {
      expect(isNotNullish(42)).toBe(true);
      expect(isNotNullish("hello")).toBe(true);
      expect(isNotNullish(0)).toBe(true);
      expect(isNotNullish(false)).toBe(true);
      expect(isNotNullish([])).toBe(true);
      expect(isNotNullish({})).toBe(true);
    });

    test("returns false for null", () => {
      expect(isNotNullish(null)).toBe(false);
    });

    test("returns false for undefined", () => {
      expect(isNotNullish(undefined)).toBe(false);
    });

    test("works as type guard", () => {
      const value: string | null | undefined = "hello";
      if (isNotNullish(value)) {
        // TypeScript should know this is a string
        expect(value.toUpperCase()).toBe("HELLO");
      }
    });

    test("filters arrays correctly", () => {
      const values = [1, null, 2, undefined, 3, null];
      const filtered = values.filter(isNotNullish);
      expect(filtered).toEqual([1, 2, 3]);
    });

    test("handles empty string", () => {
      expect(isNotNullish("")).toBe(true);
    });

    test("handles NaN", () => {
      expect(isNotNullish(NaN)).toBe(true);
    });
  });

  describe("safeArrayAccess", () => {
    test("returns success for valid indices", () => {
      const array = [1, 2, 3, 4, 5];
      expect(safeArrayAccess(array, 0)).toEqual(success(1));
      expect(safeArrayAccess(array, 2)).toEqual(success(3));
      expect(safeArrayAccess(array, 4)).toEqual(success(5));
    });

    test("returns failure for negative indices", () => {
      const array = [1, 2, 3];
      const result = safeArrayAccess(array, -1);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          "Index -1 is out of bounds for array of length 3",
        );
      }
    });

    test("returns failure for indices beyond array length", () => {
      const array = [1, 2, 3];
      const result = safeArrayAccess(array, 5);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          "Index 5 is out of bounds for array of length 3",
        );
      }
    });

    test("handles empty arrays", () => {
      const array: number[] = [];
      const result = safeArrayAccess(array, 0);
      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error.message).toBe(
          "Index 0 is out of bounds for array of length 0",
        );
      }
    });

    test("works with string arrays", () => {
      const array = ["a", "b", "c"];
      expect(safeArrayAccess(array, 1)).toEqual(success("b"));
    });

    test("works with object arrays", () => {
      const array = [{ id: 1 }, { id: 2 }, { id: 3 }];
      expect(safeArrayAccess(array, 0)).toEqual(success({ id: 1 }));
    });

    test("handles array with undefined values", () => {
      const array = [1, undefined, 3];
      expect(safeArrayAccess(array, 1)).toEqual(success(undefined));
    });
  });

  describe("combineResults", () => {
    test("combines all successful results", () => {
      const results = [success(1), success(2), success(3)];
      const combined = combineResults(results);
      expect(combined).toEqual(success([1, 2, 3]));
    });

    test("returns first failure when any result fails", () => {
      const results = [
        success(1),
        failure("error1"),
        success(3),
        failure("error2"),
      ];
      const combined = combineResults(results);
      expect(combined).toEqual(failure("error1"));
    });

    test("handles empty array", () => {
      const results: Array<Result<number, string>> = [];
      const combined = combineResults(results);
      expect(combined).toEqual(success([]));
    });

    test("handles single success", () => {
      const results = [success(42)];
      const combined = combineResults(results);
      expect(combined).toEqual(success([42]));
    });

    test("handles single failure", () => {
      const results = [failure("error")];
      const combined = combineResults(results);
      expect(combined).toEqual(failure("error"));
    });

    test("preserves order of successful values", () => {
      const results = [success("a"), success("b"), success("c")];
      const combined = combineResults(results);
      expect(combined).toEqual(success(["a", "b", "c"]));
    });

    test("works with different value types", () => {
      const results = [
        success({ id: 1, name: "Alice" }),
        success({ id: 2, name: "Bob" }),
      ];
      const combined = combineResults(results);
      expect(combined).toEqual(
        success([
          { id: 1, name: "Alice" },
          { id: 2, name: "Bob" },
        ]),
      );
    });

    test("stops at first failure and doesn't process remaining", () => {
      const results = [
        success(1),
        failure("first error"),
        failure("second error"),
      ];
      const combined = combineResults(results);
      expect(combined).toEqual(failure("first error"));
    });

    test("works with mixed error types", () => {
      const results = [
        success(1),
        failure(new Error("error message")),
        success(3),
      ];
      const combined = combineResults(results);
      expect(isFailure(combined)).toBe(true);
      if (isFailure(combined)) {
        expect(combined.error.message).toBe("error message");
      }
    });
  });
});
