package com.intuit.playertools.fluent.core

/**
 * A type-safe key for AuxiliaryStorage.
 * The type parameter T represents the type of value stored at this key.
 */
class TypedKey<T : Any>(
    val name: String,
)

/**
 * A type-safe key for list values in AuxiliaryStorage.
 * The type parameter T represents the element type of the list.
 */
class TypedListKey<T : Any>(
    val name: String,
)

/**
 * Storage for auxiliary metadata like templates and switches.
 * Uses typed keys to ensure type safety at call sites.
 */
class AuxiliaryStorage {
    private val data = mutableMapOf<String, Any>()

    /**
     * Sets a value for a typed key, replacing any existing value.
     */
    operator fun <T : Any> set(
        key: TypedKey<T>,
        value: T,
    ) {
        data[key.name] = value
    }

    /**
     * Gets a value by typed key.
     */
    @Suppress("UNCHECKED_CAST")
    fun <T : Any> get(key: TypedKey<T>): T? = data[key.name] as? T

    /**
     * Pushes an item to a list at the given typed list key.
     * Creates a new list if one doesn't exist.
     */
    @Suppress("UNCHECKED_CAST")
    fun <T : Any> push(
        key: TypedListKey<T>,
        item: T,
    ) {
        val existing = data[key.name]
        if (existing is MutableList<*>) {
            (existing as MutableList<T>).add(item)
        } else {
            data[key.name] = mutableListOf(item)
        }
    }

    /**
     * Gets a list by typed list key, returning empty list if not found.
     */
    @Suppress("UNCHECKED_CAST")
    fun <T : Any> getList(key: TypedListKey<T>): List<T> = (data[key.name] as? List<T>) ?: emptyList()

    /**
     * Checks if a typed key exists.
     */
    fun <T : Any> has(key: TypedKey<T>): Boolean = key.name in data

    /**
     * Checks if a typed list key exists.
     */
    fun <T : Any> has(key: TypedListKey<T>): Boolean = key.name in data

    /**
     * Removes a value by typed key.
     */
    fun <T : Any> remove(key: TypedKey<T>): Boolean = data.remove(key.name) != null

    /**
     * Removes a value by typed list key.
     */
    fun <T : Any> remove(key: TypedListKey<T>): Boolean = data.remove(key.name) != null

    /**
     * Clears all stored data.
     */
    fun clear() = data.clear()

    /**
     * Creates a shallow clone of this storage.
     */
    fun clone(): AuxiliaryStorage =
        AuxiliaryStorage().also { cloned ->
            cloned.copyFrom(this)
        }

    /**
     * Copies all data from another AuxiliaryStorage instance.
     * Clears existing data before copying.
     */
    fun copyFrom(other: AuxiliaryStorage) {
        data.clear()
        other.data.forEach { (key, value) ->
            data[key] =
                if (value is MutableList<*>) {
                    value.toMutableList()
                } else {
                    value
                }
        }
    }

    companion object {
        /** Key for storing template configuration functions */
        internal val TEMPLATES = TypedListKey<(BuildContext) -> TemplateConfig>("__templates__")

        /** Key for storing switch metadata */
        internal val SWITCHES = TypedListKey<SwitchMetadata>("__switches__")
    }
}
