package com.intuit.playertools.fluent.generator

import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain
import java.io.File

class GeneratorIntegrationTest :
    DescribeSpec({

        fun loadFixture(name: String): String {
            val classLoader = GeneratorIntegrationTest::class.java.classLoader
            val resource =
                classLoader.getResource(
                    "com/intuit/playertools/fluent/generator/fixtures/$name",
                )
            return if (resource != null) {
                resource.readText()
            } else {
                val file =
                    File(
                        "language/generators/kotlin/src/test/kotlin/com/intuit/playertools/fluent/generator/fixtures/$name",
                    )
                file.readText()
            }
        }

        describe("Generator integration") {

            it("generates ActionBuilder from ActionAsset.json") {
                val json = loadFixture("ActionAsset.json")
                val code = Generator.generateCode(json, "com.test.builders")

                code shouldContain "package com.test.builders"
                code shouldContain "class ActionBuilder"
                code shouldContain "FluentBuilderBase<Map<String, Any?>>"
                code shouldContain "\"type\" to \"action\""
                // exp is an Expression type, maps to TaggedValue<*>
                code shouldContain "var exp: TaggedValue<*>?"
                code shouldContain "var label: FluentBuilderBase<*>?"
                code shouldContain "AssetWrapperBuilder"
                code shouldContain "fun action(init: ActionBuilder.() -> Unit = {})"
            }

            it("generates TextBuilder from TextAsset.json") {
                val json = loadFixture("TextAsset.json")
                val code = Generator.generateCode(json, "com.test.builders")

                code shouldContain "class TextBuilder"
                code shouldContain "\"type\" to \"text\""
                code shouldContain "var value: String?"
                code shouldContain "fun value(binding: Binding<String>)"
                code shouldContain "fun value(taggedValue: TaggedValue<String>)"
                code shouldContain "fun text(init: TextBuilder.() -> Unit = {})"
            }

            it("generates CollectionBuilder from CollectionAsset.json") {
                val json = loadFixture("CollectionAsset.json")
                val code = Generator.generateCode(json, "com.test.builders")

                code shouldContain "class CollectionBuilder"
                code shouldContain "\"type\" to \"collection\""
                // Collection has array of assets
                code shouldContain "var values: List<FluentBuilderBase<*>>?"
                code shouldContain "fun values(vararg builders: FluentBuilderBase<*>)"
                code shouldContain "fun collection(init: CollectionBuilder.() -> Unit = {})"
            }

            it("generates InputBuilder from InputAsset.json") {
                val json = loadFixture("InputAsset.json")
                val code = Generator.generateCode(json, "com.test.builders")

                code shouldContain "class InputBuilder"
                code shouldContain "\"type\" to \"input\""
                // Input has binding property
                code shouldContain "var binding: Binding<*>?"
                code shouldContain "fun input(init: InputBuilder.() -> Unit = {})"
            }

            it("includes all required imports") {
                val json = loadFixture("ActionAsset.json")
                val code = Generator.generateCode(json, "com.example")

                code shouldContain "import com.intuit.playertools.fluent.FluentDslMarker"
                code shouldContain "import com.intuit.playertools.fluent.core.AssetWrapperBuilder"
                code shouldContain "import com.intuit.playertools.fluent.core.BuildContext"
                code shouldContain "import com.intuit.playertools.fluent.core.FluentBuilderBase"
                code shouldContain "import com.intuit.playertools.fluent.tagged.Binding"
                code shouldContain "import com.intuit.playertools.fluent.tagged.TaggedValue"
            }

            it("generates valid Kotlin syntax") {
                val json = loadFixture("TextAsset.json")
                val code = Generator.generateCode(json, "com.test")

                // Check for balanced braces
                val openBraces = code.count { it == '{' }
                val closeBraces = code.count { it == '}' }
                openBraces shouldBe closeBraces

                // Check for balanced parentheses
                val openParens = code.count { it == '(' }
                val closeParens = code.count { it == ')' }
                openParens shouldBe closeParens
            }
        }

        describe("Generator class") {

            it("can generate code from XLR document") {
                val json = loadFixture("TextAsset.json")
                val document =
                    com.intuit.playertools.xlr.XlrDeserializer
                        .deserialize(json)
                val code = Generator.generateCode(document, "com.test")

                code shouldContain "class TextBuilder"
            }
        }
    })
