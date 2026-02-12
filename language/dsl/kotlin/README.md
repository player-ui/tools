# Kotlin DSL for Player-UI

A Kotlin DSL library for building Player-UI content programmatically. This library provides type-safe builders that produce JSON-serializable output compatible with Player-UI.

## Installation

### Bazel

```starlark
deps = [
    "//language/dsl/kotlin:kotlin-dsl",
]
```

## Usage

### Building a Flow

```kotlin
import com.intuit.playertools.fluent.flow.flow
import com.intuit.playertools.fluent.mocks.builders.*
import com.intuit.playertools.fluent.tagged.binding

val content = flow {
    id = "registration-flow"
    views = listOf(
        collection {
            id = "form"
            label { value = "User Registration" }
            values(
                input {
                    binding("user.firstName")
                    label { value = "First Name" }
                },
                input {
                    binding("user.lastName")
                    label { value = "Last Name" }
                }
            )
            actions(
                action {
                    value = "submit"
                    label { value = "Register" }
                }
            )
        }
    )
    data = mapOf(
        "user" to mapOf(
            "firstName" to "",
            "lastName" to ""
        )
    )
    navigation = mapOf(
        "BEGIN" to "FLOW_1",
        "FLOW_1" to mapOf(
            "startState" to "VIEW_form",
            "VIEW_form" to mapOf(
                "state_type" to "VIEW",
                "ref" to "form",
                "transitions" to mapOf("submit" to "END_Done")
            ),
            "END_Done" to mapOf(
                "state_type" to "END",
                "outcome" to "done"
            )
        )
    )
}
```

### Building Individual Assets

```kotlin
import com.intuit.playertools.fluent.mocks.builders.*
import com.intuit.playertools.fluent.tagged.binding
import com.intuit.playertools.fluent.tagged.expression

// Text asset
val textAsset = text {
    value = "Hello World"
}.build()

// Text with binding
val boundText = text {
    value(binding<String>("user.displayName"))
}.build()

// Input asset
val inputAsset = input {
    binding("user.email")
    label { value = "Email Address" }
    placeholder = "Enter your email"
}.build()

// Action asset
val actionAsset = action {
    value = "submit"
    label { value = "Submit" }
    exp = expression<Any>("submitForm()")
}.build()

// Collection asset
val collectionAsset = collection {
    label { value = "Form Section" }
    values(
        text { value = "Item 1" },
        text { value = "Item 2" }
    )
}.build()
```

### Bindings and Expressions

Bindings reference paths in the Player-UI data model:

```kotlin
import com.intuit.playertools.fluent.tagged.binding

// Simple binding - produces "{{user.name}}"
val nameBinding = binding<String>("user.name")

// Nested binding - produces "{{user.address.city}}"
val cityBinding = binding<String>("user.address.city")

// Template binding with index - produces "{{items._index_.value}}"
val templateBinding = binding<String>("items._index_.value")
```

Expressions are evaluated at runtime:

```kotlin
import com.intuit.playertools.fluent.tagged.expression

// Boolean expression - produces "@[user.age >= 18]@"
val isAdult = expression<Boolean>("user.age >= 18")

// Function call - produces "@[navigate('home')]@"
val navExpr = expression<Any>("navigate('home')")
```

### Conditional Building

```kotlin
val showValidation = true
val isPrimary = false

val builder = input {
    binding("user.email")
}

// Set property conditionally
builder.setIf({ showValidation }, "validation", mapOf("required" to true))

// Set one of two values based on condition
builder.setIfElse(
    { isPrimary },
    "metaData",
    mapOf("role" to "primary"),
    mapOf("role" to "secondary")
)
```

### Templates

Templates generate dynamic lists from data:

```kotlin
collection {
    id = "user-list"
    label { value = "Users" }
    template(
        data = binding<List<Any>>("users"),
        output = "values",
        dynamic = true
    ) {
        text { value(binding<String>("users._index_.name")) }
    }
}
```

### Switches

Switches select assets based on conditions:

```kotlin
collection {
    id = "i18n-content"
    switch(
        path = listOf("label"),
        isDynamic = false
    ) {
        case(expression<Boolean>("locale === 'es'"), text { value = "Hola" })
        case(expression<Boolean>("locale === 'fr'"), text { value = "Bonjour" })
        default(text { value = "Hello" })
    }
}
```

## API Reference

### Core Classes

| Class | Description |
|-------|-------------|
| `FluentBuilder<T>` | Base interface for all builders |
| `FluentBuilderBase<T>` | Abstract base class with property storage and build pipeline |
| `FlowBuilder` | Builder for Player-UI Flow content |
| `BuildContext` | Context for ID generation and nesting |

### Tagged Values

| Class | Format | Description |
|-------|--------|-------------|
| `Binding<T>` | `{{path}}` | Reference to data model path |
| `Expression<T>` | `@[expr]@` | Runtime expression |

### Builder Properties

Builders support these property types:

| Property Type | Description |
|---------------|-------------|
| `defaults` | Default values (e.g., `{"type": "text"}`) |
| `assetWrapperProperties` | Properties wrapped in `{asset: ...}` format |
| `arrayProperties` | Array properties for proper merging |

### Build Pipeline

The build process executes these steps:

1. Resolve static values (TaggedValue → string)
2. Generate asset ID from context
3. Create nested context for children
4. Resolve asset wrapper properties
5. Resolve mixed arrays
6. Resolve nested builders
7. Resolve switches
8. Resolve templates

## Output Format

The DSL produces JSON-serializable `Map<String, Any?>` objects:

```json
{
  "id": "registration-flow",
  "views": [
    {
      "id": "form",
      "type": "collection",
      "label": {
        "asset": {
          "id": "form-label",
          "type": "text",
          "value": "User Registration"
        }
      },
      "values": [
        {
          "id": "form-0",
          "type": "input",
          "binding": "{{user.firstName}}",
          "label": {
            "asset": {
              "id": "form-0-label",
              "type": "text",
              "value": "First Name"
            }
          }
        }
      ]
    }
  ],
  "navigation": { ... },
  "data": { ... }
}
```

## Development

### Build

```bash
bazel build //language/dsl/kotlin:kotlin-dsl
```

### Test

```bash
bazel test //language/dsl/kotlin:kotlin-dsl-test
```

### Lint

```bash
# Check
bazel test //language/dsl/kotlin:ktlint

# Auto-fix
bazel run //language/dsl/kotlin:ktlint_fix
```

## Project Structure

```
language/dsl/kotlin/
├── src/main/kotlin/com/intuit/playertools/fluent/
│   ├── core/
│   │   ├── FluentBuilder.kt      # Base builder interface and class
│   │   ├── BuildContext.kt       # Build context for ID generation
│   │   ├── BuildPipeline.kt      # Build pipeline execution
│   │   ├── ValueStorage.kt       # Property value storage
│   │   └── AuxiliaryStorage.kt   # Template/switch storage
│   ├── tagged/
│   │   ├── TaggedValue.kt        # Binding and Expression types
│   │   └── StandardExpressions.kt
│   ├── flow/
│   │   └── Flow.kt               # Flow builder
│   ├── id/
│   │   ├── IdGenerator.kt        # ID generation logic
│   │   └── IdRegistry.kt         # Global ID registry
│   └── mocks/builders/           # Sample asset builders
└── src/test/kotlin/              # Tests
```

## Dependencies

- `org.jetbrains.kotlin:kotlin-stdlib`
- `org.jetbrains.kotlinx:kotlinx-serialization-json`
