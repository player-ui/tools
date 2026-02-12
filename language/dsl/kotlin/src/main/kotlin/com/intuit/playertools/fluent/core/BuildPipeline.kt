package com.intuit.playertools.fluent.core

import com.intuit.playertools.fluent.id.determineSlotName
import com.intuit.playertools.fluent.id.genId
import com.intuit.playertools.fluent.tagged.TaggedValue

/**
 * The 8-step build pipeline for resolving builder properties into final JSON.
 * Matches the TypeScript implementation's resolution order.
 */
object BuildPipeline {
    /**
     * Executes the full build pipeline.
     *
     * Steps:
     * 1. Resolve static values (TaggedValue → string)
     * 2. Generate asset ID
     * 3. Create nested context for child assets
     * 4. Resolve AssetWrapper values
     * 5. Resolve mixed arrays (static + builder values)
     * 6. Resolve builders
     * 7. Resolve switches
     * 8. Resolve templates
     */
    fun execute(
        storage: ValueStorage,
        auxiliary: AuxiliaryStorage,
        defaults: Map<String, Any?>,
        context: BuildContext?,
        arrayProperties: Set<String>,
        assetWrapperProperties: Set<String>,
    ): Map<String, Any?> {
        val result = mutableMapOf<String, Any?>()

        // Apply defaults first
        defaults.forEach { (k, v) -> result[k] = v }

        // Step 1: Resolve static values
        resolveStaticValues(storage, result)

        // Step 2: Generate asset ID
        generateAssetId(storage, result, context)

        // Step 3: Create nested context
        val nestedContext = createNestedContext(result, context)

        // Step 4: Resolve AssetWrapper values
        resolveAssetWrappers(storage, result, nestedContext, assetWrapperProperties)

        // Step 5: Resolve mixed arrays
        resolveMixedArrays(storage, result, nestedContext)

        // Step 6: Resolve builders
        resolveBuilders(storage, result, nestedContext)

        // Step 7: Resolve switches
        resolveSwitches(auxiliary, result, nestedContext, arrayProperties)

        // Step 8: Resolve templates
        resolveTemplates(auxiliary, result, context)

        return result
    }

    /**
     * Step 1: Resolve TaggedValues to their string representations.
     */
    private fun resolveStaticValues(
        storage: ValueStorage,
        result: MutableMap<String, Any?>,
    ) {
        storage.getValues().forEach { (key, value) ->
            result[key] = resolveValue(value)
        }
    }

    /**
     * Recursively resolves values, converting TaggedValues to strings.
     */
    private fun resolveValue(value: Any?): Any? =
        when (value) {
            null -> null
            is TaggedValue<*> -> value.toString()
            is Map<*, *> -> value.mapValues { (_, v) -> resolveValue(v) }
            is List<*> -> value.map { resolveValue(it) }
            else -> value
        }

    /**
     * Step 2: Generate a unique ID for the asset.
     */
    private fun generateAssetId(
        storage: ValueStorage,
        result: MutableMap<String, Any?>,
        context: BuildContext?,
    ) {
        // If ID is already set explicitly, use it
        if (result["id"] != null) return
        if (context == null) return

        // Generate ID from context
        val generatedId = genId(context)
        if (generatedId.isNotEmpty()) {
            result["id"] = generatedId
        }
    }

    /**
     * Step 3: Create a nested context for child assets.
     */
    private fun createNestedContext(
        result: Map<String, Any?>,
        context: BuildContext?,
    ): BuildContext? {
        if (context == null) return null

        val parentId = result["id"] as? String ?: context.parentId
        return context
            .withParentId(parentId ?: "")
            .clearBranch()
    }

    /**
     * Step 4: Resolve AssetWrapper values.
     * Wraps builders in { asset: ... } structure.
     */
    private fun resolveAssetWrappers(
        storage: ValueStorage,
        result: MutableMap<String, Any?>,
        context: BuildContext?,
        assetWrapperProperties: Set<String>,
    ) {
        storage.getBuilders().forEach { (key, value) ->
            if (key in assetWrapperProperties && value is AssetWrapperBuilder) {
                val slotContext = createSlotContext(context, key, value.builder)
                val builtAsset = value.builder.build(slotContext)
                result[key] = mapOf("asset" to builtAsset)
            }
        }
    }

    /**
     * Step 5: Resolve mixed arrays (arrays with both static and builder values).
     */
    private fun resolveMixedArrays(
        storage: ValueStorage,
        result: MutableMap<String, Any?>,
        context: BuildContext?,
    ) {
        storage.getMixedArrays().forEach { (key, metadata) ->
            val resolvedArray =
                metadata.array.mapIndexedNotNull { index, item ->
                    when {
                        item == null -> {
                            null
                        }

                        index in metadata.builderIndices && item is FluentBuilder<*> -> {
                            val arrayContext = createArrayItemContext(context, key, index, item)
                            item.build(arrayContext)
                        }

                        index in metadata.objectIndices -> {
                            resolveNestedBuilders(item, context, key, index)
                        }

                        else -> {
                            resolveValue(item)
                        }
                    }
                }
            result[key] = resolvedArray
        }
    }

    /**
     * Step 6: Resolve direct builder values.
     */
    private fun resolveBuilders(
        storage: ValueStorage,
        result: MutableMap<String, Any?>,
        context: BuildContext?,
    ) {
        storage.getBuilders().forEach { (key, value) ->
            // Skip AssetWrapperBuilders (handled in step 4)
            if (value is AssetWrapperBuilder) return@forEach

            when (value) {
                is FluentBuilder<*> -> {
                    val slotContext = createSlotContext(context, key, value)
                    result[key] = value.build(slotContext)
                }

                is Map<*, *> -> {
                    result[key] = resolveNestedBuilders(value, context, key, null)
                }

                is List<*> -> {
                    result[key] =
                        value.mapIndexedNotNull { index, item ->
                            when (item) {
                                null -> {
                                    null
                                }

                                is FluentBuilder<*> -> {
                                    val arrayContext = createArrayItemContext(context, key, index, item)
                                    item.build(arrayContext)
                                }

                                else -> {
                                    resolveNestedBuilders(item, context, key, index)
                                }
                            }
                        }
                }
            }
        }
    }

    /**
     * Step 7: Resolve switch configurations.
     */
    private fun resolveSwitches(
        auxiliary: AuxiliaryStorage,
        result: MutableMap<String, Any?>,
        context: BuildContext?,
        arrayProperties: Set<String>,
    ) {
        val switches = auxiliary.getList(AuxiliaryStorage.SWITCHES)
        if (switches.isEmpty()) return

        switches.forEach { switchMeta ->
            val (path, args) = switchMeta
            val switchKey = if (args.isDynamic) "dynamicSwitch" else "staticSwitch"

            val resolvedCases =
                args.cases.mapIndexed { index, case ->
                    val caseContext =
                        context?.withBranch(
                            IdBranch.Switch(
                                index = index,
                                kind =
                                    if (args.isDynamic) {
                                        IdBranch.Switch.SwitchKind.DYNAMIC
                                    } else {
                                        IdBranch.Switch.SwitchKind.STATIC
                                    },
                            ),
                        )

                    val caseValue =
                        when (val c = case.case) {
                            is Boolean -> c
                            is TaggedValue<*> -> c.toString()
                            else -> c.toString()
                        }

                    val assetValue =
                        when (val a = case.asset) {
                            is FluentBuilder<*> -> a.build(caseContext)
                            else -> resolveValue(a)
                        }

                    mapOf(
                        "case" to caseValue,
                        "asset" to assetValue,
                    )
                }

            // Inject switch at the specified path
            injectAtPath(result, path, mapOf(switchKey to resolvedCases))
        }
    }

    /**
     * Step 8: Resolve template configurations.
     */
    private fun resolveTemplates(
        auxiliary: AuxiliaryStorage,
        result: MutableMap<String, Any?>,
        context: BuildContext?,
    ) {
        val templates = auxiliary.getList(AuxiliaryStorage.TEMPLATES)
        if (templates.isEmpty()) return

        templates.forEach { templateFn ->
            val templateContext = context ?: BuildContext()
            val config = templateFn(templateContext)

            val templateKey = if (config.dynamic) "dynamicTemplate" else "template"

            val templateDepth = extractTemplateDepth(context)
            val valueContext = templateContext.withBranch(IdBranch.Template(templateDepth))

            val resolvedValue =
                when (val v = config.value) {
                    is FluentBuilder<*> -> mapOf("asset" to v.build(valueContext))
                    else -> resolveValue(v)
                }

            val templateData =
                mapOf(
                    "data" to config.data,
                    "output" to config.output,
                    "value" to resolvedValue,
                )

            // Get existing array or create new one
            val existingArray = (result[config.output] as? List<*>)?.toMutableList() ?: mutableListOf<Any?>()
            existingArray.add(mapOf(templateKey to templateData))
            result[config.output] = existingArray
        }
    }

    /**
     * Creates a context for a slot (named property).
     */
    private fun createSlotContext(
        context: BuildContext?,
        key: String,
        builder: FluentBuilder<*>,
    ): BuildContext? {
        if (context == null) return null

        val metadata = extractAssetMetadata(builder)
        val slotName = determineSlotName(key, metadata)

        return context
            .withBranch(IdBranch.Slot(slotName))
            .withParameterName(key)
            .withAssetMetadata(metadata)
    }

    /**
     * Creates a context for an array item.
     */
    private fun createArrayItemContext(
        context: BuildContext?,
        key: String,
        index: Int,
        builder: FluentBuilder<*>,
    ): BuildContext? {
        if (context == null) return null

        val metadata = extractAssetMetadata(builder)

        return context
            .withBranch(IdBranch.ArrayItem(index))
            .withParameterName(key)
            .withIndex(index)
            .withAssetMetadata(metadata)
    }

    /**
     * Extracts asset metadata from a builder for smart ID naming.
     */
    private fun extractAssetMetadata(builder: FluentBuilder<*>): AssetMetadata {
        val type = builder.peek("type") as? String
        val binding =
            builder.peek("binding")?.let {
                when (it) {
                    is TaggedValue<*> -> it.toString()
                    is String -> it
                    else -> null
                }
            }
        val value =
            builder.peek("value")?.let {
                when (it) {
                    is TaggedValue<*> -> it.toString()
                    is String -> it
                    else -> null
                }
            }
        return AssetMetadata(type, binding, value)
    }

    /**
     * Resolves nested builders within objects/arrays.
     */
    private fun resolveNestedBuilders(
        value: Any?,
        context: BuildContext?,
        key: String,
        index: Int?,
    ): Any? =
        when (value) {
            null -> {
                null
            }

            is FluentBuilder<*> -> {
                val nestedContext =
                    if (index != null) {
                        createArrayItemContext(context, key, index, value)
                    } else {
                        createSlotContext(context, key, value)
                    }
                value.build(nestedContext)
            }

            is Map<*, *> -> {
                value.mapValues { (_, v) ->
                    resolveNestedBuilders(v, context, key, index)
                }
            }

            is List<*> -> {
                value.mapIndexed { i, item ->
                    resolveNestedBuilders(item, context, key, i)
                }
            }

            is TaggedValue<*> -> {
                value.toString()
            }

            else -> {
                value
            }
        }

    /**
     * Injects a value at a nested path in the result map.
     */
    private fun injectAtPath(
        result: MutableMap<String, Any?>,
        path: List<Any>,
        value: Any?,
    ) {
        if (path.isEmpty()) return

        var current: Any? = result
        val lastIndex = path.size - 1

        path.forEachIndexed { index, segment ->
            if (index == lastIndex) {
                when {
                    current is MutableMap<*, *> && segment is String -> {
                        @Suppress("UNCHECKED_CAST")
                        val map = current as MutableMap<String, Any?>
                        val existing = map[segment]
                        if (existing is Map<*, *> && value is Map<*, *>) {
                            @Suppress("UNCHECKED_CAST")
                            map[segment] = (existing as Map<String, Any?>) + (value as Map<String, Any?>)
                        } else {
                            map[segment] = value
                        }
                    }

                    current is MutableList<*> && segment is Int -> {
                        @Suppress("UNCHECKED_CAST")
                        val list = current as MutableList<Any?>
                        if (segment < list.size) {
                            val existing = list[segment]
                            if (existing is Map<*, *> && value is Map<*, *>) {
                                @Suppress("UNCHECKED_CAST")
                                list[segment] = (existing as Map<String, Any?>) + (value as Map<String, Any?>)
                            } else {
                                list[segment] = value
                            }
                        }
                    }
                }
            } else {
                current =
                    when {
                        current is Map<*, *> && segment is String -> {
                            @Suppress("UNCHECKED_CAST")
                            (current as Map<String, Any?>)[segment]
                        }

                        current is List<*> && segment is Int -> {
                            (current as List<*>).getOrNull(segment)
                        }

                        else -> {
                            null
                        }
                    }
            }
        }
    }

    /**
     * Extracts the current template depth from context.
     */
    private fun extractTemplateDepth(context: BuildContext?): Int {
        val branch = context?.branch
        return if (branch is IdBranch.Template) branch.depth + 1 else 0
    }
}
