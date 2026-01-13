package com.intuit.playertools.fluent.mocks.builders

import com.intuit.playertools.fluent.FluentDslMarker
import com.intuit.playertools.fluent.core.AssetWrapperBuilder
import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.FluentBuilderBase
import com.intuit.playertools.fluent.tagged.Binding

/**
 * Builder for InputAsset with strongly-typed property setters.
 */
@FluentDslMarker
class InputBuilder : FluentBuilderBase<Map<String, Any?>>() {
    override val defaults: Map<String, Any?> = mapOf("type" to "input")
    override val assetWrapperProperties: Set<String> = setOf("label")

    var id: String?
        get() = peek("id") as? String
        set(value) {
            set("id", value)
        }

    /**
     * Sets the data binding for this input.
     */
    var binding: Binding<*>?
        get() = peek("binding") as? Binding<*>
        set(value) {
            set("binding", value)
        }

    /**
     * Sets the data binding from a string path.
     */
    fun binding(path: String) {
        set("binding", Binding<String>(path))
    }

    /**
     * Sets the label using a TextBuilder.
     * Automatically wrapped in AssetWrapper format during build.
     */
    var label: TextBuilder?
        get() = null // Write-only for DSL
        set(value) {
            if (value != null) {
                set("label", AssetWrapperBuilder(value))
            }
        }

    /**
     * Sets the label using a DSL block.
     * Automatically wrapped in AssetWrapper format during build.
     */
    fun label(init: TextBuilder.() -> Unit) {
        set("label", AssetWrapperBuilder(text(init)))
    }

    /**
     * Sets the placeholder text.
     */
    var placeholder: String?
        get() = peek("placeholder") as? String
        set(value) {
            set("placeholder", value)
        }

    override fun build(context: BuildContext?): Map<String, Any?> = buildWithDefaults(context)

    override fun clone(): InputBuilder = InputBuilder().also { cloneStorageTo(it) }
}

/**
 * DSL function to create an InputBuilder.
 */
fun input(init: InputBuilder.() -> Unit = {}): InputBuilder = InputBuilder().apply(init)
