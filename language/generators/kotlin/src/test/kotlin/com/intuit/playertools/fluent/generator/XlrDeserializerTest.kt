package com.intuit.playertools.fluent.generator

import com.intuit.playertools.fluent.generator.xlr.ArrayType
import com.intuit.playertools.fluent.generator.xlr.BooleanType
import com.intuit.playertools.fluent.generator.xlr.ObjectType
import com.intuit.playertools.fluent.generator.xlr.OrType
import com.intuit.playertools.fluent.generator.xlr.RecordType
import com.intuit.playertools.fluent.generator.xlr.RefType
import com.intuit.playertools.fluent.generator.xlr.StringType
import com.intuit.playertools.fluent.generator.xlr.XlrDeserializer
import com.intuit.playertools.fluent.generator.xlr.extractAssetTypeConstant
import com.intuit.playertools.fluent.generator.xlr.isAssetWrapperRef
import com.intuit.playertools.fluent.generator.xlr.isBindingRef
import com.intuit.playertools.fluent.generator.xlr.isExpressionRef
import io.kotest.core.spec.style.DescribeSpec
import io.kotest.matchers.collections.shouldHaveSize
import io.kotest.matchers.nulls.shouldBeNull
import io.kotest.matchers.nulls.shouldNotBeNull
import io.kotest.matchers.shouldBe
import io.kotest.matchers.types.shouldBeInstanceOf
import java.io.File

class XlrDeserializerTest :
    DescribeSpec({
        describe("XlrDeserializer") {
            describe("ActionAsset parsing") {
                val json = loadFixture("ActionAsset.json")
                val doc = XlrDeserializer.deserialize(json)

                it("should parse document name and source") {
                    doc.name shouldBe "ActionAsset"
                    doc.source.shouldNotBeNull()
                }

                it("should parse extends clause") {
                    doc.extends.shouldNotBeNull()
                    doc.extends!!.ref shouldBe "Asset<\"action\">"

                    val assetType = extractAssetTypeConstant(doc.extends)
                    assetType shouldBe "action"
                }

                it("should parse generic tokens") {
                    doc.genericTokens.shouldNotBeNull()
                    doc.genericTokens!! shouldHaveSize 1
                    doc.genericTokens!![0].symbol shouldBe "AnyTextAsset"
                }

                it("should parse properties") {
                    doc.properties.keys shouldBe setOf("value", "label", "exp", "accessibility", "metaData")
                }

                it("should parse string property") {
                    val valueProp = doc.properties["value"]
                    valueProp.shouldNotBeNull()
                    valueProp.required shouldBe false
                    valueProp.node.shouldBeInstanceOf<StringType>()

                    val stringNode = valueProp.node as StringType
                    stringNode.description shouldBe "The transition value of the action in the state machine"
                }

                it("should parse AssetWrapper ref property") {
                    val labelProp = doc.properties["label"]
                    labelProp.shouldNotBeNull()
                    labelProp.node.shouldBeInstanceOf<RefType>()

                    val refNode = labelProp.node as RefType
                    refNode.ref shouldBe "AssetWrapper<AnyTextAsset>"
                    isAssetWrapperRef(refNode) shouldBe true
                }

                it("should parse Expression ref property") {
                    val expProp = doc.properties["exp"]
                    expProp.shouldNotBeNull()
                    expProp.node.shouldBeInstanceOf<RefType>()

                    val refNode = expProp.node as RefType
                    refNode.ref shouldBe "Expression"
                    isExpressionRef(refNode) shouldBe true
                }

                it("should parse nested object property") {
                    val metaDataProp = doc.properties["metaData"]
                    metaDataProp.shouldNotBeNull()
                    metaDataProp.node.shouldBeInstanceOf<ObjectType>()

                    val objectNode = metaDataProp.node as ObjectType
                    objectNode.properties.keys shouldBe setOf("beacon", "skipValidation", "role")
                }

                it("should parse nested union type") {
                    val metaDataProp = doc.properties["metaData"]
                    val objectNode = metaDataProp!!.node as ObjectType
                    val beaconProp = objectNode.properties["beacon"]

                    beaconProp.shouldNotBeNull()
                    beaconProp.node.shouldBeInstanceOf<OrType>()

                    val orNode = beaconProp.node as OrType
                    orNode.orTypes shouldHaveSize 2
                    orNode.orTypes[0].shouldBeInstanceOf<StringType>()
                    orNode.orTypes[1].shouldBeInstanceOf<RecordType>()
                }

                it("should parse boolean property in nested object") {
                    val metaDataProp = doc.properties["metaData"]
                    val objectNode = metaDataProp!!.node as ObjectType
                    val skipValidationProp = objectNode.properties["skipValidation"]

                    skipValidationProp.shouldNotBeNull()
                    skipValidationProp.node.shouldBeInstanceOf<BooleanType>()
                }
            }

            describe("InputAsset parsing") {
                val json = loadFixture("InputAsset.json")
                val doc = XlrDeserializer.deserialize(json)

                it("should parse document name") {
                    doc.name shouldBe "InputAsset"
                }

                it("should parse Binding ref property") {
                    val bindingProp = doc.properties["binding"]
                    bindingProp.shouldNotBeNull()
                    bindingProp.required shouldBe true
                    bindingProp.node.shouldBeInstanceOf<RefType>()

                    val refNode = bindingProp.node as RefType
                    isBindingRef(refNode) shouldBe true
                }
            }

            describe("CollectionAsset parsing") {
                val json = loadFixture("CollectionAsset.json")
                val doc = XlrDeserializer.deserialize(json)

                it("should parse document name") {
                    doc.name shouldBe "CollectionAsset"
                }

                it("should parse array property") {
                    val valuesProp = doc.properties["values"]
                    valuesProp.shouldNotBeNull()
                    valuesProp.node.shouldBeInstanceOf<ArrayType>()

                    val arrayNode = valuesProp.node as ArrayType
                    arrayNode.elementType.shouldBeInstanceOf<RefType>()

                    val elementRef = arrayNode.elementType as RefType
                    isAssetWrapperRef(elementRef) shouldBe true
                }
            }

            describe("TextAsset parsing") {
                val json = loadFixture("TextAsset.json")
                val doc = XlrDeserializer.deserialize(json)

                it("should parse document name") {
                    doc.name shouldBe "TextAsset"
                }

                it("should parse extends clause") {
                    doc.extends.shouldNotBeNull()
                    val assetType = extractAssetTypeConstant(doc.extends)
                    assetType shouldBe "text"
                }

                it("should parse required value property") {
                    val valueProp = doc.properties["value"]
                    valueProp.shouldNotBeNull()
                    valueProp.required shouldBe true
                }
            }

            describe("type guards") {
                it("should detect AssetWrapper refs") {
                    val ref = RefType(ref = "AssetWrapper<TextAsset>")
                    isAssetWrapperRef(ref) shouldBe true

                    val nonWrapper = RefType(ref = "Asset")
                    isAssetWrapperRef(nonWrapper) shouldBe false
                }

                it("should detect Binding refs") {
                    val binding = RefType(ref = "Binding")
                    isBindingRef(binding) shouldBe true

                    val bindingWithGeneric = RefType(ref = "Binding<string>")
                    isBindingRef(bindingWithGeneric) shouldBe true

                    val nonBinding = RefType(ref = "Expression")
                    isBindingRef(nonBinding) shouldBe false
                }

                it("should detect Expression refs") {
                    val expr = RefType(ref = "Expression")
                    isExpressionRef(expr) shouldBe true

                    val exprWithGeneric = RefType(ref = "Expression<boolean>")
                    isExpressionRef(exprWithGeneric) shouldBe true

                    val nonExpr = RefType(ref = "Binding")
                    isExpressionRef(nonExpr) shouldBe false
                }

                it("should extract asset type constant") {
                    val extendsRef =
                        RefType(
                            ref = "Asset<\"action\">",
                            genericArguments = listOf(StringType(const = "action"))
                        )
                    extractAssetTypeConstant(extendsRef) shouldBe "action"

                    val noConst = RefType(ref = "Asset")
                    extractAssetTypeConstant(noConst).shouldBeNull()
                }
            }
        }
    })

private fun loadFixture(name: String): String {
    val classLoader = XlrDeserializerTest::class.java.classLoader
    val resource = classLoader.getResource("com/intuit/playertools/fluent/generator/fixtures/$name")
    return if (resource != null) {
        resource.readText()
    } else {
        val file =
            File("language/generators/kotlin/src/test/kotlin/com/intuit/playertools/fluent/generator/fixtures/$name")
        file.readText()
    }
}
