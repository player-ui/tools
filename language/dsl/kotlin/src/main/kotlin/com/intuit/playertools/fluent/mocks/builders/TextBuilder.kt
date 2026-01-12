package com.intuit.playertools.fluent.mocks.builders

import com.intuit.playertools.fluent.FluentDslMarker
import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.FluentBuilderBase
import com.intuit.playertools.fluent.tagged.Binding
import com.intuit.playertools.fluent.tagged.TaggedValue

/**
 * Builder for TextAsset with strongly-typed property setters.
 * Demonstrates how generated builders provide type safety.
 */
@FluentDslMarker
class TextBuilder : FluentBuilderBase<Map<String, Any?>>() {
    override val defaults: Map<String, Any?> = mapOf("type" to "text")

    /**
     * Sets the text ID explicitly.
     */
    var id: String?
        get() = peek("id") as? String
        set(value) {
            set("id", value)
        }

    /**
     * Sets the text value (static string).
     */
    var value: String?
        get() = peek("value") as? String
        set(value) {
            set("value", value)
        }

    /**
     * Sets the text value from a binding.
     */
    fun value(binding: Binding<String>) {
        set("value", binding)
    }

    /**
     * Sets the text value from any tagged value.
     */
    fun value(taggedValue: TaggedValue<String>) {
        set("value", taggedValue)
    }

    override fun build(context: BuildContext?): Map<String, Any?> = buildWithDefaults(context)

    override fun clone(): TextBuilder = TextBuilder().also { cloneStorageTo(it) }
}

/**
 * DSL function to create a TextBuilder.
 */
fun text(init: TextBuilder.() -> Unit = {}): TextBuilder = TextBuilder().apply(init)
