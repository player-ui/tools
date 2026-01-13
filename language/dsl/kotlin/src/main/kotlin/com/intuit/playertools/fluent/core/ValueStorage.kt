package com.intuit.playertools.fluent.core

/**
 * Metadata for arrays that contain a mix of static values and builders.
 * Tracks which indices contain builders for selective resolution.
 */
data class MixedArrayMetadata(
    val array: List<Any?>,
    val builderIndices: Set<Int>,
    val objectIndices: Set<Int>,
)

/**
 * Determines the type of value stored for a given key.
 */
enum class ValueType {
    STATIC,
    BUILDER,
    MIXED_ARRAY,
    UNSET,
}

/**
 * Storage for builder property values with intelligent routing.
 * Separates static values, builder instances, and mixed arrays
 * for efficient resolution during the build phase.
 */
class ValueStorage {
    private val values = mutableMapOf<String, Any?>()
    private val builders = mutableMapOf<String, Any>()
    private val mixedArrays = mutableMapOf<String, MixedArrayMetadata>()

    /**
     * Sets a value with automatic routing based on type.
     * - FluentBuilder instances → builders map
     * - AssetWrapperBuilder instances → builders map
     * - Arrays containing builders → mixedArrays map
     * - Objects containing builders → builders map
     * - Everything else → values map
     */
    operator fun set(
        key: String,
        value: Any?,
    ) {
        when {
            value == null -> {
                values[key] = null
                builders.remove(key)
                mixedArrays.remove(key)
            }

            value is FluentBuilder<*> -> {
                builders[key] = value
                values.remove(key)
                mixedArrays.remove(key)
            }

            value is AssetWrapperBuilder -> {
                builders[key] = value
                values.remove(key)
                mixedArrays.remove(key)
            }

            value is List<*> -> {
                handleArrayValue(key, value)
            }

            value.containsBuilder() -> {
                builders[key] = value
                values.remove(key)
                mixedArrays.remove(key)
            }

            else -> {
                values[key] = value
                builders.remove(key)
                mixedArrays.remove(key)
            }
        }
    }

    /**
     * Gets a static value by key.
     */
    operator fun get(key: String): Any? = values[key]

    /**
     * Gets a builder by key.
     */
    fun getBuilder(key: String): Any? = builders[key]

    /**
     * Gets mixed array metadata by key.
     */
    fun getMixedArray(key: String): MixedArrayMetadata? = mixedArrays[key]

    /**
     * Checks if a key has any value (static, builder, or mixed array).
     */
    fun has(key: String): Boolean = key in values || key in builders || key in mixedArrays

    /**
     * Peeks at a value without resolution (checks all storage maps).
     */
    fun peek(key: String): Any? = values[key] ?: builders[key] ?: mixedArrays[key]?.array

    /**
     * Removes a value from all storage maps.
     */
    fun remove(key: String) {
        values.remove(key)
        builders.remove(key)
        mixedArrays.remove(key)
    }

    /**
     * Clears all stored values.
     */
    fun clear() {
        values.clear()
        builders.clear()
        mixedArrays.clear()
    }

    /**
     * Returns the type of value stored for a key.
     */
    fun getValueType(key: String): ValueType =
        when {
            key in mixedArrays -> ValueType.MIXED_ARRAY
            key in builders -> ValueType.BUILDER
            key in values -> ValueType.STATIC
            else -> ValueType.UNSET
        }

    /**
     * Creates a shallow clone of this storage.
     */
    fun clone(): ValueStorage =
        ValueStorage().also { cloned ->
            cloned.values.putAll(values)
            cloned.builders.putAll(builders)
            cloned.mixedArrays.putAll(mixedArrays)
        }

    /**
     * Returns all static values (for internal use in build pipeline).
     */
    internal fun getValues(): Map<String, Any?> = values.toMap()

    /**
     * Returns all builders (for internal use in build pipeline).
     */
    internal fun getBuilders(): Map<String, Any> = builders.toMap()

    /**
     * Returns all mixed arrays (for internal use in build pipeline).
     */
    internal fun getMixedArrays(): Map<String, MixedArrayMetadata> = mixedArrays.toMap()

    private fun handleArrayValue(
        key: String,
        value: List<*>,
    ) {
        val builderIndices = mutableSetOf<Int>()
        val objectIndices = mutableSetOf<Int>()

        value.forEachIndexed { index, item ->
            when {
                item is FluentBuilder<*> -> builderIndices.add(index)
                item is AssetWrapperBuilder -> builderIndices.add(index)
                item.containsBuilder() -> objectIndices.add(index)
            }
        }

        if (builderIndices.isNotEmpty() || objectIndices.isNotEmpty()) {
            mixedArrays[key] =
                MixedArrayMetadata(
                    array = value.toList(),
                    builderIndices = builderIndices,
                    objectIndices = objectIndices,
                )
            values.remove(key)
        } else {
            values[key] = value
            mixedArrays.remove(key)
        }
        builders.remove(key)
    }

    private fun Any?.containsBuilder(): Boolean {
        if (this == null) return false
        if (this is FluentBuilder<*>) return true
        if (this is AssetWrapperBuilder) return true
        if (this is Map<*, *>) return values.any { it.containsBuilder() }
        if (this is List<*>) return any { it.containsBuilder() }
        return false
    }
}
