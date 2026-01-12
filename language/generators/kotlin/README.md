# Kotlin DSL Generator

Generates Kotlin DSL builder classes from XLR (Cross-Language Representation) JSON schemas. The generated builders are compatible with the `//language/dsl/kotlin:kotlin-dsl` library.

## Installation

### Bazel

```starlark
deps = [
    "//language/generators/kotlin:kotlin-dsl-generator",
]
```

## CLI Usage

```bash
# Build the generator
bazel build //language/generators/kotlin:kotlin-dsl-generator

# Run the generator
java -cp "$(bazel-bin/language/generators/kotlin/kotlin-dsl-generator.jar)" \
  com.intuit.playertools.fluent.generator.MainKt \
  --input <xlr-files> \
  --output <output-dir> \
  --package <package-name>
```

### Arguments

| Argument | Short | Required | Description |
|----------|-------|----------|-------------|
| `--input` | `-i` | Yes | Path to XLR JSON file or directory |
| `--output` | `-o` | Yes | Output directory for generated files |
| `--package` | `-p` | Yes | Package name for generated classes |
| `--help` | `-h` | No | Show help message |

### Examples

```bash
# Single file
java -cp "$CLASSPATH" com.intuit.playertools.fluent.generator.MainKt \
  -i ActionAsset.json \
  -o generated \
  -p com.example.builders

# Directory of XLR files
java -cp "$CLASSPATH" com.intuit.playertools.fluent.generator.MainKt \
  -i xlr/ \
  -o generated \
  -p com.myapp.fluent

# Multiple files
java -cp "$CLASSPATH" com.intuit.playertools.fluent.generator.MainKt \
  ActionAsset.json TextAsset.json InputAsset.json \
  -o out \
  -p com.test
```

## Programmatic Usage

```kotlin
import com.intuit.playertools.fluent.generator.Generator
import com.intuit.playertools.fluent.generator.GeneratorConfig
import java.io.File

// Create generator with configuration
val generator = Generator(GeneratorConfig(
    packageName = "com.example.builders",
    outputDir = File("generated")
))

// Generate from file
val result = generator.generateFromFile(File("ActionAsset.json"))
println("Generated: ${result.className} -> ${result.filePath}")

// Generate from JSON string
val jsonContent = File("ActionAsset.json").readText()
val result2 = generator.generateFromJson(jsonContent, "ActionAsset")

// Generate code without writing to disk
val code = Generator.generateCode(jsonContent, "com.example")
```

## Input Format (XLR)

The generator accepts XLR JSON schemas. XLR is Player-UI's cross-language type representation.

### XLR Structure

```json
{
  "name": "ActionAsset",
  "type": "object",
  "title": "ActionAsset",
  "description": "User actions can be represented in several places.",
  "properties": {
    "value": {
      "required": true,
      "node": {
        "type": "string",
        "title": "ActionAsset.value",
        "description": "The transition value of the action"
      }
    },
    "label": {
      "required": false,
      "node": {
        "type": "ref",
        "ref": "AssetWrapper"
      }
    }
  },
  "extends": {
    "type": "ref",
    "ref": "Asset"
  }
}
```

### Supported XLR Types

| XLR Type | Kotlin Type |
|----------|-------------|
| `string` | `String` |
| `number` | `Number` |
| `boolean` | `Boolean` |
| `object` | Nested config class |
| `array` | `List<T>` |
| `ref` to `Asset` | `FluentBuilderBase<*>` |
| `ref` to `AssetWrapper` | `FluentBuilderBase<*>` (auto-wrapped) |
| `ref` to `Binding` | `Binding<*>` |
| `ref` to `Expression` | `TaggedValue<*>` |
| `or` (union) | `Any?` |

## Generated Output

### Example Input

```json
{
  "name": "TextAsset",
  "type": "object",
  "properties": {
    "value": {
      "required": true,
      "node": {
        "type": "string",
        "description": "The text to display"
      }
    }
  }
}
```

### Generated Output

```kotlin
package com.example.builders

import com.intuit.playertools.fluent.FluentDslMarker
import com.intuit.playertools.fluent.core.AssetWrapperBuilder
import com.intuit.playertools.fluent.core.BuildContext
import com.intuit.playertools.fluent.core.FluentBuilderBase
import com.intuit.playertools.fluent.tagged.Binding
import com.intuit.playertools.fluent.tagged.TaggedValue

@FluentDslMarker
class TextBuilder : FluentBuilderBase<Map<String, Any?>>() {
    override val defaults: Map<String, Any?> = mapOf("type" to "text")
    override val assetWrapperProperties: Set<String> = emptySet()
    override val arrayProperties: Set<String> = emptySet()

    /** Each asset requires a unique id per view */
    var id: String?
        get() = peek("id") as? String
        set(value) { set("id", value) }

    /** The text to display */
    var value: String?
        get() = peek("value") as? String
        set(value) { set("value", value) }

    fun value(binding: Binding<String>) { set("value", binding) }
    fun value(taggedValue: TaggedValue<String>) { set("value", taggedValue) }

    override fun build(context: BuildContext?) = buildWithDefaults(context)
    override fun clone() = TextBuilder().also { cloneStorageTo(it) }
}

fun text(init: TextBuilder.() -> Unit = {}) = TextBuilder().apply(init)
```

## Generated Features

### Property Types

| XLR Property | Generated Code |
|--------------|----------------|
| String | `var prop: String?` with binding/expression overloads |
| Number | `var prop: Number?` with binding/expression overloads |
| Boolean | `var prop: Boolean?` with binding/expression overloads |
| AssetWrapper ref | `var prop: FluentBuilderBase<*>?` with `fun prop(builder)` |
| Asset array | `var prop: List<FluentBuilderBase<*>>?` with `fun prop(vararg)` |
| Nested object | Nested config class with `fun prop(init: Config.() -> Unit)` |
| Binding ref | `var prop: Binding<*>?` |
| Expression ref | `var prop: TaggedValue<*>?` |

### Nested Objects

Nested objects generate separate config classes:

```kotlin
// Generated from metaData property
@FluentDslMarker
class ActionMetaDataConfig : FluentBuilderBase<Map<String, Any?>>() {
    override val defaults: Map<String, Any?> = emptyMap()

    var skipValidation: Boolean?
        get() = peek("skipValidation") as? Boolean
        set(value) { set("skipValidation", value) }

    var role: String?
        get() = peek("role") as? String
        set(value) { set("role", value) }

    override fun build(context: BuildContext?) = buildWithDefaults(context)
    override fun clone() = ActionMetaDataConfig().also { cloneStorageTo(it) }
}

// Usage
action {
    value = "submit"
    metaData {
        skipValidation = true
        role = "primary"
    }
}
```

### DSL Functions

Each builder generates a DSL function:

```kotlin
// Generated
fun action(init: ActionBuilder.() -> Unit = {}) = ActionBuilder().apply(init)

// Usage
val myAction = action {
    value = "submit"
    label { value = "Submit" }
}
```

## API Reference

### Generator

```kotlin
class Generator(config: GeneratorConfig) {
    fun generateFromFiles(files: List<File>): List<GeneratorResult>
    fun generateFromFile(file: File): GeneratorResult
    fun generateFromJson(jsonContent: String, sourceName: String): GeneratorResult
    fun generateFromDocument(document: XlrDocument): GeneratorResult
    fun generateCode(document: XlrDocument): String

    companion object {
        fun generateCode(jsonContent: String, packageName: String): String
        fun generateCode(document: XlrDocument, packageName: String): String
    }
}
```

### GeneratorConfig

```kotlin
data class GeneratorConfig(
    val packageName: String,
    val outputDir: File
)
```

### GeneratorResult

```kotlin
data class GeneratorResult(
    val className: String,
    val filePath: File,
    val code: String
)
```

## Development

### Build

```bash
bazel build //language/generators/kotlin:kotlin-dsl-generator
```

### Test

```bash
bazel test //language/generators/kotlin:kotlin-dsl-generator-test
```

### Lint

```bash
# Check
bazel test //language/generators/kotlin:ktlint

# Auto-fix
bazel run //language/generators/kotlin:ktlint_fix
```

## Project Structure

```
language/generators/kotlin/
├── src/main/kotlin/com/intuit/playertools/fluent/generator/
│   ├── Main.kt              # CLI entry point
│   ├── Generator.kt         # Main generator class
│   ├── ClassGenerator.kt    # Kotlin class generation
│   ├── CodeWriter.kt        # Code formatting utilities
│   ├── TypeMapper.kt        # XLR to Kotlin type mapping
│   └── xlr/
│       ├── XlrTypes.kt      # XLR type definitions
│       ├── XlrDeserializer.kt # JSON to XLR parsing
│       └── XlrGuards.kt     # Type guard utilities
├── src/test/kotlin/         # Tests
│   └── fixtures/            # Sample XLR JSON files
└── BUILD.bazel
```

## Dependencies

- `org.jetbrains.kotlin:kotlin-stdlib`
- `org.jetbrains.kotlinx:kotlinx-serialization-json`

## Runtime Dependencies

Generated code requires:

- `//language/dsl/kotlin:kotlin-dsl`
