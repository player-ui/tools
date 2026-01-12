package com.intuit.playertools.fluent.mocks.types

/**
 * Base interface for all Player-UI assets.
 * All assets have an ID and a type discriminator.
 */
interface Asset {
    val id: String?
    val type: String
}

/**
 * Asset wrapper - wraps an asset for nested properties.
 * Used for properties like `label`, where the asset is wrapped in { asset: ... }.
 */
data class AssetWrapper<T : Asset>(
    val asset: T,
)

/**
 * Text asset - displays static or dynamic text.
 */
data class TextAsset(
    override val id: String? = null,
    override val type: String = "text",
    val value: String? = null,
) : Asset

/**
 * Input asset - captures user input bound to the data model.
 */
data class InputAsset(
    override val id: String? = null,
    override val type: String = "input",
    val binding: String? = null,
    val label: AssetWrapper<TextAsset>? = null,
    val placeholder: String? = null,
) : Asset

/**
 * Action asset - triggers transitions or side effects.
 */
data class ActionAsset(
    override val id: String? = null,
    override val type: String = "action",
    val value: String? = null,
    val label: AssetWrapper<TextAsset>? = null,
    val metaData: Map<String, Any?>? = null,
) : Asset

/**
 * Collection asset - contains other assets in a structured layout.
 */
data class CollectionAsset(
    override val id: String? = null,
    override val type: String = "collection",
    val label: AssetWrapper<TextAsset>? = null,
    val values: List<AssetWrapper<Asset>>? = null,
    val actions: List<AssetWrapper<ActionAsset>>? = null,
) : Asset
