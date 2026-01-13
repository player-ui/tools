package com.intuit.playertools.fluent.id

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/**
 * Thread-safe global registry for tracking generated asset IDs and ensuring uniqueness.
 * When an ID collision is detected, a numeric suffix (-1, -2, etc.) is appended.
 * Call [reset] between flow builds to clear the ID namespace.
 */
object GlobalIdRegistry {
    private val registered: MutableSet<String> = ConcurrentHashMap.newKeySet()
    private val suffixCounters = ConcurrentHashMap<String, AtomicInteger>()

    /**
     * Registers an ID and returns a unique version.
     * If the ID already exists, appends a numeric suffix.
     *
     * @param baseId The desired base ID
     * @return A unique ID (either baseId or baseId-N where N is a number)
     */
    fun ensureUnique(baseId: String): String {
        // Try to add the base ID directly first
        if (registered.add(baseId)) {
            return baseId
        }

        // ID exists, use atomic counter for suffix generation
        val counter = suffixCounters.computeIfAbsent(baseId) { AtomicInteger(0) }
        while (true) {
            val candidate = "$baseId-${counter.incrementAndGet()}"
            if (registered.add(candidate)) {
                return candidate
            }
        }
    }

    /**
     * Checks if an ID is already registered without registering it.
     */
    fun isRegistered(id: String): Boolean = id in registered

    /**
     * Clears all registered IDs. Should be called between flow builds
     * to reset the ID namespace.
     *
     * Note: This method is not atomic with respect to ongoing registrations.
     * Ensure no concurrent registrations are happening when calling reset.
     */
    fun reset() {
        registered.clear()
        suffixCounters.clear()
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
