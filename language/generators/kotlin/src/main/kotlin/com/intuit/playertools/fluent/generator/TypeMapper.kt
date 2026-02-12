package com.intuit.playertools.fluent.generator

import com.intuit.playertools.xlr.AnyType
import com.intuit.playertools.xlr.ArrayType
import com.intuit.playertools.xlr.BooleanType
import com.intuit.playertools.xlr.NeverType
import com.intuit.playertools.xlr.NodeType
import com.intuit.playertools.xlr.NullType
import com.intuit.playertools.xlr.NumberType
import com.intuit.playertools.xlr.ObjectType
import com.intuit.playertools.xlr.OrType
import com.intuit.playertools.xlr.ParamTypeNode
import com.intuit.playertools.xlr.RecordType
import com.intuit.playertools.xlr.RefType
import com.intuit.playertools.xlr.StringType
import com.intuit.playertools.xlr.UndefinedType
import com.intuit.playertools.xlr.UnknownType
import com.intuit.playertools.xlr.VoidType
import com.intuit.playertools.xlr.isAssetRef
import com.intuit.playertools.xlr.isAssetWrapperRef
import com.intuit.playertools.xlr.isBindingRef
import com.intuit.playertools.xlr.isExpressionRef

/*
 * Maps XLR types to Kotlin type information for code generation.
 */

/**
 * Information about a Kotlin type derived from an XLR node.
 */
data class KotlinTypeInfo(
    val typeName: String,
    val isNullable: Boolean = true,
    val isAssetWrapper: Boolean = false,
    val isArray: Boolean = false,
    val elementType: KotlinTypeInfo? = null,
    val isBinding: Boolean = false,
    val isExpression: Boolean = false,
    val builderType: String? = null,
    val isNestedObject: Boolean = false,
    val nestedObjectName: String? = null,
    val description: String? = null,
)

/**
 * Context for type mapping, including generic token resolution.
 */
data class TypeMapperContext(
    val genericTokens: Map<String, ParamTypeNode> = emptyMap(),
    val parentPropertyPath: String = "",
)

/**
 * Maps XLR node types to Kotlin type information.
 */
object TypeMapper {
    /**
     * Convert an XLR NodeType to Kotlin type information.
     */
    fun mapToKotlinType(
        node: NodeType,
        context: TypeMapperContext = TypeMapperContext(),
    ): KotlinTypeInfo =
        when (node) {
            is StringType -> mapPrimitiveType("String", node.description)
            is NumberType -> mapPrimitiveType("Number", node.description)
            is BooleanType -> mapPrimitiveType("Boolean", node.description)
            is NullType -> KotlinTypeInfo("Nothing?", isNullable = true)
            is AnyType -> KotlinTypeInfo("Any?", isNullable = true)
            is UnknownType -> KotlinTypeInfo("Any?", isNullable = true)
            is UndefinedType -> KotlinTypeInfo("Nothing?", isNullable = true)
            is VoidType -> KotlinTypeInfo("Unit", isNullable = false)
            is NeverType -> KotlinTypeInfo("Nothing", isNullable = false)
            is RefType -> mapRefType(node, context)
            is ObjectType -> mapObjectType(node, context)
            is ArrayType -> mapArrayType(node, context)
            is OrType -> mapOrType(node, context)
            is RecordType -> mapRecordType(node, context)
            else -> KotlinTypeInfo("Any?", isNullable = true)
        }

    private fun mapPrimitiveType(
        typeName: String,
        description: String?,
    ): KotlinTypeInfo =
        KotlinTypeInfo(
            typeName = typeName,
            isNullable = true,
            description = description,
        )

    private fun mapRefType(
        node: RefType,
        context: TypeMapperContext,
    ): KotlinTypeInfo {
        val ref = node.ref

        // Check for generic token
        context.genericTokens[ref]?.let { token ->
            token.default?.let { return mapToKotlinType(it, context) }
            token.constraints?.let { return mapToKotlinType(it, context) }
        }

        // Check for AssetWrapper
        if (isAssetWrapperRef(node)) {
            return KotlinTypeInfo(
                typeName = "FluentBuilder<*>",
                isNullable = true,
                isAssetWrapper = true,
                builderType = "FluentBuilder<*>",
                description = node.description,
            )
        }

        // Check for Asset
        if (isAssetRef(node)) {
            return KotlinTypeInfo(
                typeName = "FluentBuilder<*>",
                isNullable = true,
                builderType = "FluentBuilder<*>",
                description = node.description,
            )
        }

        // Check for Binding
        if (isBindingRef(node)) {
            return KotlinTypeInfo(
                typeName = "Binding<*>",
                isNullable = true,
                isBinding = true,
                description = node.description,
            )
        }

        // Check for Expression
        if (isExpressionRef(node)) {
            return KotlinTypeInfo(
                typeName = "TaggedValue<*>",
                isNullable = true,
                isExpression = true,
                description = node.description,
            )
        }

        // Default: unknown ref, use Any
        return KotlinTypeInfo(
            typeName = "Any?",
            isNullable = true,
            description = node.description,
        )
    }

    private fun mapObjectType(
        node: ObjectType,
        context: TypeMapperContext,
    ): KotlinTypeInfo {
        // Inline objects become nested classes
        return KotlinTypeInfo(
            typeName = "Map<String, Any?>",
            isNullable = true,
            isNestedObject = true,
            description = node.description,
        )
    }

    private fun mapArrayType(
        node: ArrayType,
        context: TypeMapperContext,
    ): KotlinTypeInfo {
        val elementTypeInfo = mapToKotlinType(node.elementType, context)

        val listTypeName =
            if (elementTypeInfo.isAssetWrapper || elementTypeInfo.builderType != null) {
                "List<FluentBuilder<*>>"
            } else {
                "List<${elementTypeInfo.typeName}>"
            }

        return KotlinTypeInfo(
            typeName = listTypeName,
            isNullable = true,
            isArray = true,
            elementType = elementTypeInfo,
            isAssetWrapper = elementTypeInfo.isAssetWrapper,
            description = node.description,
        )
    }

    private fun mapOrType(
        node: OrType,
        context: TypeMapperContext,
    ): KotlinTypeInfo {
        // Check if all types are primitives with const values (literal union)
        val types = node.orTypes

        // If it's a simple union of primitives, use Any
        // Could be enhanced to use sealed classes for known variants
        return KotlinTypeInfo(
            typeName = "Any?",
            isNullable = true,
            description = node.description,
        )
    }

    private fun mapRecordType(
        node: RecordType,
        context: TypeMapperContext,
    ): KotlinTypeInfo {
        val keyTypeInfo = mapToKotlinType(node.keyType, context)
        val valueTypeInfo = mapToKotlinType(node.valueType, context)

        return KotlinTypeInfo(
            typeName = "Map<${keyTypeInfo.typeName}, ${valueTypeInfo.typeName}>",
            isNullable = true,
            description = node.description,
        )
    }

    /**
     * Get the nullable version of a type name.
     */
    fun makeNullable(typeName: String): String = if (typeName.endsWith("?")) typeName else "$typeName?"

    /**
     * Get the non-nullable version of a type name.
     */
    fun makeNonNullable(typeName: String): String = typeName.removeSuffix("?")

    /**
     * Kotlin hard keywords that must be escaped with backticks when used as identifiers.
     */
    private val KOTLIN_KEYWORDS =
        setOf(
            "as", "break", "class", "continue", "do", "else", "false", "for", "fun",
            "if", "in", "interface", "is", "null", "object", "package", "return",
            "super", "this", "throw", "true", "try", "typealias", "typeof", "val",
            "var", "when", "while",
        )

    /**
     * Convert a property name to a valid Kotlin identifier.
     * Escapes Kotlin keywords with backticks and handles invalid characters.
     */
    fun toKotlinIdentifier(name: String): String {
        // Replace invalid characters
        val cleaned =
            name
                .replace("-", "_")
                .replace(".", "_")
                .replace(" ", "_")

        return when {
            cleaned.isEmpty() -> "_unnamed_"
            cleaned.first().isDigit() -> "_$cleaned"
            cleaned in KOTLIN_KEYWORDS -> "`$cleaned`"
            else -> cleaned
        }
    }

    /**
     * Convert an asset type name to a builder class name.
     * E.g., "action" -> "ActionBuilder", "text" -> "TextBuilder"
     */
    fun toBuilderClassName(assetType: String): String {
        val capitalized = assetType.replaceFirstChar { it.uppercase() }
        return "${capitalized}Builder"
    }

    /**
     * Convert an asset type name to a DSL function name.
     * E.g., "ActionAsset" -> "action", "TextAsset" -> "text"
     */
    fun toDslFunctionName(assetName: String): String =
        assetName
            .removeSuffix("Asset")
            .replaceFirstChar { it.lowercase() }
}
