@file:Suppress("UNCHECKED_CAST")

package com.intuit.playertools.fluent

import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.IdBranch
import com.intuit.playertools.fluent.flow.flow
import com.intuit.playertools.fluent.id.GlobalIdRegistry
import com.intuit.playertools.fluent.mocks.builders.*
import com.intuit.playertools.fluent.tagged.binding
import com.intuit.playertools.fluent.tagged.expression
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.shouldNotBe
import io.kotest.matchers.types.shouldBeInstanceOf
import kotlinx.serialization.json.*

class IntegrationTest :
    DescribeSpec({

        /**
         * Converts a Map<String, Any?> to JsonElement for JSON serialization.
         * Handles nested maps, lists, and primitive values.
         */
        fun Any?.toJsonElement(): JsonElement =
            when (this) {
                null -> JsonNull
                is String -> JsonPrimitive(this)
                is Number -> JsonPrimitive(this)
                is Boolean -> JsonPrimitive(this)
                is Map<*, *> ->
                    JsonObject(
                        this.entries.associate { (k, v) -> k.toString() to v.toJsonElement() }
                    )
                is List<*> -> JsonArray(this.map { it.toJsonElement() })
                else -> JsonPrimitive(this.toString())
            }

        fun Map<String, Any?>.toJson(): String {
            val jsonElement = this.toJsonElement()
            return Json { prettyPrint = true }.encodeToString(jsonElement)
        }

        beforeEach {
            GlobalIdRegistry.reset()
        }

        describe("Complete flow output") {
            it("produces valid Player-UI JSON structure") {
                val result =
                    flow {
                        id = "registration-flow"
                        views =
                            listOf(
                                collection {
                                    id = "form"
                                    label { value = "User Registration" }
                                    values(
                                        input {
                                            binding("user.firstName")
                                            label { value = "First Name" }
                                            placeholder = "Enter your first name"
                                        },
                                        input {
                                            binding("user.lastName")
                                            label { value = "Last Name" }
                                            placeholder = "Enter your last name"
                                        },
                                        input {
                                            binding("user.email")
                                            label { value = "Email" }
                                            placeholder = "Enter your email"
                                        }
                                    )
                                    actions(
                                        action {
                                            value = "submit"
                                            label { value = "Register" }
                                            metaData = mapOf("role" to "primary")
                                        },
                                        action {
                                            value = "cancel"
                                            label { value = "Cancel" }
                                        }
                                    )
                                }
                            )
                        data =
                            mapOf(
                                "user" to
                                    mapOf(
                                        "firstName" to "",
                                        "lastName" to "",
                                        "email" to ""
                                    )
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
                                                "ref" to "form",
                                                "transitions" to
                                                    mapOf(
                                                        "submit" to "END_Done",
                                                        "cancel" to "END_Cancelled"
                                                    )
                                            ),
                                        "END_Done" to
                                            mapOf(
                                                "state_type" to "END",
                                                "outcome" to "done"
                                            ),
                                        "END_Cancelled" to
                                            mapOf(
                                                "state_type" to "END",
                                                "outcome" to "cancelled"
                                            )
                                    )
                            )
                    }

                // Verify top-level structure
                result["id"] shouldBe "registration-flow"
                result["navigation"] shouldNotBe null
                result["data"] shouldNotBe null

                // Verify views
                val views = result["views"] as List<Map<String, Any?>>
                views.size shouldBe 1

                val form = views[0]
                form["id"] shouldBe "form"
                form["type"] shouldBe "collection"

                // Verify label is wrapped in AssetWrapper
                val formLabel = form["label"] as Map<String, Any?>
                formLabel["asset"] shouldNotBe null
                val formLabelAsset = formLabel["asset"] as Map<String, Any?>
                formLabelAsset["type"] shouldBe "text"
                formLabelAsset["value"] shouldBe "User Registration"

                // Verify inputs with bindings
                val values = form["values"] as List<Map<String, Any?>>
                values.size shouldBe 3

                values[0]["type"] shouldBe "input"
                values[0]["binding"] shouldBe "{{user.firstName}}"
                values[0]["placeholder"] shouldBe "Enter your first name"

                val firstNameLabel = values[0]["label"] as Map<String, Any?>
                val firstNameLabelAsset = firstNameLabel["asset"] as Map<String, Any?>
                firstNameLabelAsset["value"] shouldBe "First Name"

                // Verify actions
                val actions = form["actions"] as List<Map<String, Any?>>
                actions.size shouldBe 2

                actions[0]["type"] shouldBe "action"
                actions[0]["value"] shouldBe "submit"
                actions[0]["metaData"] shouldBe mapOf("role" to "primary")

                // Verify JSON is serializable
                val jsonString = result.toJson()
                jsonString.shouldBeInstanceOf<String>()
            }
        }

        describe("Template output") {
            it("produces correct template structure") {
                GlobalIdRegistry.reset()

                val result =
                    collection {
                        id = "user-list"
                        label { value = "Users" }
                        template(
                            data = binding<List<Any>>("users"),
                            output = "values",
                            dynamic = true
                        ) {
                            text { value(binding<String>("users._index_.name")) }
                        }
                    }.build(BuildContext(parentId = "my-flow-views-0"))

                result["id"] shouldBe "user-list"
                result["type"] shouldBe "collection"

                // Verify template is added to values array
                val values = result["values"] as List<Any?>
                values.size shouldBe 1

                val templateWrapper = values[0] as Map<String, Any?>
                templateWrapper.containsKey("dynamicTemplate") shouldBe true

                val templateData = templateWrapper["dynamicTemplate"] as Map<String, Any?>
                templateData["data"] shouldBe "{{users}}"
                templateData["output"] shouldBe "values"

                val templateValue = templateData["value"] as Map<String, Any?>
                templateValue["asset"] shouldNotBe null
            }
        }

        describe("Switch output") {
            it("produces correct static switch structure") {
                GlobalIdRegistry.reset()

                val result =
                    collection {
                        id = "i18n-content"
                        switch(
                            path = listOf("label"),
                            isDynamic = false
                        ) {
                            case(expression<Boolean>("user.locale === 'es'"), text { value = "Hola" })
                            case(expression<Boolean>("user.locale === 'fr'"), text { value = "Bonjour" })
                            default(text { value = "Hello" })
                        }
                    }.build(BuildContext(parentId = "flow-views-0"))

                result["id"] shouldBe "i18n-content"
                result["type"] shouldBe "collection"

                // Verify switch is in the label property
                val label = result["label"] as Map<String, Any?>
                label.containsKey("staticSwitch") shouldBe true

                val staticSwitch = label["staticSwitch"] as List<Map<String, Any?>>
                staticSwitch.size shouldBe 3

                // First case - Spanish
                staticSwitch[0]["case"] shouldBe "@[user.locale === 'es']@"
                val esAsset = staticSwitch[0]["asset"] as Map<String, Any?>
                esAsset["type"] shouldBe "text"
                esAsset["value"] shouldBe "Hola"

                // Third case - Default (English)
                staticSwitch[2]["case"] shouldBe true
                val enAsset = staticSwitch[2]["asset"] as Map<String, Any?>
                enAsset["value"] shouldBe "Hello"
            }

            it("produces correct dynamic switch structure") {
                GlobalIdRegistry.reset()

                val result =
                    collection {
                        id = "conditional-content"
                        switch(
                            path = listOf("label"),
                            isDynamic = true
                        ) {
                            case(expression<Boolean>("showWelcome"), text { value = "Welcome!" })
                            default(text { value = "Goodbye!" })
                        }
                    }.build(BuildContext(parentId = "flow-views-0"))

                val label = result["label"] as Map<String, Any?>
                label.containsKey("dynamicSwitch") shouldBe true

                val dynamicSwitch = label["dynamicSwitch"] as List<Map<String, Any?>>
                dynamicSwitch.size shouldBe 2
            }
        }

        describe("ID generation in complex structures") {
            it("generates correct hierarchical IDs") {
                GlobalIdRegistry.reset()

                // When building in a flow context, the view gets an ArrayItem branch
                val ctx =
                    BuildContext(
                        parentId = "my-flow-views",
                        branch = IdBranch.ArrayItem(0)
                    )

                val result =
                    collection {
                        label { value = "Outer" }
                        values(
                            collection {
                                label { value = "Inner 1" }
                                values(
                                    text { value = "Deep Text 1" },
                                    text { value = "Deep Text 2" }
                                )
                            },
                            collection {
                                label { value = "Inner 2" }
                                values(
                                    text { value = "Deep Text 3" }
                                )
                            }
                        )
                    }.build(ctx)

                // Outer collection gets ID from array index branch
                result["id"] shouldBe "my-flow-views-0"

                val outerValues = result["values"] as List<Map<String, Any?>>

                // Inner collections get sequential IDs based on their array index
                outerValues[0]["id"] shouldBe "my-flow-views-0-0"
                outerValues[1]["id"] shouldBe "my-flow-views-0-1"

                // Deep nested texts
                val inner1Values = outerValues[0]["values"] as List<Map<String, Any?>>
                inner1Values[0]["id"] shouldBe "my-flow-views-0-0-0"
                inner1Values[1]["id"] shouldBe "my-flow-views-0-0-1"

                val inner2Values = outerValues[1]["values"] as List<Map<String, Any?>>
                inner2Values[0]["id"] shouldBe "my-flow-views-0-1-0"
            }
        }

        describe("Binding and Expression formatting") {
            it("formats bindings correctly") {
                val result =
                    text {
                        value(binding<String>("user.profile.name"))
                    }.build()

                result["value"] shouldBe "{{user.profile.name}}"
            }

            it("formats expressions correctly") {
                val result =
                    action {
                        value(expression<String>("navigate('home')"))
                    }.build()

                result["value"] shouldBe "@[navigate('home')]@"
            }

            it("preserves _index_ placeholder in bindings") {
                val result =
                    text {
                        value(binding<String>("items._index_.details.name"))
                    }.build()

                result["value"] shouldBe "{{items._index_.details.name}}"
            }
        }

        describe("Conditional building") {
            it("handles setIf correctly") {
                val showPlaceholder = true
                val showValidation = false

                val builder =
                    input {
                        binding("user.email")
                    }
                builder.setIf({ showPlaceholder }, "placeholder", "Enter email")
                builder.setIf({ showValidation }, "validation", mapOf("required" to true))

                val result = builder.build()

                result["placeholder"] shouldBe "Enter email"
                result.containsKey("validation") shouldBe false
            }

            it("handles setIfElse correctly") {
                val isPrimary = true

                val builder =
                    action {
                        value = "submit"
                    }
                builder.setIfElse(
                    { isPrimary },
                    "metaData",
                    mapOf("role" to "primary", "size" to "large"),
                    mapOf("role" to "secondary", "size" to "small")
                )

                val result = builder.build()
                val metaData = result["metaData"] as Map<*, *>

                metaData["role"] shouldBe "primary"
                metaData["size"] shouldBe "large"
            }
        }

        describe("JSON serialization") {
            it("produces valid JSON that can be parsed back") {
                val result =
                    flow {
                        id = "serialization-test"
                        views =
                            listOf(
                                collection {
                                    label { value = "Test" }
                                    values(
                                        text { value = "Item 1" },
                                        input { binding("field1") }
                                    )
                                }
                            )
                        data = mapOf("field1" to "initial value")
                        navigation = mapOf("BEGIN" to "FLOW_1")
                    }

                // Serialize to JSON
                val jsonString = result.toJson()

                // Parse back
                val parsed = Json.decodeFromString<JsonElement>(jsonString)
                parsed shouldNotBe null
            }

            it("handles special characters in values") {
                val result =
                    text {
                        value = "Hello \"World\" with special <chars> & symbols"
                    }.build()

                val jsonString = result.toJson()
                jsonString.shouldBeInstanceOf<String>()

                // Should contain escaped quotes
                jsonString.contains("\\\"World\\\"") shouldBe true
            }
        }
    })
