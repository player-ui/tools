package com.intuit.playertools.fluent.mocks.builders

import com.intuit.playertools.fluent.FluentDslMarker
import com.intuit.playertools.fluent.core.AssetWrapperBuilder
import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.FluentBuilder
import com.intuit.playertools.fluent.core.FluentBuilderBase
import com.intuit.playertools.fluent.core.SwitchArgs
import com.intuit.playertools.fluent.core.TemplateConfig
import com.intuit.playertools.fluent.tagged.Binding

/**
 * Builder for CollectionAsset with strongly-typed property setters.
 */
@FluentDslMarker
class CollectionBuilder : FluentBuilderBase<Map<String, Any?>>() {
    override val defaults: Map<String, Any?> = mapOf("type" to "collection")
    override val assetWrapperProperties: Set<String> = setOf("label")
    override val arrayProperties: Set<String> = setOf("values", "actions")

    var id: String?
        get() = peek("id") as? String
        set(value) {
            set("id", value)
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
     * Sets the values array (list of asset builders).
     */
    var values: List<FluentBuilder<*>>?
        get() = null // Write-only for DSL
        set(value) {
            set("values", value)
        }

    /**
     * Adds values using a builder DSL.
     */
    fun values(vararg builders: FluentBuilder<*>) {
        set("values", builders.toList())
    }

    /**
     * Sets the actions array.
     */
    var actions: List<ActionBuilder>?
        get() = null // Write-only for DSL
        set(value) {
            set("actions", value)
        }

    /**
     * Adds actions using a builder DSL.
     */
    fun actions(vararg builders: ActionBuilder) {
        set("actions", builders.toList())
    }

    /**
     * Adds a template for dynamic list generation.
     */
    fun <T> template(
        data: Binding<List<T>>,
        output: String = "values",
        dynamic: Boolean = false,
        builder: () -> FluentBuilder<*>,
    ) {
        template { ctx ->
            TemplateConfig(
                data = data.toString(),
                output = output,
                value = builder(),
                dynamic = dynamic,
            )
        }
    }

    /**
     * Adds a switch for runtime conditional selection.
     */
    fun switch(
        path: List<Any>,
        isDynamic: Boolean = false,
        init: SwitchBuilder.() -> Unit,
    ) {
        val switchBuilder = SwitchBuilder().apply(init)
        switch(path, SwitchArgs(switchBuilder.cases, isDynamic))
    }

    override fun build(context: BuildContext?): Map<String, Any?> = buildWithDefaults(context)

    override fun clone(): CollectionBuilder = CollectionBuilder().also { cloneStorageTo(it) }
}

/**
 * DSL function to create a CollectionBuilder.
 */
fun collection(init: CollectionBuilder.() -> Unit = {}): CollectionBuilder = CollectionBuilder().apply(init)

/**
 * Helper builder for constructing switch cases.
 */
@FluentDslMarker
class SwitchBuilder {
    internal val cases = mutableListOf<com.intuit.playertools.fluent.core.SwitchCase>()

    /**
     * Adds a case with a boolean condition.
     */
    fun case(
        condition: Boolean,
        asset: FluentBuilder<*>,
    ) {
        cases.add(
            com.intuit.playertools.fluent.core
                .SwitchCase(condition, asset),
        )
    }

    /**
     * Adds a case with an expression condition.
     */
    fun case(
        condition: com.intuit.playertools.fluent.tagged.Expression<Boolean>,
        asset: FluentBuilder<*>,
    ) {
        cases.add(
            com.intuit.playertools.fluent.core
                .SwitchCase(condition, asset),
        )
    }

    /**
     * Adds a case using a DSL block.
     */
    fun case(
        condition: Any,
        init: () -> FluentBuilder<*>,
    ) {
        cases.add(
            com.intuit.playertools.fluent.core
                .SwitchCase(condition, init()),
        )
    }

    /**
     * Adds a default case (always true).
     */
    fun default(asset: FluentBuilder<*>) {
        cases.add(
            com.intuit.playertools.fluent.core
                .SwitchCase(true, asset),
        )
    }

    /**
     * Adds a default case using a DSL block.
     */
    fun default(init: () -> FluentBuilder<*>) {
        cases.add(
            com.intuit.playertools.fluent.core
                .SwitchCase(true, init()),
        )
    }
}
