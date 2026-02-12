package com.intuit.playertools.fluent.id

import com.intuit.playertools.fluent.core.AssetMetadata
import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.IdBranch

/**
 * Generates a unique ID based on the build context and registers it.
 * Uses the global registry to ensure uniqueness with collision detection.
 *
 * @param context The build context containing parent ID, branch info, and metadata
 * @return A unique ID string
 * @throws IllegalArgumentException if branch validation fails
 */
fun genId(context: BuildContext): String {
    val baseId = generateBaseId(context)
    return GlobalIdRegistry.ensureUnique(baseId)
}

/**
 * Generates an ID without registering it. Useful for intermediate lookups
 * or when you need to preview what an ID would be without consuming it.
 *
 * @param context The build context
 * @return The ID that would be generated (without collision suffix)
 */
fun peekId(context: BuildContext): String = generateBaseId(context)

/**
 * Generates the base ID from context without collision detection.
 */
private fun generateBaseId(context: BuildContext): String {
    val parentId = context.parentId ?: ""
    val branch = context.branch

    return when (branch) {
        null -> {
            parentId
        }

        is IdBranch.Slot -> {
            require(branch.name.isNotEmpty()) {
                "genId: Slot branch requires a 'name' property"
            }
            if (parentId.isEmpty()) branch.name else "$parentId-${branch.name}"
        }

        is IdBranch.ArrayItem -> {
            require(branch.index >= 0) {
                "genId: Array-item index must be non-negative"
            }
            "$parentId-${branch.index}"
        }

        is IdBranch.Template -> {
            require(branch.depth >= 0) {
                "genId: Template depth must be non-negative"
            }
            val suffix = if (branch.depth == 0) "" else branch.depth.toString()
            "$parentId-_index${suffix}_"
        }

        is IdBranch.Switch -> {
            require(branch.index >= 0) {
                "genId: Switch index must be non-negative"
            }
            val kindName =
                when (branch.kind) {
                    IdBranch.Switch.SwitchKind.STATIC -> "static"
                    IdBranch.Switch.SwitchKind.DYNAMIC -> "dynamic"
                }
            "$parentId-${kindName}Switch-${branch.index}"
        }
    }
}

/**
 * Determines a smart slot name based on asset metadata.
 * Used for generating meaningful IDs based on the asset's type, binding, or value.
 *
 * @param parameterName The default parameter name (e.g., "label", "values")
 * @param assetMetadata Optional metadata about the asset
 * @return A descriptive slot name
 */
fun determineSlotName(
    parameterName: String,
    assetMetadata: AssetMetadata?,
): String {
    if (assetMetadata == null) return parameterName

    val type = assetMetadata.type
    val binding = assetMetadata.binding
    val value = assetMetadata.value

    // Rule 1: Action with value - append the value's last segment
    if (type == "action" && value != null) {
        val cleanValue = value.removeSurrounding("{{", "}}")
        val lastSegment = cleanValue.split(".").lastOrNull() ?: return type
        return "$type-$lastSegment"
    }

    // Rule 2: Non-action with binding - append the binding's last segment
    if (type != "action" && binding != null) {
        val cleanBinding = binding.removeSurrounding("{{", "}}")
        val lastSegment = cleanBinding.split(".").lastOrNull()
        if (lastSegment != null) {
            return "${type ?: parameterName}-$lastSegment"
        }
    }

    // Rule 3: Use type or fall back to parameter name
    return type ?: parameterName
}
