@file:Suppress("UNCHECKED_CAST")

package com.intuit.playertools.fluent

import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.IdBranch
import com.intuit.playertools.fluent.id.GlobalIdRegistry
import com.intuit.playertools.fluent.mocks.builders.*
import com.intuit.playertools.fluent.tagged.binding
import com.intuit.playertools.fluent.tagged.expression
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldContain
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf

class FluentBuilderBaseTest :
    DescribeSpec({
        beforeEach {
            GlobalIdRegistry.reset()
        }

        describe("TextBuilder") {
            it("builds a simple text asset with defaults") {
                val result =
                    text {
                        value = "Hello World"
                    }.build()

                result["type"] shouldBe "text"
                result["value"] shouldBe "Hello World"
            }

            it("builds text with explicit ID") {
                val result =
                    text {
                        id = "my-text"
                        value = "Test"
                    }.build()

                result["id"] shouldBe "my-text"
                result["type"] shouldBe "text"
                result["value"] shouldBe "Test"
            }

            it("builds text with binding value") {
                val result =
                    text {
                        value(binding<String>("user.name"))
                    }.build()

                result["value"] shouldBe "{{user.name}}"
            }

            it("generates ID from context") {
                val ctx =
                    BuildContext(
                        parentId = "parent",
                        branch = IdBranch.Slot("label")
                    )

                val result =
                    text {
                        value = "Label Text"
                    }.build(ctx)

                result["id"] shouldBe "parent-label"
            }
        }

        describe("InputBuilder") {
            it("builds an input with binding") {
                val result =
                    input {
                        binding("user.email")
                        placeholder = "Enter email"
                    }.build()

                result["type"] shouldBe "input"
                result["binding"] shouldBe "{{user.email}}"
                result["placeholder"] shouldBe "Enter email"
            }

            it("builds an input with nested label") {
                val ctx = BuildContext(parentId = "form")

                val result =
                    input {
                        binding("user.name")
                        label { value = "Name" }
                    }.build(ctx)

                result["type"] shouldBe "input"
                result["binding"] shouldBe "{{user.name}}"

                val label = result["label"]
                label.shouldBeInstanceOf<Map<String, Any?>>()
                (label as Map<*, *>)["asset"].shouldBeInstanceOf<Map<String, Any?>>()
                val labelAsset = label["asset"] as Map<*, *>
                labelAsset["type"] shouldBe "text"
                labelAsset["value"] shouldBe "Name"
            }
        }

        describe("ActionBuilder") {
            it("builds an action with value") {
                val result =
                    action {
                        value = "submit"
                        label { value = "Submit" }
                    }.build()

                result["type"] shouldBe "action"
                result["value"] shouldBe "submit"
            }

            it("builds an action with metadata") {
                val result =
                    action {
                        value = "next"
                        metaData = mapOf("role" to "primary", "size" to "large")
                    }.build()

                result["metaData"] shouldBe mapOf("role" to "primary", "size" to "large")
            }

            it("builds an action with metadata DSL") {
                val result =
                    action {
                        value = "next"
                        metaData {
                            put("role", "primary")
                            put("icon", "arrow-right")
                        }
                    }.build()

                val meta = result["metaData"] as Map<*, *>
                meta["role"] shouldBe "primary"
                meta["icon"] shouldBe "arrow-right"
            }
        }

        describe("CollectionBuilder") {
            it("builds a collection with label") {
                val ctx = BuildContext(parentId = "page")

                val result =
                    collection {
                        label { value = "User Form" }
                    }.build(ctx)

                result["type"] shouldBe "collection"
                result.keys shouldContain "label"
            }

            it("builds a collection with values array") {
                val ctx = BuildContext(parentId = "page", branch = IdBranch.Slot("content"))

                val result =
                    collection {
                        values(
                            text { value = "Item 1" },
                            text { value = "Item 2" }
                        )
                    }.build(ctx)

                val values = result["values"]
                values.shouldBeInstanceOf<List<*>>()
                (values as List<*>).size shouldBe 2
            }

            it("builds a collection with actions") {
                val result =
                    collection {
                        actions(
                            action {
                                value = "submit"
                                label { value = "Submit" }
                            },
                            action {
                                value = "cancel"
                                label { value = "Cancel" }
                            }
                        )
                    }.build()

                val actions = result["actions"]
                actions.shouldBeInstanceOf<List<*>>()
                (actions as List<*>).size shouldBe 2
            }
        }

        describe("Nested ID generation") {
            it("generates hierarchical IDs for nested assets") {
                val ctx = BuildContext(parentId = "my-flow-views-0")

                val result =
                    collection {
                        id = "form"
                        label { value = "Registration" }
                        values(
                            input { binding("user.firstName") },
                            input { binding("user.lastName") }
                        )
                        actions(
                            action {
                                value = "submit"
                                label { value = "Register" }
                            }
                        )
                    }.build(ctx)

                // The collection uses explicit ID
                result["id"] shouldBe "form"

                // Nested assets should have generated IDs based on parent
                val values = result["values"] as List<Map<String, Any?>>
                values.size shouldBe 2

                val actions = result["actions"] as List<Map<String, Any?>>
                actions.size shouldBe 1
            }
        }

        describe("Conditional building") {
            it("conditionally sets property with setIf") {
                val showPlaceholder = true

                val builder =
                    input {
                        binding("user.email")
                    }
                builder.setIf({ showPlaceholder }, "placeholder", "Enter email")

                val result = builder.build()
                result["placeholder"] shouldBe "Enter email"
            }

            it("skips property when setIf condition is false") {
                val showPlaceholder = false

                val builder =
                    input {
                        binding("user.email")
                    }
                builder.setIf({ showPlaceholder }, "placeholder", "Enter email")

                val result = builder.build()
                result.containsKey("placeholder") shouldBe false
            }

            it("uses setIfElse for conditional values") {
                val isPrimary = true

                val builder =
                    action {
                        value = "submit"
                    }
                builder.setIfElse(
                    { isPrimary },
                    "metaData",
                    mapOf("role" to "primary"),
                    mapOf("role" to "secondary")
                )

                val result = builder.build()
                (result["metaData"] as Map<*, *>)["role"] shouldBe "primary"
            }
        }

        describe("Tagged values resolution") {
            it("resolves bindings to string format") {
                val result =
                    text {
                        value(binding<String>("data.message"))
                    }.build()

                result["value"] shouldBe "{{data.message}}"
            }

            it("resolves expressions to string format") {
                val result =
                    action {
                        value(expression<String>("navigate('home')"))
                    }.build()

                result["value"] shouldBe "@[navigate('home')]@"
            }

            it("handles bindings with index placeholders") {
                val result =
                    text {
                        value(binding<String>("items._index_.name"))
                    }.build()

                result["value"] shouldBe "{{items._index_.name}}"
            }
        }

        describe("Builder cloning") {
            it("creates an independent copy") {
                val original =
                    text {
                        id = "original"
                        value = "Original text"
                    }

                val clone = original.clone()
                clone.id = "clone"
                clone.value = "Clone text"

                val originalResult = original.build()
                val cloneResult = clone.build()

                originalResult["id"] shouldBe "original"
                originalResult["value"] shouldBe "Original text"

                cloneResult["id"] shouldBe "clone"
                cloneResult["value"] shouldBe "Clone text"
            }
        }

        describe("Property management") {
            it("has() returns true for set properties") {
                val builder =
                    text {
                        value = "Test"
                    }

                builder.has("value") shouldBe true
                builder.has("id") shouldBe false
            }

            it("peek() returns raw value without resolution") {
                val b = binding<String>("user.name")
                val builder =
                    text {
                        value(b)
                    }

                builder.peek("value") shouldBe b
            }

            it("unset() removes a property") {
                val builder =
                    text {
                        id = "test"
                        value = "Test"
                    }

                builder.unset("id")

                builder.has("id") shouldBe false
                builder.has("value") shouldBe true
            }

            it("clear() removes all properties") {
                val builder =
                    text {
                        id = "test"
                        value = "Test"
                    }

                builder.clear()

                builder.has("id") shouldBe false
                builder.has("value") shouldBe false
            }
        }
    })
