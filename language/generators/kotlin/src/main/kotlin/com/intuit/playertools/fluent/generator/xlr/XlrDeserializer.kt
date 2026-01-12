package com.intuit.playertools.fluent.generator.xlr

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.double
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

/*
 * XLR JSON deserializer.
 * Parses XLR JSON schemas into Kotlin type definitions.
 */

object XlrDeserializer {
    private val json =
        Json {
            ignoreUnknownKeys = true
            isLenient = true
        }

    /**
     * Deserialize an XLR document from JSON string.
     */
    fun deserialize(jsonString: String): XlrDocument {
        val element = json.parseToJsonElement(jsonString).jsonObject
        return parseDocument(element)
    }

    /**
     * Parse an XLR document from a JsonObject.
     */
    fun parseDocument(obj: JsonObject): XlrDocument =
        XlrDocument(
            name = obj["name"]?.jsonPrimitive?.content ?: "",
            source = obj["source"]?.jsonPrimitive?.content ?: "",
            type = obj["type"]?.jsonPrimitive?.content ?: "object",
            properties = parseProperties(obj["properties"]),
            extends = obj["extends"]?.let { parseRefType(it.jsonObject) },
            additionalProperties = obj["additionalProperties"],
            genericTokens = obj["genericTokens"]?.jsonArray?.map { parseParamTypeNode(it.jsonObject) },
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    /**
     * Parse a NodeType from a JsonElement.
     */
    fun parseNode(element: JsonElement): NodeType {
        if (element is JsonNull) {
            return NullType()
        }

        val obj = element.jsonObject
        val type =
            obj["type"]?.jsonPrimitive?.content
                ?: throw IllegalArgumentException("Node missing 'type' field: $obj")

        return when (type) {
            "string" -> parseStringType(obj)
            "number" -> parseNumberType(obj)
            "boolean" -> parseBooleanType(obj)
            "null" -> parseNullType(obj)
            "any" -> parseAnyType(obj)
            "unknown" -> parseUnknownType(obj)
            "undefined" -> parseUndefinedType(obj)
            "void" -> parseVoidType(obj)
            "never" -> parseNeverType(obj)
            "ref" -> parseRefType(obj)
            "object" -> parseObjectType(obj)
            "array" -> parseArrayType(obj)
            "tuple" -> parseTupleType(obj)
            "record" -> parseRecordType(obj)
            "or" -> parseOrType(obj)
            "and" -> parseAndType(obj)
            "template" -> parseTemplateLiteralType(obj)
            "conditional" -> parseConditionalType(obj)
            "function" -> parseFunctionType(obj)
            else -> throw IllegalArgumentException("Unknown type: $type")
        }
    }

    private fun parseStringType(obj: JsonObject): StringType =
        StringType(
            const = obj["const"]?.jsonPrimitive?.contentOrNull,
            enum = obj["enum"]?.jsonArray?.map { it.jsonPrimitive.content },
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseNumberType(obj: JsonObject): NumberType =
        NumberType(
            const = obj["const"]?.jsonPrimitive?.doubleOrNull,
            enum = obj["enum"]?.jsonArray?.map { it.jsonPrimitive.double },
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseBooleanType(obj: JsonObject): BooleanType =
        BooleanType(
            const = obj["const"]?.jsonPrimitive?.booleanOrNull,
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseNullType(obj: JsonObject): NullType =
        NullType(
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseAnyType(obj: JsonObject): AnyType =
        AnyType(
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseUnknownType(obj: JsonObject): UnknownType =
        UnknownType(
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseUndefinedType(obj: JsonObject): UndefinedType =
        UndefinedType(
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseVoidType(obj: JsonObject): VoidType =
        VoidType(
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseNeverType(obj: JsonObject): NeverType =
        NeverType(
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseRefType(obj: JsonObject): RefType =
        RefType(
            ref = obj["ref"]?.jsonPrimitive?.content ?: "",
            genericArguments = obj["genericArguments"]?.jsonArray?.map { parseNode(it) },
            property = obj["property"]?.jsonPrimitive?.contentOrNull,
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseObjectType(obj: JsonObject): ObjectType =
        ObjectType(
            properties = parseProperties(obj["properties"]),
            extends = obj["extends"]?.let { parseRefType(it.jsonObject) },
            additionalProperties = obj["additionalProperties"],
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseArrayType(obj: JsonObject): ArrayType {
        val elementType =
            obj["elementType"]
                ?: throw IllegalArgumentException("Array missing 'elementType': $obj")
        return ArrayType(
            elementType = parseNode(elementType),
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )
    }

    private fun parseTupleType(obj: JsonObject): TupleType =
        TupleType(
            elementTypes =
                obj["elementTypes"]?.jsonArray?.map { parseTupleMember(it.jsonObject) }
                    ?: emptyList(),
            minItems = obj["minItems"]?.jsonPrimitive?.int ?: 0,
            additionalItems = obj["additionalItems"],
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseTupleMember(obj: JsonObject): TupleMember =
        TupleMember(
            name = obj["name"]?.jsonPrimitive?.contentOrNull,
            type = parseNode(obj["type"] ?: throw IllegalArgumentException("TupleMember missing 'type'")),
            optional = obj["optional"]?.jsonPrimitive?.booleanOrNull
        )

    private fun parseRecordType(obj: JsonObject): RecordType =
        RecordType(
            keyType = parseNode(obj["keyType"] ?: throw IllegalArgumentException("Record missing 'keyType'")),
            valueType = parseNode(obj["valueType"] ?: throw IllegalArgumentException("Record missing 'valueType'")),
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseOrType(obj: JsonObject): OrType =
        OrType(
            orTypes = obj["or"]?.jsonArray?.map { parseNode(it) } ?: emptyList(),
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseAndType(obj: JsonObject): AndType =
        AndType(
            andTypes = obj["and"]?.jsonArray?.map { parseNode(it) } ?: emptyList(),
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseTemplateLiteralType(obj: JsonObject): TemplateLiteralType =
        TemplateLiteralType(
            format = obj["format"]?.jsonPrimitive?.content ?: "",
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseConditionalType(obj: JsonObject): ConditionalType =
        ConditionalType(
            check = obj["check"]?.jsonObject?.mapValues { parseNode(it.value) } ?: emptyMap(),
            value = obj["value"]?.jsonObject?.mapValues { parseNode(it.value) } ?: emptyMap(),
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseFunctionType(obj: JsonObject): FunctionType =
        FunctionType(
            parameters =
                obj["parameters"]?.jsonArray?.map { parseFunctionParameter(it.jsonObject) }
                    ?: emptyList(),
            returnType = obj["returnType"]?.let { parseNode(it) },
            title = obj["title"]?.jsonPrimitive?.contentOrNull,
            description = obj["description"]?.jsonPrimitive?.contentOrNull
        )

    private fun parseFunctionParameter(obj: JsonObject): FunctionParameter =
        FunctionParameter(
            name = obj["name"]?.jsonPrimitive?.content ?: "",
            type = parseNode(obj["type"] ?: throw IllegalArgumentException("Parameter missing 'type'")),
            optional = obj["optional"]?.jsonPrimitive?.booleanOrNull,
            default = obj["default"]?.let { parseNode(it) }
        )

    private fun parseProperties(element: JsonElement?): Map<String, ObjectProperty> {
        if (element == null || element is JsonNull) return emptyMap()
        return element.jsonObject.mapValues { (_, propElement) ->
            val propObj = propElement.jsonObject
            ObjectProperty(
                required = propObj["required"]?.jsonPrimitive?.boolean ?: false,
                node = parseNode(propObj["node"] ?: throw IllegalArgumentException("Property missing 'node'"))
            )
        }
    }

    private fun parseParamTypeNode(obj: JsonObject): ParamTypeNode =
        ParamTypeNode(
            symbol = obj["symbol"]?.jsonPrimitive?.content ?: "",
            constraints = obj["constraints"]?.let { parseNode(it) },
            default = obj["default"]?.let { parseNode(it) }
        )
}
