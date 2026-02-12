package com.intuit.playertools.fluent.core

/**
 * Represents the different branch types used for hierarchical ID generation.
 * Each branch type determines how the ID segment is constructed.
 */
sealed interface IdBranch {
    /**
     * A named slot branch (e.g., "parent-label", "parent-values").
     * Used for named properties like label, values, actions.
     */
    data class Slot(
        val name: String,
    ) : IdBranch

    /**
     * An array item branch with index (e.g., "parent-0", "parent-1").
     * Used for items within array properties.
     */
    data class ArrayItem(
        val index: Int,
    ) : IdBranch

    /**
     * A template branch with optional depth for nested templates.
     * depth=0 or null produces "_index_", depth=1 produces "_index1_", etc.
     */
    data class Template(
        val depth: Int = 0,
    ) : IdBranch

    /**
     * A switch branch for conditional asset selection.
     * Generates IDs like "parent-staticSwitch-0" or "parent-dynamicSwitch-1".
     */
    data class Switch(
        val index: Int,
        val kind: SwitchKind,
    ) : IdBranch {
        enum class SwitchKind { STATIC, DYNAMIC }
    }
}

/**
 * Metadata about an asset being built, used for smart ID naming.
 */
data class AssetMetadata(
    val type: String? = null,
    val binding: String? = null,
    val value: String? = null,
)

/**
 * Context passed during the build process to generate hierarchical IDs
 * and manage nested asset relationships.
 */
data class BuildContext(
    val parentId: String? = null,
    val parameterName: String? = null,
    val index: Int? = null,
    val branch: IdBranch? = null,
    val assetMetadata: AssetMetadata? = null,
) {
    fun withParentId(id: String): BuildContext = copy(parentId = id)

    fun withBranch(branch: IdBranch): BuildContext = copy(branch = branch)

    fun withIndex(index: Int): BuildContext = copy(index = index)

    fun withAssetMetadata(metadata: AssetMetadata): BuildContext = copy(assetMetadata = metadata)

    fun withParameterName(name: String): BuildContext = copy(parameterName = name)

    fun clearBranch(): BuildContext = copy(branch = null)
}
