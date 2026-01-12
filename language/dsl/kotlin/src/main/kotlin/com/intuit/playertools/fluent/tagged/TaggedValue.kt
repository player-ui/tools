package com.intuit.playertools.fluent.tagged

/**
 * Base interface for tagged values (bindings and expressions).
 * These represent dynamic values that are resolved at runtime by Player-UI.
 *
 * @param T Phantom type parameter for type-safe usage (not used at runtime)
 */
sealed interface TaggedValue<T> {
    /**
     * Returns the raw value without formatting.
     */
    fun toValue(): String

    /**
     * Returns the formatted string representation.
     * For bindings: "{{path}}"
     * For expressions: "@[expr]@"
     */
    override fun toString(): String
}

/**
 * Represents a data binding in Player-UI.
 * Bindings reference paths in the data model.
 *
 * Example: binding<String>("user.name") produces "{{user.name}}"
 *
 * @param T The expected type of the bound value (phantom type)
 * @property path The data path to bind to
 */
class Binding<T>(
    private val path: String,
) : TaggedValue<T> {
    override fun toValue(): String = path

    override fun toString(): String = "{{$path}}"

    /**
     * Returns the path with _index_ placeholders replaced.
     */
    fun withIndex(
        index: Int,
        depth: Int = 0,
    ): Binding<T> {
        val placeholder = if (depth == 0) "_index_" else "_index${depth}_"
        return Binding(path.replace(placeholder, index.toString()))
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Binding<*>) return false
        return path == other.path
    }

    override fun hashCode(): Int = path.hashCode()
}

/**
 * Represents an expression in Player-UI.
 * Expressions are evaluated at runtime.
 *
 * Example: expression<Boolean>("user.age >= 18") produces "@[user.age >= 18]@"
 *
 * @param T The expected return type of the expression (phantom type)
 * @property expr The expression string
 */
class Expression<T>(
    private val expr: String,
) : TaggedValue<T> {
    init {
        validateSyntax(expr)
    }

    override fun toValue(): String = expr

    override fun toString(): String = "@[$expr]@"

    /**
     * Returns the expression with _index_ placeholders replaced.
     */
    fun withIndex(
        index: Int,
        depth: Int = 0,
    ): Expression<T> {
        val placeholder = if (depth == 0) "_index_" else "_index${depth}_"
        return Expression(expr.replace(placeholder, index.toString()))
    }

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other !is Expression<*>) return false
        return expr == other.expr
    }

    override fun hashCode(): Int = expr.hashCode()

    private fun validateSyntax(expression: String) {
        var openParens = 0
        expression.forEachIndexed { index, char ->
            when (char) {
                '(' -> {
                    openParens++
                }

                ')' -> {
                    openParens--
                    if (openParens < 0) {
                        throw IllegalArgumentException(
                            "Unexpected ) at character $index in expression: $expression",
                        )
                    }
                }
            }
        }
        if (openParens > 0) {
            throw IllegalArgumentException("Expected ) in expression: $expression")
        }
    }
}

/**
 * Creates a binding to a data path.
 *
 * @param T The expected type of the bound value
 * @param path The data path (e.g., "user.name", "items._index_.value")
 * @return A Binding instance
 */
fun <T> binding(path: String): Binding<T> = Binding(processIndexPlaceholders(path))

/**
 * Creates an expression.
 *
 * @param T The expected return type of the expression
 * @param expr The expression string (e.g., "user.age >= 18", "navigate('home')")
 * @return An Expression instance
 */
fun <T> expression(expr: String): Expression<T> = Expression(processIndexPlaceholders(expr))

/**
 * Processes _index_ placeholders in a path/expression.
 * Supports nested indices: _index_, _index1_, _index2_, etc.
 */
private fun processIndexPlaceholders(input: String): String {
    // This function currently returns the input as-is.
    // The placeholder substitution happens during template resolution.
    return input
}

/**
 * Checks if a value is a TaggedValue.
 */
fun isTaggedValue(value: Any?): Boolean = value is TaggedValue<*>

/**
 * Resolves a TaggedValue to its string representation.
 * Non-tagged values are returned as-is.
 */
fun resolveTaggedValue(value: Any?): Any? =
    when (value) {
        is TaggedValue<*> -> value.toString()
        else -> value
    }
