@file:Suppress("UNCHECKED_CAST")

package com.intuit.playertools.fluent

import com.intuit.playertools.fluent.flow.flow
import com.intuit.playertools.fluent.flow.flowBuilder
import com.intuit.playertools.fluent.id.GlobalIdRegistry
import com.intuit.playertools.fluent.mocks.builders.*
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf

class FlowTest :
    DescribeSpec({
        beforeEach {
            GlobalIdRegistry.reset()
        }

        describe("flow()") {
            it("creates a basic flow with id and navigation") {
                val result =
                    flow {
                        id = "test-flow"
                        navigation =
                            mapOf(
                                "BEGIN" to "FLOW_1",
                                "FLOW_1" to
                                    mapOf(
                                        "startState" to "VIEW_1"
                                    )
                            )
                    }

                result["id"] shouldBe "test-flow"
                result["navigation"] shouldNotBe null
                result["views"] shouldBe emptyList<Any>()
            }

            it("creates a flow with views") {
                val result =
                    flow {
                        id = "my-flow"
                        views =
                            listOf(
                                text { value = "Hello" },
                                text { value = "World" }
                            )
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                result["id"] shouldBe "my-flow"
                val views = result["views"]
                views.shouldBeInstanceOf<List<*>>()
                (views as List<*>).size shouldBe 2
            }

            it("generates hierarchical IDs for views") {
                val result =
                    flow {
                        id = "registration"
                        views =
                            listOf(
                                collection {
                                    label { value = "Step 1" }
                                    values(
                                        input { binding("user.firstName") },
                                        input { binding("user.lastName") }
                                    )
                                }
                            )
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                val views = result["views"] as List<Map<String, Any?>>
                views.size shouldBe 1

                val firstView = views[0]
                firstView["id"] shouldBe "registration-views-0"
                firstView["type"] shouldBe "collection"

                val values = firstView["values"] as List<Map<String, Any?>>
                values.size shouldBe 2
                values[0]["id"] shouldBe "registration-views-0-0"
                values[1]["id"] shouldBe "registration-views-0-1"
            }

            it("includes data when provided") {
                val result =
                    flow {
                        id = "data-flow"
                        data =
                            mapOf(
                                "user" to
                                    mapOf(
                                        "name" to "John",
                                        "email" to "john@example.com"
                                    )
                            )
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                result["data"] shouldBe
                    mapOf(
                        "user" to
                            mapOf(
                                "name" to "John",
                                "email" to "john@example.com"
                            )
                    )
            }

            it("includes schema when provided") {
                val result =
                    flow {
                        id = "schema-flow"
                        schema =
                            mapOf(
                                "ROOT" to
                                    mapOf(
                                        "user" to
                                            mapOf(
                                                "type" to "UserType"
                                            )
                                    )
                            )
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                result["schema"] shouldNotBe null
                (result["schema"] as Map<*, *>)["ROOT"] shouldNotBe null
            }

            it("excludes data and schema when not provided") {
                val result =
                    flow {
                        id = "minimal-flow"
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                result.containsKey("data") shouldBe false
                result.containsKey("schema") shouldBe false
            }

            it("supports additional properties") {
                val result =
                    flow {
                        id = "extended-flow"
                        navigation = mapOf("BEGIN" to "FLOW_1")
                        set("customField", "customValue")
                        set("version", 1)
                    }

                result["customField"] shouldBe "customValue"
                result["version"] shouldBe 1
            }

            it("processes complex nested views") {
                val result =
                    flow {
                        id = "complex-flow"
                        views =
                            listOf(
                                collection {
                                    label { value = "Form" }
                                    values(
                                        input {
                                            binding("user.email")
                                            label { value = "Email" }
                                        }
                                    )
                                    actions(
                                        action {
                                            value = "submit"
                                            label { value = "Submit" }
                                        }
                                    )
                                }
                            )
                        navigation =
                            mapOf(
                                "BEGIN" to "FLOW_1",
                                "FLOW_1" to
                                    mapOf(
                                        "startState" to "VIEW_form",
                                        "VIEW_form" to
                                            mapOf(
                                                "state_type" to "VIEW",
                                                "ref" to "complex-flow-views-0",
                                                "transitions" to
                                                    mapOf(
                                                        "submit" to "END_Done"
                                                    )
                                            ),
                                        "END_Done" to
                                            mapOf(
                                                "state_type" to "END",
                                                "outcome" to "done"
                                            )
                                    )
                            )
                    }

                val views = result["views"] as List<Map<String, Any?>>
                val formView = views[0]

                // Verify the collection structure
                formView["type"] shouldBe "collection"
                formView["id"] shouldBe "complex-flow-views-0"

                // Verify nested label is wrapped
                val label = formView["label"] as Map<String, Any?>
                val labelAsset = label["asset"] as Map<String, Any?>
                labelAsset["type"] shouldBe "text"
                labelAsset["value"] shouldBe "Form"

                // Verify actions
                val actions = formView["actions"] as List<Map<String, Any?>>
                actions.size shouldBe 1
                actions[0]["value"] shouldBe "submit"
            }
        }

        describe("flowBuilder()") {
            it("creates a builder that can be built later") {
                val builder =
                    flowBuilder {
                        id = "deferred-flow"
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                // Can modify before building
                builder.views = listOf(text { value = "Added later" })

                val result = builder.build()
                result["id"] shouldBe "deferred-flow"
                (result["views"] as List<*>).size shouldBe 1
            }

            it("allows building with resetIdRegistry=false") {
                // First, generate some IDs
                GlobalIdRegistry.reset()

                val builder1 =
                    flowBuilder {
                        id = "flow1"
                        views = listOf(text { value = "View 1" })
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }
                builder1.build(resetIdRegistry = true)

                // Build a second flow without resetting
                val builder2 =
                    flowBuilder {
                        id = "flow2"
                        views = listOf(text { value = "View 2" })
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }
                val result2 = builder2.build(resetIdRegistry = false)

                // IDs should be unique across flows since registry wasn't reset
                result2["id"] shouldBe "flow2"
            }
        }

        describe("uses default id") {
            it("uses 'root' as default flow id") {
                val result =
                    flow {
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                result["id"] shouldBe "root"
            }
        }
    })
