package com.intuit.playertools.fluent.generator

/**
 * Utility class for generating formatted Kotlin code.
 * Handles indentation, line management, and common code patterns.
 */
class CodeWriter {
    private val lines = mutableListOf<String>()
    private var indentLevel = 0
    private val indentString = "    " // 4 spaces

    /**
     * Get the current indentation string.
     */
    private fun currentIndent(): String = indentString.repeat(indentLevel)

    /**
     * Add a line of code at the current indentation level.
     */
    fun line(code: String) {
        if (code.isEmpty()) {
            lines.add("")
        } else {
            lines.add("${currentIndent()}$code")
        }
    }

    /**
     * Add an empty line.
     */
    fun blankLine() {
        lines.add("")
    }

    /**
     * Increase indentation level.
     */
    fun indent() {
        indentLevel++
    }

    /**
     * Decrease indentation level.
     */
    fun dedent() {
        if (indentLevel > 0) {
            indentLevel--
        }
    }

    /**
     * Add a block of code with automatic indentation.
     * Opens with the given line, increases indent, runs the block, decreases indent, closes with closing line.
     */
    fun block(openLine: String, closeLine: String = "}", block: CodeWriter.() -> Unit) {
        line(openLine)
        indent()
        block()
        dedent()
        line(closeLine)
    }

    /**
     * Add a class definition block.
     */
    fun classBlock(
        name: String,
        annotations: List<String> = emptyList(),
        superClass: String? = null,
        typeParams: String? = null,
        block: CodeWriter.() -> Unit
    ) {
        annotations.forEach { line(it) }
        val classDecl =
            buildString {
                append("class $name")
                if (typeParams != null) {
                    append("<$typeParams>")
                }
                if (superClass != null) {
                    append(" : $superClass")
                }
                append(" {")
            }
        block(classDecl, "}", block)
    }

    /**
     * Add an object declaration block.
     */
    fun objectBlock(
        name: String,
        annotations: List<String> = emptyList(),
        block: CodeWriter.() -> Unit
    ) {
        annotations.forEach { line(it) }
        block("object $name {", "}", block)
    }

    /**
     * Add a function definition block.
     */
    fun functionBlock(
        name: String,
        params: String = "",
        returnType: String? = null,
        modifiers: List<String> = emptyList(),
        block: CodeWriter.() -> Unit
    ) {
        val modifierStr = if (modifiers.isNotEmpty()) modifiers.joinToString(" ") + " " else ""
        val returnStr = if (returnType != null) ": $returnType" else ""
        block("${modifierStr}fun $name($params)$returnStr {", "}", block)
    }

    /**
     * Add a property with getter and setter.
     */
    fun property(
        name: String,
        type: String,
        modifiers: List<String> = emptyList(),
        getter: (CodeWriter.() -> Unit)? = null,
        setter: (CodeWriter.() -> Unit)? = null
    ) {
        val modifierStr = if (modifiers.isNotEmpty()) modifiers.joinToString(" ") + " " else ""
        line("${modifierStr}var $name: $type")
        if (getter != null) {
            indent()
            line("get() {")
            indent()
            getter()
            dedent()
            line("}")
            dedent()
        }
        if (setter != null) {
            indent()
            line("set(value) {")
            indent()
            setter()
            dedent()
            line("}")
            dedent()
        }
    }

    /**
     * Add a simple property with inline getter/setter.
     */
    fun simpleProperty(
        name: String,
        type: String,
        getterExpr: String,
        setterExpr: String,
        modifiers: List<String> = emptyList()
    ) {
        val modifierStr = if (modifiers.isNotEmpty()) modifiers.joinToString(" ") + " " else ""
        line("${modifierStr}var $name: $type")
        indent()
        line("get() = $getterExpr")
        line("set(value) { $setterExpr }")
        dedent()
    }

    /**
     * Add a val property with inline getter.
     */
    fun valProperty(
        name: String,
        type: String,
        value: String,
        modifiers: List<String> = emptyList()
    ) {
        val modifierStr = if (modifiers.isNotEmpty()) modifiers.joinToString(" ") + " " else ""
        line("${modifierStr}val $name: $type = $value")
    }

    /**
     * Add an override val property.
     */
    fun overrideVal(name: String, type: String, value: String) {
        line("override val $name: $type = $value")
    }

    /**
     * Add a KDoc comment block.
     */
    fun kdoc(comment: String) {
        if (comment.contains("\n")) {
            line("/**")
            comment.lines().forEach { line(" * $it") }
            line(" */")
        } else {
            line("/** $comment */")
        }
    }

    /**
     * Add raw lines (useful for multi-line strings).
     */
    fun raw(code: String) {
        code.lines().forEach { lines.add(it) }
    }

    /**
     * Get the generated code as a string.
     */
    fun build(): String = lines.joinToString("\n")

    /**
     * Get the generated code with a trailing newline.
     */
    fun buildWithNewline(): String = build() + "\n"

    companion object {
        /**
         * Create a CodeWriter and run the builder block.
         */
        fun write(block: CodeWriter.() -> Unit): String = CodeWriter().apply(block).buildWithNewline()
    }
}

/**
 * Extension function for easily creating code blocks.
 */
fun codeWriter(block: CodeWriter.() -> Unit): String = CodeWriter.write(block)
