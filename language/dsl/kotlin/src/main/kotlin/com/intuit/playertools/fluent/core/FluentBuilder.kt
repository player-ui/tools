package com.intuit.playertools.fluent.core

import com.intuit.playertools.fluent.FluentDslMarker

/**
 * Base interface for all fluent builders.
 * Defines the core contract for building Player-UI assets.
 */
interface FluentBuilder<T : Any> {
    /**
     * Builds the final asset/object from the configured properties.
     * @param context Optional build context for ID generation and nesting
     * @return The built object as a Map (JSON-serializable)
     */
    fun build(context: BuildContext? = null): Map<String, Any?>

    /**
     * Peeks at a property value without triggering resolution.
     * @param key The property name
     * @return The raw value or null if not set
     */
    fun peek(key: String): Any?

    /**
     * Checks if a property has been set.
     * @param key The property name
     * @return True if the property has a value
     */
    fun has(key: String): Boolean
}

/**
 * Abstract base class for fluent builders.
 * Provides common functionality for property storage, conditional building,
 * and the build pipeline.
 */
@FluentDslMarker
abstract class FluentBuilderBase<T : Any> : FluentBuilder<T> {
    protected val storage = ValueStorage()
    protected val auxiliary = AuxiliaryStorage()

    /**
     * Default values for properties. Subclasses should override this
     * to provide type-specific defaults (e.g., { "type" to "text" }).
     */
    protected abstract val defaults: Map<String, Any?>

    /**
     * Properties that are arrays and should be merged rather than replaced.
     * Used by the build pipeline for proper array handling.
     */
    protected open val arrayProperties: Set<String> = emptySet()

    /**
     * Properties that wrap assets (AssetWrapper). Used to auto-wrap
     * builder values in { asset: ... } structure.
     */
    protected open val assetWrapperProperties: Set<String> = emptySet()

    /**
     * Sets a property value.
     * @param key The property name
     * @param value The value to set
     * @return This builder for chaining
     */
    protected fun set(
        key: String,
        value: Any?,
    ): FluentBuilderBase<T> {
        storage[key] = value
        return this
    }

    /**
     * Conditionally sets a property if the predicate is true.
     * @param predicate A function that returns true if the property should be set
     * @param property The property name
     * @param value The value to set (can be a builder or static value)
     * @return This builder for chaining
     */
    fun setIf(
        predicate: () -> Boolean,
        property: String,
        value: Any?,
    ): FluentBuilderBase<T> {
        if (predicate()) {
            val wrapped = maybeWrapAsset(property, value)
            set(property, wrapped)
        }
        return this
    }

    /**
     * Conditionally sets a property to one of two values based on the predicate.
     * @param predicate A function that returns true for trueValue, false for falseValue
     * @param property The property name
     * @param trueValue The value if predicate is true
     * @param falseValue The value if predicate is false
     * @return This builder for chaining
     */
    fun setIfElse(
        predicate: () -> Boolean,
        property: String,
        trueValue: Any?,
        falseValue: Any?,
    ): FluentBuilderBase<T> {
        val valueToUse = if (predicate()) trueValue else falseValue
        val wrapped = maybeWrapAsset(property, valueToUse)
        set(property, wrapped)
        return this
    }

    override fun has(key: String): Boolean = storage.has(key)

    override fun peek(key: String): Any? = storage.peek(key)

    /**
     * Gets the type of value stored for a property.
     */
    fun getValueType(key: String): ValueType = storage.getValueType(key)

    /**
     * Removes a property value.
     * @param key The property name
     * @return This builder for chaining
     */
    fun unset(key: String): FluentBuilderBase<T> {
        storage.remove(key)
        return this
    }

    /**
     * Clears all property values, resetting the builder.
     * @return This builder for chaining
     */
    fun clear(): FluentBuilderBase<T> {
        storage.clear()
        auxiliary.clear()
        return this
    }

    /**
     * Creates a copy of this builder with the same property values.
     */
    abstract fun clone(): FluentBuilderBase<T>

    /**
     * Copies storage state to another builder (used by clone implementations).
     */
    protected fun cloneStorageTo(target: FluentBuilderBase<T>) {
        val clonedStorage = storage.clone()
        // Copy to target's storage
        target.storage.clear()
        clonedStorage.getValues().forEach { (k, v) -> target.storage[k] = v }
        clonedStorage.getBuilders().forEach { (k, v) -> target.storage[k] = v }
        clonedStorage.getMixedArrays().forEach { (k, v) -> target.storage[k] = v.array }
        target.auxiliary.copyFrom(auxiliary)
    }

    /**
     * Adds a template configuration for dynamic list generation.
     */
    fun template(templateFn: (BuildContext) -> TemplateConfig): FluentBuilderBase<T> {
        auxiliary.push(AuxiliaryStorage.TEMPLATES, templateFn)
        return this
    }

    /**
     * Adds a switch configuration for runtime conditional selection.
     */
    fun switch(
        path: List<Any>,
        args: SwitchArgs,
    ): FluentBuilderBase<T> {
        auxiliary.push(AuxiliaryStorage.SWITCHES, SwitchMetadata(path, args))
        return this
    }

    /**
     * Wraps a builder in AssetWrapper format if the property requires it.
     */
    private fun maybeWrapAsset(
        property: String,
        value: Any?,
    ): Any? {
        if (value == null) return null
        if (property !in assetWrapperProperties) return value

        return when (value) {
            is FluentBuilder<*> -> {
                AssetWrapperBuilder(value)
            }

            is List<*> -> {
                value.map { item ->
                    if (item is FluentBuilder<*>) AssetWrapperBuilder(item) else item
                }
            }

            else -> {
                value
            }
        }
    }

    /**
     * Executes the build pipeline with defaults.
     */
    protected fun buildWithDefaults(context: BuildContext?): Map<String, Any?> =
        BuildPipeline.execute(
            storage = storage,
            auxiliary = auxiliary,
            defaults = defaults,
            context = context,
            arrayProperties = arrayProperties,
            assetWrapperProperties = assetWrapperProperties,
        )
}

/**
 * Wrapper for builders that should be wrapped in AssetWrapper format.
 * Used by generated builders to wrap nested assets.
 */
class AssetWrapperBuilder(
    val builder: FluentBuilder<*>,
)

/**
 * Configuration for a template (dynamic list generation).
 */
data class TemplateConfig(
    val data: String,
    val output: String,
    val value: Any,
    val dynamic: Boolean = false,
)

/**
 * Arguments for switch configuration.
 */
data class SwitchArgs(
    val cases: List<SwitchCase>,
    val isDynamic: Boolean = false,
)

/**
 * A single case in a switch configuration.
 */
data class SwitchCase(
    val case: Any,
    val asset: Any,
)

/**
 * Internal metadata for switch configurations.
 */
internal data class SwitchMetadata(
    val path: List<Any>,
    val args: SwitchArgs,
)
