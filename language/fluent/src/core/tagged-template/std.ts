import { isTaggedTemplateValue, type TaggedTemplateValue } from "./types";
import { expression } from "./expression";

/**
 * Type-safe standard library of expressions for the Player-UI DSL
 * Provides common logical, comparison, and arithmetic operations with full TypeScript type safety
 * using phantom types from TaggedTemplateValue.
 */

// ============================================================================
// Logical Operations
// ============================================================================

/**
 * Logical AND operation - returns true if all arguments are truthy
 * @param args - Values or bindings to evaluate with AND logic
 * @returns TaggedTemplateValue<boolean> representing the AND expression
 */
export function and(
  ...args: Array<TaggedTemplateValue<unknown> | boolean | string | number>
): TaggedTemplateValue<boolean> {
  const expressions = args.map((arg) => {
    if (isTaggedTemplateValue(arg)) {
      const expr = arg.toRefString({ nestedContext: "expression" });
      // Wrap OR expressions in parentheses to maintain proper precedence
      // (AND has higher precedence than OR)
      if (expr.includes(" || ") && !expr.startsWith("(")) {
        return `(${expr})`;
      }
      return expr;
    }
    return String(arg);
  });

  return expression`${expressions.join(" && ")}`;
}

/**
 * Logical OR operation - returns true if any argument is truthy
 * @param args - Values or bindings to evaluate with OR logic
 * @returns TaggedTemplateValue<boolean> representing the OR expression
 */
export function or(
  ...args: Array<TaggedTemplateValue<unknown> | boolean | string | number>
): TaggedTemplateValue<boolean> {
  const expressions = args.map((arg) => {
    if (isTaggedTemplateValue(arg)) {
      return arg.toRefString({ nestedContext: "expression" });
    }
    return String(arg);
  });

  return expression`${expressions.join(" || ")}`;
}

/**
 * Logical NOT operation - returns true if argument is falsy
 * @param value - Value or binding to negate
 * @returns TaggedTemplateValue<boolean> representing the NOT expression
 */
export function not(
  value: TaggedTemplateValue<unknown> | boolean | string | number,
): TaggedTemplateValue<boolean> {
  const expr = isTaggedTemplateValue(value)
    ? value.toRefString({ nestedContext: "expression" })
    : String(value);

  return expression`!${expr}`;
}

/**
 * Logical NOR operation - returns true if all arguments are falsy
 * @param args - Values or bindings to evaluate with NOR logic
 * @returns TaggedTemplateValue<boolean> representing the NOR expression
 */
export function nor(
  ...args: Array<TaggedTemplateValue<unknown> | boolean | string | number>
): TaggedTemplateValue<boolean> {
  return not(or(...args));
}

/**
 * Logical NAND operation - returns false if all arguments are truthy
 * @param args - Values or bindings to evaluate with NAND logic
 * @returns TaggedTemplateValue<boolean> representing the NAND expression
 */
export function nand(
  ...args: Array<TaggedTemplateValue<unknown> | boolean | string | number>
): TaggedTemplateValue<boolean> {
  return not(and(...args));
}

/**
 * Logical XOR operation - returns true if exactly one argument is truthy
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the XOR expression
 */
export function xor(
  left: TaggedTemplateValue<unknown> | boolean | string | number,
  right: TaggedTemplateValue<unknown> | boolean | string | number,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : String(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : String(right);

  return expression`(${leftExpr} && !${rightExpr}) || (!${leftExpr} && ${rightExpr})`;
}

// ============================================================================
// Comparison Operations
// ============================================================================

/**
 * Equality comparison (loose equality ==)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the equality expression
 */
export function equal<T>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} == ${rightExpr}`;
}

/**
 * Strict equality comparison (===)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the strict equality expression
 */
export function strictEqual<T>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} === ${rightExpr}`;
}

/**
 * Inequality comparison (!=)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the inequality expression
 */
export function notEqual<T>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} != ${rightExpr}`;
}

/**
 * Strict inequality comparison (!==)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the strict inequality expression
 */
export function strictNotEqual<T>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} !== ${rightExpr}`;
}

/**
 * Greater than comparison (>)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the greater than expression
 */
export function greaterThan<T extends number | string>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} > ${rightExpr}`;
}

/**
 * Greater than or equal comparison (>=)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the greater than or equal expression
 */
export function greaterThanOrEqual<T extends number | string>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} >= ${rightExpr}`;
}

/**
 * Less than comparison (<)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the less than expression
 */
export function lessThan<T extends number | string>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} < ${rightExpr}`;
}

/**
 * Less than or equal comparison (<=)
 * @param left - First value to compare
 * @param right - Second value to compare
 * @returns TaggedTemplateValue<boolean> representing the less than or equal expression
 */
export function lessThanOrEqual<T extends number | string>(
  left: TaggedTemplateValue<T> | T,
  right: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<boolean> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : JSON.stringify(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : JSON.stringify(right);

  return expression`${leftExpr} <= ${rightExpr}`;
}

// ============================================================================
// Arithmetic Operations
// ============================================================================

/**
 * Addition operation (+)
 * @param args - Values or bindings to add together
 * @returns TaggedTemplateValue<number> representing the addition expression
 */
export function add(
  ...args: Array<TaggedTemplateValue<number> | number>
): TaggedTemplateValue<number> {
  const expressions = args.map((arg) => {
    if (isTaggedTemplateValue(arg)) {
      return arg.toRefString({ nestedContext: "expression" });
    }
    return String(arg);
  });

  return expression`${expressions.join(" + ")}` as TaggedTemplateValue<number>;
}

/**
 * Subtraction operation (-)
 * @param left - Value to subtract from
 * @param right - Value to subtract
 * @returns TaggedTemplateValue<number> representing the subtraction expression
 */
export function subtract(
  left: TaggedTemplateValue<number> | number,
  right: TaggedTemplateValue<number> | number,
): TaggedTemplateValue<number> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : String(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : String(right);

  return expression`${leftExpr} - ${rightExpr}` as TaggedTemplateValue<number>;
}

/**
 * Multiplication operation (*)
 * @param args - Values or bindings to multiply together
 * @returns TaggedTemplateValue<number> representing the multiplication expression
 */
export function multiply(
  ...args: Array<TaggedTemplateValue<number> | number>
): TaggedTemplateValue<number> {
  const expressions = args.map((arg) => {
    if (isTaggedTemplateValue(arg)) {
      return arg.toRefString({ nestedContext: "expression" });
    }
    return String(arg);
  });

  return expression`${expressions.join(" * ")}` as TaggedTemplateValue<number>;
}

/**
 * Division operation (/)
 * @param left - Dividend
 * @param right - Divisor
 * @returns TaggedTemplateValue<number> representing the division expression
 */
export function divide(
  left: TaggedTemplateValue<number> | number,
  right: TaggedTemplateValue<number> | number,
): TaggedTemplateValue<number> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : String(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : String(right);

  return expression`${leftExpr} / ${rightExpr}` as TaggedTemplateValue<number>;
}

/**
 * Modulo operation (%)
 * @param left - Dividend
 * @param right - Divisor
 * @returns TaggedTemplateValue<number> representing the modulo expression
 */
export function modulo(
  left: TaggedTemplateValue<number> | number,
  right: TaggedTemplateValue<number> | number,
): TaggedTemplateValue<number> {
  const leftExpr = isTaggedTemplateValue(left)
    ? left.toRefString({ nestedContext: "expression" })
    : String(left);
  const rightExpr = isTaggedTemplateValue(right)
    ? right.toRefString({ nestedContext: "expression" })
    : String(right);

  return expression`${leftExpr} % ${rightExpr}` as TaggedTemplateValue<number>;
}

// ============================================================================
// Control Flow Operations
// ============================================================================

/**
 * Conditional (ternary) operation - if-then-else logic
 * @param condition - Condition to evaluate
 * @param ifTrue - Value to return if condition is truthy
 * @param ifFalse - Value to return if condition is falsy
 * @returns TaggedTemplateValue<T> representing the conditional expression
 */
export function conditional<T>(
  condition: TaggedTemplateValue<boolean> | boolean,
  ifTrue: TaggedTemplateValue<T> | T,
  ifFalse: TaggedTemplateValue<T> | T,
): TaggedTemplateValue<T> {
  const conditionExpr = isTaggedTemplateValue(condition)
    ? condition.toRefString({ nestedContext: "expression" })
    : String(condition);

  const trueExpr = isTaggedTemplateValue(ifTrue)
    ? ifTrue.toRefString({ nestedContext: "expression" })
    : JSON.stringify(ifTrue);

  const falseExpr = isTaggedTemplateValue(ifFalse)
    ? ifFalse.toRefString({ nestedContext: "expression" })
    : JSON.stringify(ifFalse);

  return expression`${conditionExpr} ? ${trueExpr} : ${falseExpr}` as TaggedTemplateValue<T>;
}

/**
 * Function call expression
 * @param functionName - Name of the function to call
 * @param args - Arguments to pass to the function
 * @returns TaggedTemplateValue<T> representing the function call expression
 */
export function call<T = unknown>(
  functionName: string,
  ...args: Array<TaggedTemplateValue<unknown> | unknown>
): TaggedTemplateValue<T> {
  const argExpressions = args.map((arg) => {
    if (isTaggedTemplateValue(arg)) {
      return arg.toRefString({
        nestedContext: "expression",
      });
    }
    return JSON.stringify(arg);
  });

  return expression`${functionName}(${argExpressions.join(", ")})` as TaggedTemplateValue<T>;
}

// ============================================================================
// Type Utilities
// ============================================================================

/**
 * Creates a literal value expression
 * @param value - Literal value to create expression for
 * @returns TaggedTemplateValue<T> representing the literal
 */
export function literal<T>(value: T): TaggedTemplateValue<T> {
  return expression`${JSON.stringify(value)}` as TaggedTemplateValue<T>;
}
// ============================================================================
// Shorthand Aliases
// ============================================================================

// Logical operations aliases
export { and as AND };
export { or as OR };
export { not as NOT };
export { nor as NOR };
export { nand as NAND };
export { xor as XOR };

// Comparison operations aliases
export { equal as eq };
export { strictEqual as strictEq };
export { notEqual as neq };
export { strictNotEqual as strictNeq };
export { greaterThan as gt };
export { greaterThanOrEqual as gte };
export { lessThan as lt };
export { lessThanOrEqual as lte };

// Arithmetic operations aliases
export { add as plus };
export { subtract as minus };
export { multiply as times };
export { divide as div };
export { modulo as mod };

// Control flow aliases
export { conditional as ternary, conditional as ifElse };
