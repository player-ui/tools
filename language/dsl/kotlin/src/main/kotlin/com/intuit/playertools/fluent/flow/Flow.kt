package com.intuit.playertools.fluent.flow

import com.intuit.playertools.fluent.FluentDslMarker
import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.FluentBuilder
import com.intuit.playertools.fluent.core.IdBranch
import com.intuit.playertools.fluent.id.GlobalIdRegistry

/**
 * Options for creating a Player-UI Flow.
 * This is a builder-style class for constructing flows with views, data, and navigation.
 */
@FluentDslMarker
class FlowBuilder {
    var id: String = "root"
    var views: List<Any> = emptyList()
    var data: Map<String, Any?>? = null
    var schema: Map<String, Any?>? = null
    var navigation: Map<String, Any?> = emptyMap()

    /**
     * Additional properties to include in the flow output.
     */
    private val additionalProperties = mutableMapOf<String, Any?>()

    /**
     * Sets an additional property on the flow.
     */
    fun set(
        key: String,
        value: Any?,
    ) {
        additionalProperties[key] = value
    }

    /**
     * Builds the flow, processing all views with proper context.
     * @param resetIdRegistry Whether to reset the global ID registry before building.
     *                        Defaults to true for top-level flow building.
     */
    fun build(resetIdRegistry: Boolean = true): Map<String, Any?> {
        if (resetIdRegistry) {
            GlobalIdRegistry.reset()
        }

        val flowId = id
        val viewsNamespace = "$flowId-views"

        val processedViews =
            views.mapIndexed { index, viewOrBuilder ->
                val ctx =
                    BuildContext(
                        parentId = viewsNamespace,
                        branch = IdBranch.ArrayItem(index),
                    )

                when (viewOrBuilder) {
                    is FluentBuilder<*> -> viewOrBuilder.build(ctx)
                    is Map<*, *> -> viewOrBuilder
                    else -> viewOrBuilder
                }
            }

        val result =
            mutableMapOf<String, Any?>(
                "id" to flowId,
                "views" to processedViews,
                "navigation" to navigation,
            )

        data?.let { result["data"] = it }
        schema?.let { result["schema"] = it }
        result.putAll(additionalProperties)

        return result
    }
}

/**
 * DSL function to create a Player-UI Flow.
 *
 * A flow combines views, data, and navigation into a complete Player-UI content structure.
 *
 * Example:
 * ```kotlin
 * val myFlow = flow {
 *     id = "welcome-flow"
 *     views = listOf(
 *         collection {
 *             label { value = "Welcome" }
 *             values(
 *                 text { value = "Hello World" },
 *                 input { binding("user.name") }
 *             )
 *             actions(
 *                 action { value = "next"; label { value = "Continue" } }
 *             )
 *         }
 *     )
 *     data = mapOf(
 *         "user" to mapOf("name" to "")
 *     )
 *     navigation = mapOf(
 *         "BEGIN" to "FLOW_1",
 *         "FLOW_1" to mapOf(
 *             "startState" to "VIEW_welcome",
 *             "VIEW_welcome" to mapOf(
 *                 "state_type" to "VIEW",
 *                 "ref" to "welcome-flow-views-0",
 *                 "transitions" to mapOf("next" to "END_Done")
 *             ),
 *             "END_Done" to mapOf(
 *                 "state_type" to "END",
 *                 "outcome" to "done"
 *             )
 *         )
 *     )
 * }
 * ```
 *
 * @param init Configuration block for the flow
 * @return The built flow as a Map (JSON-serializable)
 */
fun flow(init: FlowBuilder.() -> Unit): Map<String, Any?> = FlowBuilder().apply(init).build()

/**
 * Creates a flow builder without immediately building.
 * Useful when you need to further configure the flow before building.
 */
fun flowBuilder(init: FlowBuilder.() -> Unit = {}): FlowBuilder = FlowBuilder().apply(init)
