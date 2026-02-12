package com.intuit.playertools.fluent.types

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject

// Player-UI type definitions for Kotlin.
// These types represent the core structures of Player-UI content.

/**
 * A binding describes a location in the data model.
 * Format: "{{path.to.data}}"
 */
typealias BindingRef = String

/**
 * An expression reference for runtime evaluation.
 * Format: "@[expression]@"
 */
typealias ExpressionRef = String

/**
 * Expression can be a single string or an array of strings.
 * Represented as Any since it can be either String or List<String>.
 */
typealias Expression = Any

/**
 * The data model is the location where all user data is stored.
 */
typealias DataModel = Map<String, Any?>

/**
 * Base interface for all Player-UI assets.
 * Each asset requires a unique id per view and a type that determines semantics.
 */
interface Asset {
    val id: String
    val type: String
}

/**
 * An asset that contains a data binding.
 */
interface AssetBinding : Asset {
    val binding: BindingRef
}

/**
 * Wraps an asset in the AssetWrapper format.
 */
@Serializable
data class AssetWrapper<T : Asset>(
    val asset: T,
)

/**
 * A single case in a switch statement.
 */
@Serializable
data class SwitchCase(
    val asset: JsonObject,
    /** Expression or true */
    val case: JsonElement,
)

/**
 * A switch replaces an asset with the applicable case on first render.
 */
typealias Switch = List<SwitchCase>

/**
 * Static switch - evaluates only on first render.
 */
@Serializable
data class StaticSwitch(
    val staticSwitch: Switch,
)

/**
 * Dynamic switch - re-evaluates when data changes.
 */
@Serializable
data class DynamicSwitch(
    val dynamicSwitch: Switch,
)

/**
 * A template describes a mapping from a data array to an array of objects.
 */
@Serializable
data class Template(
    val data: BindingRef,
    val output: String,
    val value: JsonElement,
    val dynamic: Boolean = false,
    val placement: TemplatePlacement? = null,
)

/**
 * Template placement relative to existing elements.
 */
@Serializable
enum class TemplatePlacement {
    @SerialName("prepend")
    PREPEND,

    @SerialName("append")
    APPEND,
}

/**
 * Navigation state types.
 */
enum class NavigationStateType(
    val value: String,
) {
    VIEW("VIEW"),
    END("END"),
    ACTION("ACTION"),
    ASYNC_ACTION("ASYNC_ACTION"),
    EXTERNAL("EXTERNAL"),
    FLOW("FLOW"),
}

/**
 * Base for navigation state transitions.
 */
typealias NavigationTransitions = Map<String, String>

/**
 * View state in navigation.
 */
@Serializable
data class NavigationViewState(
    @SerialName("state_type") val stateType: String = "VIEW",
    val ref: String,
    val transitions: NavigationTransitions,
    val onStart: Expression? = null,
    val onEnd: Expression? = null,
    val attributes: Map<String, Any?>? = null,
)

/**
 * End state in navigation.
 */
@Serializable
data class NavigationEndState(
    @SerialName("state_type") val stateType: String = "END",
    val outcome: String,
    val onStart: Expression? = null,
    val onEnd: Expression? = null,
)

/**
 * Action state in navigation.
 */
@Serializable
data class NavigationActionState(
    @SerialName("state_type") val stateType: String = "ACTION",
    val exp: Expression,
    val transitions: NavigationTransitions,
)

/**
 * Flow state in navigation.
 */
@Serializable
data class NavigationFlowState(
    @SerialName("state_type") val stateType: String = "FLOW",
    val ref: String,
    val transitions: NavigationTransitions,
)

/**
 * A navigation flow describes a state machine.
 * Additional states beyond startState, onStart, onEnd are dynamic keys.
 */
@Serializable
data class NavigationFlow(
    val startState: String,
    val onStart: Expression? = null,
    val onEnd: Expression? = null,
)

/**
 * The complete navigation section of a flow.
 * BEGIN specifies the starting flow, and additional keys are flow definitions.
 */
typealias Navigation = Map<String, Any?>

/**
 * Validation severity levels.
 */
@Serializable
enum class ValidationSeverity {
    @SerialName("error")
    ERROR,

    @SerialName("warning")
    WARNING,
}

/**
 * Validation trigger timing.
 */
@Serializable
enum class ValidationTrigger {
    @SerialName("navigation")
    NAVIGATION,

    @SerialName("change")
    CHANGE,

    @SerialName("load")
    LOAD,
}

/**
 * Validation display target.
 */
@Serializable
enum class ValidationDisplayTarget {
    @SerialName("page")
    PAGE,

    @SerialName("section")
    SECTION,

    @SerialName("field")
    FIELD,
}

/**
 * A validation reference.
 * @property blocking Can be Boolean or the string "once"
 */
@Serializable
data class ValidationReference(
    val type: String,
    val message: String? = null,
    val severity: ValidationSeverity? = null,
    val trigger: ValidationTrigger? = null,
    val displayTarget: ValidationDisplayTarget? = null,
    val blocking: Any? = null,
)

/**
 * Schema data type definition.
 */
@Serializable
data class SchemaDataType(
    val type: String,
    val validation: List<ValidationReference>? = null,
    val format: Map<String, Any?>? = null,
    val default: Any? = null,
    val isRecord: Boolean? = null,
    val isArray: Boolean? = null,
)

/**
 * Schema node definition.
 */
typealias SchemaNode = Map<String, SchemaDataType>

/**
 * Complete schema definition.
 */
typealias Schema = Map<String, SchemaNode>

/**
 * The complete Flow structure for Player-UI.
 * This is the top-level JSON structure that Player-UI consumes.
 */
@Serializable
data class Flow(
    val id: String,
    val views: List<JsonObject>? = null,
    val data: DataModel? = null,
    val schema: Schema? = null,
    val navigation: Navigation,
)

/**
 * Result of a completed flow.
 */
@Serializable
data class FlowResult(
    val endState: NavigationEndState,
    val data: DataModel? = null,
)
