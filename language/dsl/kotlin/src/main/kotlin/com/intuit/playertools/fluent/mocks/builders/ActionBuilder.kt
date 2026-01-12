package com.intuit.playertools.fluent.mocks.builders

import com.intuit.playertools.fluent.FluentDslMarker
import com.intuit.playertools.fluent.core.AssetWrapperBuilder
import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.FluentBuilderBase
import com.intuit.playertools.fluent.tagged.TaggedValue

/**
 * Builder for ActionAsset with strongly-typed property setters.
 */
@FluentDslMarker
class ActionBuilder : FluentBuilderBase<Map<String, Any?>>() {
    override val defaults: Map<String, Any?> = mapOf("type" to "action")
    override val assetWrapperProperties: Set<String> = setOf("label")

    var id: String?
        get() = peek("id") as? String
        set(value) {
            set("id", value)
        }

    /**
     * Sets the action value (transition target).
     */
    var value: String?
        get() = peek("value") as? String
        set(value) {
            set("value", value)
        }

    /**
     * Sets the action value from a tagged value (expression).
     */
    fun value(taggedValue: TaggedValue<String>) {
        set("value", taggedValue)
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
     * Sets metadata for this action.
     */
    var metaData: Map<String, Any?>?
        @Suppress("UNCHECKED_CAST")
        get() = peek("metaData") as? Map<String, Any?>
        set(value) {
            set("metaData", value)
        }

    /**
     * Sets metadata using a builder DSL.
     */
    fun metaData(init: MutableMap<String, Any?>.() -> Unit) {
        set("metaData", mutableMapOf<String, Any?>().apply(init))
    }

    override fun build(context: BuildContext?): Map<String, Any?> = buildWithDefaults(context)

    override fun clone(): ActionBuilder = ActionBuilder().also { cloneStorageTo(it) }
}

/**
 * DSL function to create an ActionBuilder.
 */
fun action(init: ActionBuilder.() -> Unit = {}): ActionBuilder = ActionBuilder().apply(init)
