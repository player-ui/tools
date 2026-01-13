package com.intuit.playertools.fluent.generator

import com.intuit.playertools.xlr.ObjectProperty
import com.intuit.playertools.xlr.ObjectType
import com.intuit.playertools.xlr.ParamTypeNode
import com.intuit.playertools.xlr.XlrDocument
import com.intuit.playertools.xlr.extractAssetTypeConstant
import com.intuit.playertools.xlr.isAssetWrapperRef
import com.intuit.playertools.xlr.isObjectType

/**
 * Information about a property for code generation.
 */
data class PropertyInfo(
    val originalName: String,
    val kotlinName: String,
    val typeInfo: KotlinTypeInfo,
    val required: Boolean,
    val hasBindingOverload: Boolean,
    val hasExpressionOverload: Boolean,
    val isAssetWrapper: Boolean,
    val isArray: Boolean,
    val isNestedObject: Boolean,
    val nestedObjectClassName: String? = null,
)

/**
 * Result of class generation, containing the main class and any nested classes.
 */
data class GeneratedClass(
    val className: String,
    val code: String,
    val nestedClasses: List<GeneratedClass> = emptyList(),
)

/**
 * Generates Kotlin builder classes from XLR schemas.
 */
class ClassGenerator(
    private val document: XlrDocument,
    private val packageName: String,
) {
    private val genericTokens: Map<String, ParamTypeNode> =
        document.genericTokens
            ?.associateBy { it.symbol }
            ?: emptyMap()

    private val nestedClasses = mutableListOf<GeneratedClass>()

    // Main builder class name (e.g., "ActionBuilder"), used as prefix for nested classes
    private val mainBuilderName: String =
        TypeMapper.toBuilderClassName(document.name.removeSuffix("Asset"))

    // Cache for collectProperties() to avoid generating duplicate nested classes
    private val cachedProperties: List<PropertyInfo> by lazy {
        document.properties.map { (name, prop) ->
            createPropertyInfo(name, prop)
        }
    }

    /**
     * Generate the builder class for the XLR document.
     */
    fun generate(): GeneratedClass {
        val className =
            TypeMapper.toBuilderClassName(
                document.name.removeSuffix("Asset"),
            )
        val dslFunctionName = TypeMapper.toDslFunctionName(document.name)
        val assetType = extractAssetTypeConstant(document.extends)

        val code =
            codeWriter {
                // Package declaration
                line("package $packageName")
                blankLine()

                // Imports
                generateImports()
                blankLine()

                // Class documentation
                document.description?.let { kdoc(it) }

                // Class definition
                classBlock(
                    name = className,
                    annotations = listOf("@FluentDslMarker"),
                    superClass = "FluentBuilderBase<Map<String, Any?>>()",
                ) {
                    // Properties section
                    generateDefaultsProperty(assetType)
                    blankLine()
                    generateAssetWrapperPropertiesSet()
                    generateArrayPropertiesSet()
                    blankLine()

                    // Standard id property (all Player-UI assets need this)
                    generateIdProperty()
                    blankLine()

                    // Generate property accessors
                    val properties = collectProperties()
                    properties.forEach { prop ->
                        generateProperty(prop)
                        blankLine()
                    }

                    // Build method
                    generateBuildMethod()
                    blankLine()

                    // Clone method
                    generateCloneMethod(className)
                }

                blankLine()

                // Top-level DSL function
                generateDslFunction(dslFunctionName, className, document.description)

                // Generate nested classes at end of file
                nestedClasses.forEach { nested ->
                    blankLine()
                    raw(nested.code)
                }
            }

        return GeneratedClass(
            className = className,
            code = code,
            nestedClasses = nestedClasses,
        )
    }

    private fun CodeWriter.generateImports() {
        line("import com.intuit.playertools.fluent.FluentDslMarker")
        line("import com.intuit.playertools.fluent.core.AssetWrapperBuilder")
        line("import com.intuit.playertools.fluent.core.BuildContext")
        line("import com.intuit.playertools.fluent.core.FluentBuilderBase")
        line("import com.intuit.playertools.fluent.tagged.Binding")
        line("import com.intuit.playertools.fluent.tagged.TaggedValue")
    }

    private fun CodeWriter.generateDefaultsProperty(assetType: String?) {
        val defaultsValue =
            if (assetType != null) {
                "mapOf(\"type\" to \"$assetType\")"
            } else {
                "emptyMap()"
            }
        overrideVal("defaults", "Map<String, Any?>", defaultsValue)
    }

    private fun CodeWriter.generateAssetWrapperPropertiesSet() {
        // Only include non-array asset wrapper properties
        // Array properties are handled differently by the build pipeline
        val assetWrapperProps =
            collectProperties()
                .filter { it.isAssetWrapper && !it.isArray }
                .map { "\"${it.originalName}\"" }

        if (assetWrapperProps.isNotEmpty()) {
            val setContent = assetWrapperProps.joinToString(", ")
            overrideVal("assetWrapperProperties", "Set<String>", "setOf($setContent)")
        } else {
            overrideVal("assetWrapperProperties", "Set<String>", "emptySet()")
        }
    }

    private fun CodeWriter.generateArrayPropertiesSet() {
        val arrayProps =
            collectProperties()
                .filter { it.isArray }
                .map { "\"${it.originalName}\"" }

        if (arrayProps.isNotEmpty()) {
            val setContent = arrayProps.joinToString(", ")
            overrideVal("arrayProperties", "Set<String>", "setOf($setContent)")
        } else {
            overrideVal("arrayProperties", "Set<String>", "emptySet()")
        }
    }

    private fun CodeWriter.generateIdProperty() {
        kdoc("Each asset requires a unique id per view")
        simpleProperty(
            name = "id",
            type = "String?",
            getterExpr = "peek(\"id\") as? String",
            setterExpr = "set(\"id\", value)",
        )
    }

    private fun collectProperties(): List<PropertyInfo> = cachedProperties

    private fun createPropertyInfo(
        name: String,
        prop: ObjectProperty,
        allowNestedGeneration: Boolean = true,
    ): PropertyInfo {
        val context = TypeMapperContext(genericTokens = genericTokens)
        val typeInfo = TypeMapper.mapToKotlinType(prop.node, context)
        val kotlinName = TypeMapper.toKotlinIdentifier(name)

        // Check if property node is a nested object that needs its own class
        val isNestedObject = allowNestedGeneration && isObjectType(prop.node)
        val nestedClassName =
            if (isNestedObject) {
                generateNestedClass(name, prop.node as ObjectType)
            } else {
                null
            }

        return PropertyInfo(
            originalName = name,
            kotlinName = kotlinName,
            typeInfo = typeInfo,
            required = prop.required,
            hasBindingOverload = shouldHaveOverload(typeInfo.typeName) || typeInfo.isBinding,
            hasExpressionOverload = shouldHaveOverload(typeInfo.typeName) || typeInfo.isExpression,
            isAssetWrapper = typeInfo.isAssetWrapper || isAssetWrapperRef(prop.node),
            isArray = typeInfo.isArray,
            isNestedObject = isNestedObject,
            nestedObjectClassName = nestedClassName,
        )
    }

    private fun generateNestedClass(
        propertyName: String,
        objectType: ObjectType,
    ): String {
        // Use main builder name as prefix to avoid class name conflicts across files
        // e.g., "ActionMetaDataConfig" instead of just "MetaDataConfig"
        val baseName = mainBuilderName.removeSuffix("Builder")
        val className = baseName + propertyName.replaceFirstChar { it.uppercase() } + "Config"

        val code =
            codeWriter {
                objectType.description?.let { kdoc(it) }

                classBlock(
                    name = className,
                    annotations = listOf("@FluentDslMarker"),
                    superClass = "FluentBuilderBase<Map<String, Any?>>()",
                ) {
                    overrideVal("defaults", "Map<String, Any?>", "emptyMap()")
                    overrideVal("assetWrapperProperties", "Set<String>", "emptySet()")
                    overrideVal("arrayProperties", "Set<String>", "emptySet()")
                    blankLine()

                    // Generate properties for nested object
                    objectType.properties.forEach { (propName, propObj) ->
                        val propInfo = createPropertyInfo(propName, propObj, allowNestedGeneration = false)
                        generateProperty(propInfo)
                        blankLine()
                    }

                    generateBuildMethod()
                    blankLine()
                    generateCloneMethod(className)
                }
            }

        nestedClasses.add(GeneratedClass(className, code.trim()))
        return className
    }

    private fun CodeWriter.generateProperty(prop: PropertyInfo) {
        // Add property documentation
        prop.typeInfo.description?.let { kdoc(it) }

        when {
            prop.isNestedObject && prop.nestedObjectClassName != null -> {
                generateNestedObjectProperty(prop)
            }

            prop.isAssetWrapper && prop.isArray -> {
                generateAssetArrayProperty(prop)
            }

            prop.isAssetWrapper -> {
                generateAssetWrapperProperty(prop)
            }

            prop.isArray -> {
                generateArrayProperty(prop)
            }

            else -> {
                generateSimpleProperty(prop)
            }
        }
    }

    private fun CodeWriter.generateSimpleProperty(prop: PropertyInfo) {
        val typeName = prop.typeInfo.typeName
        val nullableType = TypeMapper.makeNullable(typeName)

        simpleProperty(
            name = prop.kotlinName,
            type = nullableType,
            getterExpr = "peek(\"${prop.originalName}\") as? $typeName",
            setterExpr = "set(\"${prop.originalName}\", value)",
        )

        // Generate binding overload
        if (prop.hasBindingOverload) {
            blankLine()
            line("fun ${prop.kotlinName}(binding: Binding<$typeName>) { set(\"${prop.originalName}\", binding) }")
        }

        // Generate expression/tagged value overload
        if (prop.hasExpressionOverload) {
            blankLine()
            val setCall = "set(\"${prop.originalName}\", taggedValue)"
            line("fun ${prop.kotlinName}(taggedValue: TaggedValue<$typeName>) { $setCall }")
        }
    }

    private fun CodeWriter.generateAssetWrapperProperty(prop: PropertyInfo) {
        // Write-only property for assets
        line("var ${prop.kotlinName}: FluentBuilderBase<*>?")
        indent()
        line("get() = null // Write-only")
        line("set(value) { if (value != null) set(\"${prop.originalName}\", AssetWrapperBuilder(value)) }")
        dedent()

        // DSL lambda function
        blankLine()
        line("fun <T : FluentBuilderBase<*>> ${prop.kotlinName}(builder: T) {")
        indent()
        line("set(\"${prop.originalName}\", AssetWrapperBuilder(builder))")
        dedent()
        line("}")
    }

    private fun CodeWriter.generateAssetArrayProperty(prop: PropertyInfo) {
        // Write-only property for asset arrays
        // Don't manually wrap - let the build pipeline handle array elements
        line("var ${prop.kotlinName}: List<FluentBuilderBase<*>>?")
        indent()
        line("get() = null // Write-only")
        line("set(value) { set(\"${prop.originalName}\", value) }")
        dedent()

        // Varargs function
        blankLine()
        line("fun ${prop.kotlinName}(vararg builders: FluentBuilderBase<*>) {")
        indent()
        line("set(\"${prop.originalName}\", builders.toList())")
        dedent()
        line("}")
    }

    private fun CodeWriter.generateArrayProperty(prop: PropertyInfo) {
        val elementType = prop.typeInfo.elementType?.typeName ?: "Any?"
        val listType = "List<$elementType>"
        val nullableType = "$listType?"

        simpleProperty(
            name = prop.kotlinName,
            type = nullableType,
            getterExpr = "peek(\"${prop.originalName}\") as? $listType",
            setterExpr = "set(\"${prop.originalName}\", value)",
        )

        // Varargs function
        blankLine()
        line("fun ${prop.kotlinName}(vararg items: $elementType) {")
        indent()
        line("set(\"${prop.originalName}\", items.toList())")
        dedent()
        line("}")
    }

    private fun CodeWriter.generateNestedObjectProperty(prop: PropertyInfo) {
        val className =
            requireNotNull(prop.nestedObjectClassName) {
                "nestedObjectClassName required for nested object property: ${prop.originalName}"
            }

        line("var ${prop.kotlinName}: $className?")
        indent()
        line("get() = null // Write-only")
        line("set(value) { if (value != null) set(\"${prop.originalName}\", value) }")
        dedent()

        // DSL lambda function
        blankLine()
        line("fun ${prop.kotlinName}(init: $className.() -> Unit) {")
        indent()
        line("set(\"${prop.originalName}\", $className().apply(init))")
        dedent()
        line("}")
    }

    private fun CodeWriter.generateBuildMethod() {
        line("override fun build(context: BuildContext?) = buildWithDefaults(context)")
    }

    private fun CodeWriter.generateCloneMethod(className: String) {
        line("override fun clone() = $className().also { cloneStorageTo(it) }")
    }

    private fun CodeWriter.generateDslFunction(
        functionName: String,
        className: String,
        description: String?,
    ) {
        description?.let { kdoc(it) }
        line("fun $functionName(init: $className.() -> Unit = {}) = $className().apply(init)")
    }

    companion object {
        /**
         * Primitive types that should have Binding and Expression overloads.
         */
        private val PRIMITIVE_OVERLOAD_TYPES = setOf("String", "Number", "Boolean")

        /**
         * Generate Kotlin builder code from an XLR document.
         */
        fun generate(
            document: XlrDocument,
            packageName: String,
        ): GeneratedClass =
            ClassGenerator(document, packageName)
                .generate()

        /**
         * Check if a type should have binding/expression overloads.
         */
        internal fun shouldHaveOverload(typeName: String): Boolean = typeName in PRIMITIVE_OVERLOAD_TYPES
    }
}
