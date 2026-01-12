package com.intuit.playertools.fluent.id

/**
 * Global registry for tracking generated asset IDs and ensuring uniqueness.
 * When an ID collision is detected, a numeric suffix (-1, -2, etc.) is appended.
 */
object GlobalIdRegistry {
    private val registered = mutableSetOf<String>()

    /**
     * Registers an ID and returns a unique version.
     * If the ID already exists, appends a numeric suffix.
     *
     * @param baseId The desired base ID
     * @return A unique ID (either baseId or baseId-N where N is a number)
     */
    fun ensureUnique(baseId: String): String {
        if (baseId !in registered) {
            registered.add(baseId)
            return baseId
        }

        var suffix = 1
        var candidate = "$baseId-$suffix"
        while (candidate in registered) {
            suffix++
            candidate = "$baseId-$suffix"
        }
        registered.add(candidate)
        return candidate
    }

    /**
     * Checks if an ID is already registered without registering it.
     */
    fun isRegistered(id: String): Boolean = id in registered

    /**
     * Clears all registered IDs. Should be called between flow builds
     * to reset the ID namespace.
     */
    fun reset() {
        registered.clear()
    }

    /**
     * Returns the count of registered IDs (useful for testing).
     */
    fun size(): Int = registered.size
}

/**
 * Resets the global ID registry. Convenience function for use between flow builds.
 */
fun resetGlobalIdRegistry() {
    GlobalIdRegistry.reset()
}
