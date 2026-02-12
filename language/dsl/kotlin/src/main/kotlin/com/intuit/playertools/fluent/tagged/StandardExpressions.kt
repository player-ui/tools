package com.intuit.playertools.fluent.tagged

import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

/*
 * Standard library of expressions for the Player-UI DSL.
 * Provides common logical, comparison, and arithmetic operations.
 * Matches the TypeScript fluent library's std.ts implementation.
 */

/**
 * Logical AND operation - returns true if all arguments are truthy.
 */
fun and(vararg args: Any): Expression<Boolean> {
    val expressions =
        args.map { arg ->
            val expr = toExpressionString(arg)
            // Wrap OR expressions in parentheses to maintain proper precedence
            if (expr.contains(" || ") && !expr.startsWith("(")) {
                "($expr)"
            } else {
                expr
            }
        }
    return expression(expressions.joinToString(" && "))
}

/**
 * Logical OR operation - returns true if any argument is truthy.
 */
fun or(vararg args: Any): Expression<Boolean> {
    val expressions = args.map { toExpressionString(it) }
    return expression(expressions.joinToString(" || "))
}

/**
 * Logical NOT operation - returns true if argument is falsy.
 */
fun not(value: Any): Expression<Boolean> {
    val expr = toExpressionString(value)
    // Wrap complex expressions in parentheses
    val wrappedExpr =
        if (expr.contains(" ") && !expr.startsWith("(")) {
            "($expr)"
        } else {
            expr
        }
    return expression("!$wrappedExpr")
}

/**
 * Logical NOR operation - returns true if all arguments are falsy.
 */
fun nor(vararg args: Any): Expression<Boolean> = not(or(*args))

/**
 * Logical NAND operation - returns false if all arguments are truthy.
 */
fun nand(vararg args: Any): Expression<Boolean> = not(and(*args))

/**
 * Logical XOR operation - returns true if exactly one argument is truthy.
 */
fun xor(left: Any, right: Any): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toExpressionString(right)
    return expression("($leftExpr && !$rightExpr) || (!$leftExpr && $rightExpr)")
}

/**
 * Equality comparison (loose equality ==).
 */
fun <T> equal(left: Any, right: T): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr == $rightExpr")
}

/**
 * Strict equality comparison (===).
 */
fun <T> strictEqual(left: Any, right: T): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr === $rightExpr")
}

/**
 * Inequality comparison (!=).
 */
fun <T> notEqual(left: Any, right: T): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr != $rightExpr")
}

/**
 * Strict inequality comparison (!==).
 */
fun <T> strictNotEqual(left: Any, right: T): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr !== $rightExpr")
}

/**
 * Greater than comparison (>).
 */
fun greaterThan(left: Any, right: Any): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr > $rightExpr")
}

/**
 * Greater than or equal comparison (>=).
 */
fun greaterThanOrEqual(left: Any, right: Any): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr >= $rightExpr")
}

/**
 * Less than comparison (<).
 */
fun lessThan(left: Any, right: Any): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr < $rightExpr")
}

/**
 * Less than or equal comparison (<=).
 */
fun lessThanOrEqual(left: Any, right: Any): Expression<Boolean> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toValueString(right)
    return expression("$leftExpr <= $rightExpr")
}

/**
 * Addition operation (+).
 */
fun add(vararg args: Any): Expression<Number> {
    val expressions = args.map { toExpressionString(it) }
    return expression(expressions.joinToString(" + "))
}

/**
 * Subtraction operation (-).
 */
fun subtract(left: Any, right: Any): Expression<Number> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toExpressionString(right)
    return expression("$leftExpr - $rightExpr")
}

/**
 * Multiplication operation (*).
 */
fun multiply(vararg args: Any): Expression<Number> {
    val expressions = args.map { toExpressionString(it) }
    return expression(expressions.joinToString(" * "))
}

/**
 * Division operation (/).
 */
fun divide(left: Any, right: Any): Expression<Number> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toExpressionString(right)
    return expression("$leftExpr / $rightExpr")
}

/**
 * Modulo operation (%).
 */
fun modulo(left: Any, right: Any): Expression<Number> {
    val leftExpr = toExpressionString(left)
    val rightExpr = toExpressionString(right)
    return expression("$leftExpr % $rightExpr")
}

/**
 * Conditional (ternary) operation - if-then-else logic.
 */
fun <T> conditional(
    condition: Any,
    ifTrue: T,
    ifFalse: T
): Expression<T> {
    val conditionExpr = toExpressionString(condition)
    val trueExpr = toValueString(ifTrue)
    val falseExpr = toValueString(ifFalse)
    return expression("$conditionExpr ? $trueExpr : $falseExpr")
}

/**
 * Function call expression.
 */
fun <T> call(functionName: String, vararg args: Any): Expression<T> {
    val argExpressions = args.map { toValueString(it) }
    return expression("$functionName(${argExpressions.joinToString(", ")})")
}

/**
 * Creates a literal value expression.
 */
fun <T> literal(value: T): Expression<T> = expression(toValueString(value))

/**
 * Converts a value to its expression string representation.
 * For TaggedValues, extracts the inner expression/binding path.
 * For primitives, returns the string representation.
 */
private fun toExpressionString(value: Any): String =
    when (value) {
        is TaggedValue<*> -> value.toValue()
        is Boolean -> value.toString()
        is Number -> value.toString()
        is String -> value
        else -> value.toString()
    }

/**
 * Converts a value to its JSON representation for use in expressions.
 * For TaggedValues, extracts the inner expression/binding path.
 * For primitives, returns JSON-encoded strings.
 */
private fun toValueString(value: Any?): String =
    when (value) {
        null -> "null"
        is TaggedValue<*> -> value.toValue()
        is Boolean -> value.toString()
        is Number -> value.toString()
        is String -> "\"$value\""
        is List<*> -> Json.encodeToString(value.map { toValueString(it) })
        is Map<*, *> -> Json.encodeToString(value.mapValues { toValueString(it.value) })
        else -> "\"$value\""
    }

/**
 * Comparison aliases as functions.
 */
fun <T> eq(left: Any, right: T): Expression<Boolean> = equal(left, right)

fun <T> strictEq(left: Any, right: T): Expression<Boolean> = strictEqual(left, right)

fun <T> neq(left: Any, right: T): Expression<Boolean> = notEqual(left, right)

fun <T> strictNeq(left: Any, right: T): Expression<Boolean> = strictNotEqual(left, right)

fun gt(left: Any, right: Any): Expression<Boolean> = greaterThan(left, right)

fun gte(left: Any, right: Any): Expression<Boolean> = greaterThanOrEqual(left, right)

fun lt(left: Any, right: Any): Expression<Boolean> = lessThan(left, right)

fun lte(left: Any, right: Any): Expression<Boolean> = lessThanOrEqual(left, right)

/**
 * Arithmetic aliases as functions.
 */
fun plus(vararg args: Any): Expression<Number> = add(*args)

fun minus(left: Any, right: Any): Expression<Number> = subtract(left, right)

fun times(vararg args: Any): Expression<Number> = multiply(*args)

fun div(left: Any, right: Any): Expression<Number> = divide(left, right)

fun mod(left: Any, right: Any): Expression<Number> = modulo(left, right)

/**
 * Control flow aliases as functions.
 */
fun <T> ternary(condition: Any, ifTrue: T, ifFalse: T): Expression<T> = conditional(condition, ifTrue, ifFalse)

fun <T> ifElse(condition: Any, ifTrue: T, ifFalse: T): Expression<T> = conditional(condition, ifTrue, ifFalse)
