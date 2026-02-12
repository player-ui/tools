package com.intuit.playertools.xlr

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Annotations that can be attached to any XLR type.
 */
@Serializable
data class Annotations(
    val name: String? = null,
    val title: String? = null,
    val description: String? = null,
    val examples: JsonElement? = null,
    val default: JsonElement? = null,
    val see: JsonElement? = null,
    val comment: String? = null,
    val meta: Map<String, String>? = null,
)

/**
 * Base sealed interface for all XLR node types.
 */
sealed interface NodeType {
    val type: String
}

/**
 * String type node.
 */
@Serializable
@SerialName("string")
data class StringType(
    override val type: String = "string",
    val const: String? = null,
    val enum: List<String>? = null,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Number type node.
 */
@Serializable
@SerialName("number")
data class NumberType(
    override val type: String = "number",
    val const: Double? = null,
    val enum: List<Double>? = null,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Boolean type node.
 */
@Serializable
@SerialName("boolean")
data class BooleanType(
    override val type: String = "boolean",
    val const: Boolean? = null,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Null type node.
 */
@Serializable
@SerialName("null")
data class NullType(
    override val type: String = "null",
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Any type node.
 */
@Serializable
@SerialName("any")
data class AnyType(
    override val type: String = "any",
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Unknown type node.
 */
@Serializable
@SerialName("unknown")
data class UnknownType(
    override val type: String = "unknown",
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Undefined type node.
 */
@Serializable
@SerialName("undefined")
data class UndefinedType(
    override val type: String = "undefined",
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Void type node.
 */
@Serializable
@SerialName("void")
data class VoidType(
    override val type: String = "void",
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Never type node.
 */
@Serializable
@SerialName("never")
data class NeverType(
    override val type: String = "never",
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Reference to another type.
 */
@Serializable
@SerialName("ref")
data class RefType(
    override val type: String = "ref",
    val ref: String,
    val genericArguments: List<NodeType>? = null,
    val property: String? = null,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Property definition within an object type.
 */
@Serializable
data class ObjectProperty(
    val required: Boolean,
    val node: NodeType,
)

/**
 * Object type node with properties.
 */
@Serializable
@SerialName("object")
data class ObjectType(
    override val type: String = "object",
    val properties: Map<String, ObjectProperty> = emptyMap(),
    val extends: RefType? = null,
    val additionalProperties: JsonElement? = null,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Array type node.
 */
@Serializable
@SerialName("array")
data class ArrayType(
    override val type: String = "array",
    val elementType: NodeType,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Tuple member definition.
 */
@Serializable
data class TupleMember(
    val name: String? = null,
    val type: NodeType,
    val optional: Boolean? = null,
)

/**
 * Tuple type node.
 */
@Serializable
@SerialName("tuple")
data class TupleType(
    override val type: String = "tuple",
    val elementTypes: List<TupleMember>,
    val minItems: Int,
    val additionalItems: JsonElement? = null,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Record type node (key-value mapping).
 */
@Serializable
@SerialName("record")
data class RecordType(
    override val type: String = "record",
    val keyType: NodeType,
    val valueType: NodeType,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Union type node (or).
 */
@Serializable
@SerialName("or")
data class OrType(
    override val type: String = "or",
    @SerialName("or")
    val orTypes: List<NodeType>,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Intersection type node (and).
 */
@Serializable
@SerialName("and")
data class AndType(
    override val type: String = "and",
    @SerialName("and")
    val andTypes: List<NodeType>,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Template literal type node.
 */
@Serializable
@SerialName("template")
data class TemplateLiteralType(
    override val type: String = "template",
    val format: String,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Conditional type node.
 */
@Serializable
@SerialName("conditional")
data class ConditionalType(
    override val type: String = "conditional",
    val check: Map<String, NodeType>,
    val value: Map<String, NodeType>,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Function parameter definition.
 */
@Serializable
data class FunctionParameter(
    val name: String,
    val type: NodeType,
    val optional: Boolean? = null,
    val default: NodeType? = null,
)

/**
 * Function type node.
 */
@Serializable
@SerialName("function")
data class FunctionType(
    override val type: String = "function",
    val parameters: List<FunctionParameter>,
    val returnType: NodeType? = null,
    val title: String? = null,
    val description: String? = null,
) : NodeType

/**
 * Generic type parameter definition.
 */
@Serializable
data class ParamTypeNode(
    val symbol: String,
    val constraints: NodeType? = null,
    val default: NodeType? = null,
)

/**
 * Named type wrapper that adds name and source information to any node type.
 * Note: The node property is transient and must be set after deserialization if needed.
 */
@Serializable
data class NamedType<T : NodeType>(
    val name: String,
    val source: String,
    val genericTokens: List<ParamTypeNode>? = null,
    @kotlinx.serialization.Transient
    val node: T? = null,
)

/**
 * Complete XLR document representing a named object type (asset definition).
 */
@Serializable
data class XlrDocument(
    val name: String,
    val source: String,
    val type: String = "object",
    val properties: Map<String, ObjectProperty> = emptyMap(),
    val extends: RefType? = null,
    val additionalProperties: JsonElement? = null,
    val genericTokens: List<ParamTypeNode>? = null,
    val title: String? = null,
    val description: String? = null,
) {
    fun toObjectType(): ObjectType =
        ObjectType(
            type = type,
            properties = properties,
            extends = extends,
            additionalProperties = additionalProperties,
            title = title,
            description = description,
        )
}
