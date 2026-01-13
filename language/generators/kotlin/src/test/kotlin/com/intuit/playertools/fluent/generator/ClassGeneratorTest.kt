package com.intuit.playertools.fluent.generator

import com.intuit.playertools.xlr.ObjectProperty
import com.intuit.playertools.xlr.RefType
import com.intuit.playertools.xlr.StringType
import com.intuit.playertools.xlr.XlrDocument
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.string.shouldContain

class ClassGeneratorTest :
    DescribeSpec({

        describe("ClassGenerator") {

            describe("generate") {
                it("generates a basic builder class") {
                    val document =
                        XlrDocument(
                            name = "TextAsset",
                            source = "test",
                            properties =
                                mapOf(
                                    "value" to
                                        ObjectProperty(
                                            required = false,
                                            node = StringType(),
                                        ),
                                ),
                            extends =
                                RefType(
                                    ref = "Asset<text>",
                                    genericArguments =
                                        listOf(
                                            StringType(const = "text"),
                                        ),
                                ),
                        )

                    val result = ClassGenerator.generate(document, "com.test")

                    result.className shouldBe "TextBuilder"
                    result.code shouldContain "package com.test"
                    result.code shouldContain "@FluentDslMarker"
                    result.code shouldContain "class TextBuilder"
                    result.code shouldContain "FluentBuilderBase<Map<String, Any?>>"
                    result.code shouldContain "override val defaults"
                    result.code shouldContain "\"type\" to \"text\""
                    result.code shouldContain "var value: String?"
                    result.code shouldContain "fun text(init: TextBuilder.() -> Unit = {})"
                }

                it("generates binding and expression overloads for string properties") {
                    val document =
                        XlrDocument(
                            name = "LabelAsset",
                            source = "test",
                            properties =
                                mapOf(
                                    "text" to
                                        ObjectProperty(
                                            required = false,
                                            node = StringType(),
                                        ),
                                ),
                        )

                    val result = ClassGenerator.generate(document, "com.test")

                    result.code shouldContain "var text: String?"
                    result.code shouldContain "fun text(binding: Binding<String>)"
                    result.code shouldContain "fun text(taggedValue: TaggedValue<String>)"
                }

                it("generates asset wrapper property for AssetWrapper refs") {
                    val document =
                        XlrDocument(
                            name = "ActionAsset",
                            source = "test",
                            properties =
                                mapOf(
                                    "label" to
                                        ObjectProperty(
                                            required = false,
                                            node = RefType(ref = "AssetWrapper<TextAsset>"),
                                        ),
                                ),
                        )

                    val result = ClassGenerator.generate(document, "com.test")

                    result.code shouldContain "var label: FluentBuilderBase<*>?"
                    result.code shouldContain "AssetWrapperBuilder"
                    result.code shouldContain "override val assetWrapperProperties"
                    result.code shouldContain "\"label\""
                }

                it("includes required imports") {
                    val document =
                        XlrDocument(
                            name = "TestAsset",
                            source = "test",
                            properties = emptyMap(),
                        )

                    val result = ClassGenerator.generate(document, "com.example")

                    result.code shouldContain "import com.intuit.playertools.fluent.FluentDslMarker"
                    result.code shouldContain "import com.intuit.playertools.fluent.core.BuildContext"
                    result.code shouldContain "import com.intuit.playertools.fluent.core.FluentBuilderBase"
                    result.code shouldContain "import com.intuit.playertools.fluent.tagged.Binding"
                    result.code shouldContain "import com.intuit.playertools.fluent.tagged.TaggedValue"
                }

                it("generates build and clone methods") {
                    val document =
                        XlrDocument(
                            name = "SimpleAsset",
                            source = "test",
                            properties = emptyMap(),
                        )

                    val result = ClassGenerator.generate(document, "com.test")

                    result.code shouldContain "override fun build(context: BuildContext?)"
                    result.code shouldContain "buildWithDefaults(context)"
                    result.code shouldContain "override fun clone()"
                    result.code shouldContain "SimpleBuilder().also { cloneStorageTo(it) }"
                }

                it("generates description as KDoc") {
                    val document =
                        XlrDocument(
                            name = "DocAsset",
                            source = "test",
                            properties = emptyMap(),
                            description = "This is a documented asset",
                        )

                    val result = ClassGenerator.generate(document, "com.test")

                    result.code shouldContain "/** This is a documented asset */"
                }
            }
        }

        describe("CodeWriter") {

            it("writes lines with proper indentation") {
                val code =
                    codeWriter {
                        line("class Test {")
                        indent()
                        line("val x = 1")
                        dedent()
                        line("}")
                    }

                code shouldContain "class Test {"
                code shouldContain "    val x = 1"
                code shouldContain "}"
            }

            it("creates blocks with auto-indentation") {
                val code =
                    codeWriter {
                        block("fun test() {") {
                            line("println(\"hello\")")
                        }
                    }

                code shouldContain "fun test() {"
                code shouldContain "    println(\"hello\")"
                code shouldContain "}"
            }

            it("creates class blocks") {
                val code =
                    codeWriter {
                        classBlock(
                            name = "MyClass",
                            annotations = listOf("@Annotation"),
                            superClass = "BaseClass()",
                        ) {
                            line("val x = 1")
                        }
                    }

                code shouldContain "@Annotation"
                code shouldContain "class MyClass : BaseClass() {"
                code shouldContain "    val x = 1"
                code shouldContain "}"
            }

            it("creates val properties") {
                val code =
                    codeWriter {
                        valProperty("myProp", "String", "\"hello\"")
                        overrideVal("defaults", "Map<String, Any?>", "emptyMap()")
                    }

                code shouldContain "val myProp: String = \"hello\""
                code shouldContain "override val defaults: Map<String, Any?> = emptyMap()"
            }

            it("creates simple properties with getters and setters") {
                val code =
                    codeWriter {
                        simpleProperty(
                            name = "value",
                            type = "String?",
                            getterExpr = "storage[\"value\"] as? String",
                            setterExpr = "storage[\"value\"] = value",
                        )
                    }

                code shouldContain "var value: String?"
                code shouldContain "get() = storage[\"value\"] as? String"
                code shouldContain "set(value) { storage[\"value\"] = value }"
            }

            it("creates KDoc comments") {
                val code =
                    codeWriter {
                        kdoc("A simple comment")
                        line("val x = 1")
                    }

                code shouldContain "/** A simple comment */"
            }
        }
    })
