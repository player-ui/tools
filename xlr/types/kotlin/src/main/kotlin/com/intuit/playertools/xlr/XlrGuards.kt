package com.intuit.playertools.xlr

/**
 * Type guard functions for XLR node types.
 * Provides convenient type checking and casting utilities.
 */

fun isStringType(node: NodeType): Boolean = node is StringType

fun isNumberType(node: NodeType): Boolean = node is NumberType

fun isBooleanType(node: NodeType): Boolean = node is BooleanType

fun isNullType(node: NodeType): Boolean = node is NullType

fun isAnyType(node: NodeType): Boolean = node is AnyType

fun isUnknownType(node: NodeType): Boolean = node is UnknownType

fun isUndefinedType(node: NodeType): Boolean = node is UndefinedType

fun isVoidType(node: NodeType): Boolean = node is VoidType

fun isNeverType(node: NodeType): Boolean = node is NeverType

fun isRefType(node: NodeType): Boolean = node is RefType

fun isObjectType(node: NodeType): Boolean = node is ObjectType

fun isArrayType(node: NodeType): Boolean = node is ArrayType

fun isTupleType(node: NodeType): Boolean = node is TupleType

fun isRecordType(node: NodeType): Boolean = node is RecordType

fun isOrType(node: NodeType): Boolean = node is OrType

fun isAndType(node: NodeType): Boolean = node is AndType

fun isTemplateLiteralType(node: NodeType): Boolean = node is TemplateLiteralType

fun isConditionalType(node: NodeType): Boolean = node is ConditionalType

fun isFunctionType(node: NodeType): Boolean = node is FunctionType

/**
 * Check if a node is a primitive type (string, number, boolean, null, etc.)
 */
fun isPrimitiveType(node: NodeType): Boolean =
    when (node) {
        is StringType, is NumberType, is BooleanType, is NullType,
        is AnyType, is UnknownType, is UndefinedType, is VoidType, is NeverType,
        -> true

        else -> false
    }

/**
 * Check if a ref node references an AssetWrapper type.
 */
fun isAssetWrapperRef(node: NodeType): Boolean {
    if (node !is RefType) return false
    return node.ref.startsWith("AssetWrapper")
}

/**
 * Check if a ref node references an Asset type.
 */
fun isAssetRef(node: NodeType): Boolean {
    if (node !is RefType) return false
    return node.ref.startsWith("Asset<") || node.ref == "Asset"
}

/**
 * Check if a ref node references a Binding type.
 */
fun isBindingRef(node: NodeType): Boolean {
    if (node !is RefType) return false
    return node.ref == "Binding" || node.ref.startsWith("Binding<")
}

/**
 * Check if a ref node references an Expression type.
 */
fun isExpressionRef(node: NodeType): Boolean {
    if (node !is RefType) return false
    return node.ref == "Expression" || node.ref.startsWith("Expression<")
}

/**
 * Extract the asset type constant from an extends clause.
 * E.g., Asset<"action"> -> "action"
 */
fun extractAssetTypeConstant(extendsRef: RefType?): String? {
    if (extendsRef == null) return null
    if (!extendsRef.ref.startsWith("Asset<")) return null

    val genericArgs = extendsRef.genericArguments ?: return null
    if (genericArgs.isEmpty()) return null

    val firstArg = genericArgs.first()
    if (firstArg is StringType && firstArg.const != null) {
        return firstArg.const
    }

    return null
}

/**
 * Check if a string type has a const value (literal type).
 */
fun hasConstValue(node: StringType): Boolean = node.const != null

/**
 * Check if a node has any const value.
 */
fun hasAnyConstValue(node: NodeType): Boolean =
    when (node) {
        is StringType -> node.const != null
        is NumberType -> node.const != null
        is BooleanType -> node.const != null
        else -> false
    }

/**
 * Check if an OrType contains only primitives with const values (Literal type).
 */
fun isLiteralUnion(node: OrType): Boolean = node.orTypes.all { hasAnyConstValue(it) }

/**
 * Get all const values from a literal union.
 */
fun getLiteralValues(node: OrType): List<Any> =
    node.orTypes.mapNotNull { type ->
        when (type) {
            is StringType -> type.const
            is NumberType -> type.const
            is BooleanType -> type.const
            else -> null
        }
    }
