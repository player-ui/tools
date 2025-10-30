# @player-tools/fluent

A lightweight, type-safe DSL for building Player-UI content programmatically. Built for performance-critical scenarios where content is generated at runtime.

## Table of Contents

- [Why Fluent?](#why-fluent)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Your First Flow](#your-first-flow)
- [Core Concepts](#core-concepts)
  - [Function-Based Builders](#function-based-builders)
  - [Dynamic Bindings and Expressions](#dynamic-bindings-and-expressions)
  - [Automatic ID Management](#automatic-id-management)
  - [Context-Aware Composition](#context-aware-composition)
- [Generating Custom Builders](#generating-custom-builders)
  - [Setup](#setup)
  - [Using Generated Builders](#using-generated-builders)
  - [Plugin Features](#plugin-features)
- [Working with Data](#working-with-data)
  - [Type-Safe Bindings from Schema](#type-safe-bindings-from-schema)
  - [Expression Helpers](#expression-helpers)
- [Managing IDs](#managing-ids)
  - [Automatic Generation](#automatic-generation)
  - [Collision Prevention](#collision-prevention)
  - [Manual Context Control](#manual-context-control)
- [Player Switches](#player-switches)
  - [Basic Switch with Collections](#basic-switch-with-collections)
  - [Understanding Switch Paths](#understanding-switch-paths)
  - [Multiple Switches in a Collection](#multiple-switches-in-a-collection)
  - [Static vs Dynamic Switches](#static-vs-dynamic-switches)
  - [Case Expressions](#case-expressions)
  - [Real-World Example: Conditional Form Fields](#real-world-example-conditional-form-fields)
- [Conditional Building](#conditional-building)
  - [The if() Method](#the-if-method)
  - [The ifElse() Method](#the-ifelse-method)
  - [Predicate Functions](#predicate-functions)
  - [Conditional Asset Builders](#conditional-asset-builders)
  - [Conditional Arrays](#conditional-arrays)
  - [Chaining Conditionals](#chaining-conditionals)
  - [Toggle Between Asset Types](#toggle-between-asset-types)
  - [Lazy Evaluation](#lazy-evaluation)
  - [Real-World Example: Wizard Step Navigation](#real-world-example-wizard-step-navigation)
  - [When to Use Conditional Building vs Switches](#when-to-use-conditional-building-vs-switches)
- [Templates](#templates)
  - [Basic Template with Collections](#basic-template-with-collections)
  - [The _index_ Placeholder](#the-_index_-placeholder)
  - [Templates with Complex Assets](#templates-with-complex-assets)
  - [Mixing Static and Dynamic Items](#mixing-static-and-dynamic-items)
  - [Static vs Dynamic Templates](#static-vs-dynamic-templates)
  - [Template Data Sources](#template-data-sources)
  - [Nested Templates](#nested-templates)
  - [Value Functions](#value-functions)
  - [Real-World Example: Dynamic Form Fields](#real-world-example-dynamic-form-fields-1)
- [API Reference](#api-reference)
  - [Flow Creation](#flow-creation)
  - [Core Exports](#core-exports)
  - [Builder Pattern](#builder-pattern)
- [Configuration](#configuration)
  - [Custom Naming Strategies](#custom-naming-strategies)
- [Best Practices](#best-practices)

## Why Fluent?

**Fast by Design** — Function-based architecture designed for performance-critical scenarios like runtime content generation, serverless environments, and edge computing.

**Zero Dependencies** — No React, no JSX compilation. Just pure TypeScript functions that generate Player-UI assets.

**Fully Typed** — Complete TypeScript support with intelligent autocomplete for your custom asset types.

**Developer Friendly** — Intuitive fluent API that feels natural to write and easy to read.

## Quick Start

### Installation

```bash
pnpm add @player-tools/fluent
```

### Your First Flow

```typescript
import { flow, binding as b, expression as e } from "@player-tools/fluent";
import { text, info, action } from "./generated-builders";

// Create a simple welcome flow
const welcomeFlow = flow({
  id: "welcome",
  views: [
    info()
      .withTitle(text().withValue("Welcome!"))
      .withPrimaryInfo(text().withValue(b`user.name`))
      .withActions([
        action()
          .withLabel(text().withValue("Get Started"))
          .withExpression(e`navigate('dashboard')`),
      ]),
  ],
  data: {
    user: { name: "Player Developer" },
  },
  navigation: {
    BEGIN: "FLOW_1",
    FLOW_1: {
      startState: "VIEW_1",
      VIEW_1: {
        state_type: "VIEW",
        ref: "info",
        transitions: { "*": "END" },
      },
    },
  },
});
```

## Core Concepts

### Function-Based Builders

Every component is a simple function that returns a Player-UI asset. No reconciliation, no virtual DOM — just data.

```typescript
const greeting = text()
  .withValue(b`user.name`)
  .build();

// Result: { id: "text", type: "text", value: "{{user.name}}" }
```

### Dynamic Bindings and Expressions

Use tagged templates for type-safe data bindings and expressions:

```typescript
import { binding as b, expression as e } from "@player-tools/fluent";

// Data binding
const userName = text().withValue(b<string>`user.profile.name`);

// Expression evaluation
const itemCount = text().withValue(e<number>`cart.items.length`);

// Conditional expression
const isEligible = e<boolean>`user.age >= 18 && user.verified`;
```

### Automatic ID Management

IDs are generated hierarchically, so you don't have to manage them manually:

```typescript
collection()
  .withLabel(text().withValue("Form")) // ID: "collection-label"
  .withValues([
    input().withBinding(b`email`), // ID: "collection-values-0"
    input().withBinding(b`phone`), // ID: "collection-values-1"
  ]);
```

Override IDs when needed:

```typescript
text().withId("custom-id").withValue("Content");
```

### Context-Aware Composition

Parent-child relationships are maintained automatically through context propagation, enabling deep nesting without manual wiring.

## Generating Custom Builders

Fluent comes with a code generator that creates type-safe builders for your custom Player-UI assets.

### Setup

1. **Initialize the generator**

```bash
npx fluent-gen-ts init
```

2. **Configure the plugin**

Update your `.fluentgenrc.json`:

```json
{
  "generator": {
    "customCommonFilePath": "./src/custom.ts"
  }
}
```

3. **Create the common file**

Create `src/custom.ts`:

```typescript
export * from "@player-tools/fluent";
```

4. **Generate builders**

```bash
pnpm fluent-gen-ts batch
```

### Using Generated Builders

Once generated, you should be able to leverage your builders like that:

```typescript
import { customCard } from "./builders/customCard.builder";
import { text, binding as b } from "@player-tools/fluent";

const card = customCard()
  .withHeader(text().withValue(b`product.name`))
  .withDescription(text().withValue(b`product.description`))
  .withPrice(b`product.price`);
```

### Plugin Features

The `@player-tools/fluent/plugin` enhances your generated builders:

**AssetWrapper Handling** — Automatically wraps nested assets, so you can pass `text()` directly instead of wrapping it manually.

**TaggedTemplateValue Support** — Primitive types (string, number, boolean) accept both static values and dynamic bindings/expressions.

**Nested Object Enhancement** — Transformations apply recursively to nested properties.

Example:

```typescript
// Your type definition
interface Alert {
  title: string;
  count: number;
  content: AssetWrapper<Asset>;
}

// Generated builder
alert()
  .withTitle(b`message.title`) // Data binding
  .withCount(42) // Static value
  .withContent(text().withValue("Details")); // Asset auto-wrapped
```

## Working with Data

### Type-Safe Bindings from Schema

Generate type-safe bindings from your data schema to avoid typos:

```typescript
import type { Schema } from "@player-ui/types";
import { extractBindingsFromSchema } from "@player-tools/fluent";

const schema = {
  ROOT: {
    user: { type: "UserType" },
    cart: { type: "CartType" },
  },
  UserType: {
    name: { type: "StringType" },
    email: { type: "StringType" },
  },
  CartType: {
    items: { type: "ArrayType" },
    total: { type: "NumberType" },
  },
} as const satisfies Schema.Schema;

const data = extractBindingsFromSchema(schema);

// TypeScript knows these paths exist
text().withValue(data.user.name); // "{{user.name}}"
text().withValue(data.cart.total); // "{{cart.total}}"
```

### Expression Helpers

Build complex expressions with type-safe helper functions:

```typescript
import { and, or, greaterThan, lessThan, equal } from "@player-tools/fluent";

const isEligible = and(
  greaterThan(data.user.age, data.settings.minAge),
  equal(data.user.verified, true),
);

const needsDiscount = or(
  equal(data.user.membership, "premium"),
  greaterThan(data.cart.total, 100),
);
```

## Managing IDs

### Automatic Generation

IDs follow a hierarchical pattern based on parent-child relationships:

```typescript
info()
  .withTitle(text().withValue("Title")) // ID: "info-title"
  .withActions([
    action().withLabel(text().withValue("OK")), // ID: "info-actions-0"
  ]);
```

### Collision Prevention

The global registry prevents ID collisions automatically:

```typescript
import { globalIdRegistry } from "@player-tools/fluent";

text().withValue("First"); // ID: "text"
text().withValue("Second"); // ID: "text-1"
text().withValue("Third"); // ID: "text-2"

// Reset between flows
globalIdRegistry.reset();
```

### Manual Context Control

For advanced scenarios, create contexts explicitly:

```typescript
import {
  createNestedContext,
  createTemplateContext,
  createSwitchContext,
} from "@player-tools/fluent";

const parentCtx = { parentId: "form" };
const childCtx = createNestedContext({
  parentContext: parentCtx,
  parameterName: "fields",
  index: 0,
});

const field = input().withBinding(b`email`);
const asset = field.build(childCtx);
```

## Player Switches

Switches enable conditional rendering of assets based on runtime data or expressions. They're particularly powerful when working with nested assets in collections, where you can conditionally replace specific items based on user state, permissions, or other dynamic conditions.

### Basic Switch with Collections

Replace a specific item in a collection's values array with a switch:

```typescript
import { collection, text, input, expression as e, binding as b } from "@player-tools/fluent";

const form = collection()
  .withLabel(text().withValue("User Form"))
  .withValues([
    input().withBinding(b`user.name`),
    input().withBinding(b`user.email`),
    input().withBinding(b`user.phone`),
  ])
  .switch(["values", 1], {
    // Replace the email field (index 1)
    cases: [
      {
        case: e`user.isVerified`,
        asset: text().withValue(b`user.email`), // Show as text if verified
      },
      {
        case: true,
        asset: input().withBinding(b`user.email`), // Show as input if not verified
      },
    ],
  });

// Result: Second item in values array is now a switch
```

### Understanding Switch Paths

The first argument to `.switch()` is a path array that identifies where to inject the switch:

```typescript
// Replace a top-level property
.switch(["title"], { ... })  // Replaces the 'title' property

// Replace an array element
.switch(["values", 0], { ... })  // Replaces first item in 'values' array
.switch(["values", 2], { ... })  // Replaces third item in 'values' array

// Replace nested properties
.switch(["config", "header", "label"], { ... })  // Replaces config.header.label
```

### Multiple Switches in a Collection

Target different positions to create complex conditional layouts:

```typescript
collection()
  .withValues([
    text().withValue("Header"),
    input().withBinding(b`field1`),
    input().withBinding(b`field2`),
    text().withValue("Footer"),
  ])
  .switch(["values", 0], {
    // Conditional header
    cases: [
      { case: e`user.isPremium`, asset: text().withValue("Premium User") },
      { case: true, asset: text().withValue("Standard User") },
    ],
  })
  .switch(["values", 2], {
    // Conditional second field
    cases: [
      { case: e`user.role === 'admin'`, asset: input().withBinding(b`adminField`) },
      { case: true, asset: input().withBinding(b`regularField`) },
    ],
  });
```

### Static vs Dynamic Switches

**Static Switches** (default) — Evaluated once when the view loads:

```typescript
collection()
  .withValues([
    text().withValue("Item 1"),
    text().withValue("Item 2"),
  ])
  .switch(["values", 1], {
    cases: [
      { case: e`user.hasAccess`, asset: text().withValue("Accessible") },
      { case: true, asset: text().withValue("Restricted") },
    ],
  });
```

**Dynamic Switches** — Re-evaluated whenever data changes:

```typescript
collection()
  .withValues([
    text().withValue("Cart Status"),
  ])
  .switch(["values", 0], {
    isDynamic: true,  // Re-evaluates on data changes
    cases: [
      { case: e`cart.items.length > 0`, asset: text().withValue(b`cart.items.length items`) },
      { case: true, asset: text().withValue("Empty cart") },
    ],
  });
```

### Case Expressions

Switches support multiple expression types:

```typescript
// Expression tagged template (recommended)
{ case: e`user.age >= 18`, asset: text().withValue("Adult Content") }

// String expressions
{ case: "{{user.verified}} === true", asset: input().withBinding(b`sensitiveData`) }

// Boolean literals (for default/fallback cases)
{ case: true, asset: text().withValue("Default") }
```

### Real-World Example: Conditional Form Fields

```typescript
const registrationForm = collection()
  .withLabel(text().withValue("Registration"))
  .withValues([
    input().withBinding(b`user.email`),
    input().withBinding(b`user.password`),
    input().withBinding(b`user.country`),
    input().withBinding(b`user.state`),
  ])
  .switch(["values", 3], {
    // Show state field only for US users
    cases: [
      {
        case: e`user.country === 'US'`,
        asset: input().withBinding(b`user.state`),
      },
      {
        case: true,
        asset: input().withBinding(b`user.province`),
      },
    ],
  });
```

## Conditional Building

The Fluent DSL provides powerful conditional methods that let you set properties based on runtime conditions during the build phase. Unlike switches (which create runtime conditional rendering), these methods determine asset structure at build time.

### The `if()` Method

Conditionally set a property only when a predicate evaluates to true:

```typescript
const requiresValidation = true;

const submitButton = action()
  .withValue("submit")
  .withLabel(text().withValue("Submit"))
  .if(() => requiresValidation, "validate", ["{{user.email}}", "{{user.password}}"]);

// Only includes 'validate' property if requiresValidation is true
```

### The `ifElse()` Method

Choose between two values based on a condition:

```typescript
const isPrimary = true;

const button = action()
  .withLabel(text().withValue("Action"))
  .ifElse(() => isPrimary, "value", "submit", "cancel")
  .ifElse(
    () => isPrimary,
    "metaData",
    { role: "primary", size: "large" },
    { role: "secondary", size: "medium" }
  );

// Sets value="submit" and metaData with primary style
```

### Predicate Functions

Predicates can be simple closures or can access the builder's current state:

```typescript
// Simple closure
.if(() => showOptionalField, "placeholder", "Enter value")

// Access builder state
.if((builder) => builder.has("value"), "metaData", { configured: true })

// External variable
const userRole = "admin";
.if(() => userRole === "admin", "adminTools", [...])
```

### Conditional Asset Builders

The `if()` and `ifElse()` methods automatically wrap asset builders in the correct format:

```typescript
const includeLabel = true;

const button = action()
  .withValue("submit")
  .if(() => includeLabel, "label", text().withValue("Submit"));

// text() builder is automatically wrapped in { asset: ... } format
```

### Conditional Arrays

Build conditional arrays of assets:

```typescript
const hasItems = true;

const list = collection()
  .withLabel(text().withValue("Items"))
  .if(() => hasItems, "values", [
    text().withValue("Item 1"),
    text().withValue("Item 2"),
    text().withValue("Item 3"),
  ]);

// All text() builders in the array are automatically wrapped
```

### Chaining Conditionals

Chain multiple conditional calls for complex logic:

```typescript
const form = collection()
  .withLabel(text().withValue("Form"))
  .withValues([...])
  .if(() => config.showHelp, "help", text().withValue("Fill out all fields"))
  .if(() => config.showFooter, "footer", text().withValue("Required fields *"))
  .if(() => config.enableValidation, "validation", { required: true });
```

### Toggle Between Asset Types

Use `ifElse()` to conditionally select between different asset builders:

```typescript
const isActive = true;

const button = action()
  .withValue("toggle")
  .ifElse(
    () => isActive,
    "label",
    text().withValue("Deactivate"),  // Shown when active
    text().withValue("Activate")     // Shown when inactive
  );
```

### Lazy Evaluation

Pass functions that return values for lazy evaluation:

```typescript
const useCustomLabel = true;

const button = action()
  .withValue("submit")
  .if(
    () => useCustomLabel,
    "label",
    () => text().withValue("Custom Submit")  // Only evaluated if predicate is true
  );
```

### Real-World Example: Wizard Step Navigation

```typescript
const currentStep = 2;
const totalSteps = 3;

const stepForm = collection()
  .withLabel(text().withValue(`Step ${currentStep} of ${totalSteps}`))
  .withValues([...])
  .withActions([
    action()
      .withValue("back")
      .withLabel(text().withValue("Back"))
      .if(() => currentStep > 1, "metaData", { disabled: false })  // Enable back on later steps
      .if(() => currentStep === 1, "metaData", { disabled: true }), // Disable on first step

    action()
      .ifElse(() => currentStep < totalSteps, "value", "next", "submit")  // Change button action
      .ifElse(
        () => currentStep < totalSteps,
        "label",
        text().withValue("Next"),
        text().withValue("Submit")
      )
      .withMetaData({ role: "primary" }),
  ]);
```

### When to Use Conditional Building vs Switches

**Use Conditional Building (`if`/`ifElse`)** when:
- The condition is known at build time (during flow creation)
- You want to change asset structure based on configuration or feature flags
- The decision is based on server-side data or build-time variables

**Use Switches** when:
- The condition depends on runtime data model values
- You need the UI to react to user interactions or data changes
- The decision should be made by Player at render time

## Templates

Templates enable you to generate repeating assets by iterating over arrays in your data model. They're essential for building dynamic lists, grids, and collections where the number of items isn't known at build time.

### Basic Template with Collections

Generate collection items from an array in your data model:

```typescript
import { collection, text, template, binding as b } from "@player-tools/fluent";

const userList = collection()
  .withLabel(text().withValue("Users"))
  .withValues([
    template({
      data: "users",           // Array to iterate over
      output: "values",        // Property to populate (collection's values)
      value: text().withValue(b`users._index_.name`),  // Asset for each item
    }),
  ]);

// If users = [{name: "Alice"}, {name: "Bob"}]
// Generates: values: [
//   { asset: { type: "text", value: "{{users.0.name}}" } },
//   { asset: { type: "text", value: "{{users.1.name}}" } }
// ]
```

### The `_index_` Placeholder

Templates use `_index_` as a placeholder that gets replaced with the actual array index:

```typescript
template({
  data: "products",
  output: "items",
  value: text().withValue(b`products._index_.title`),
})

// Runtime behavior:
// products[0] -> "{{products.0.title}}"
// products[1] -> "{{products.1.title}}"
// products[2] -> "{{products.2.title}}"
```

IDs also use `_index_` for uniqueness:

```typescript
// Generated ID pattern: "parent-_index_-text"
// At runtime becomes: "parent-0-text", "parent-1-text", etc.
```

### Templates with Complex Assets

Create rich, nested assets for each iteration:

```typescript
const productGrid = collection()
  .withLabel(text().withValue("Products"))
  .withValues([
    template({
      data: "products",
      output: "values",
      value: collection()
        .withLabel(text().withValue(b`products._index_.name`))
        .withValues([
          text().withValue(b`products._index_.description`),
          text().withValue(b`products._index_.price`),
          action()
            .withLabel(text().withValue("Add to Cart"))
            .withExpression(e`addToCart(products._index_.id)`),
        ]),
    }),
  ]);
```

### Mixing Static and Dynamic Items

Combine templates with static items in the same collection:

```typescript
collection()
  .withValues([
    text().withValue("Header (static)"),
    template({
      data: "items",
      output: "values",
      value: text().withValue(b`items._index_.name`),
    }),
    text().withValue("Footer (static)"),
  ]);

// Results in: [header, ...generated items..., footer]
```

### Static vs Dynamic Templates

**Static Templates** (default) — Generated once at view creation:

```typescript
template({
  data: "initialList",
  output: "items",
  value: text().withValue(b`initialList._index_`),
})
```

**Dynamic Templates** — Regenerate when the source array changes:

```typescript
template({
  data: "cart.items",
  output: "cartItems",
  dynamic: true,  // Updates when cart.items changes
  value: text().withValue(b`cart.items._index_.name`),
})
```

### Template Data Sources

Templates accept both string paths and tagged template bindings:

```typescript
// String path (static reference)
template({
  data: "users.active",
  output: "values",
  value: text().withValue(b`users.active._index_.name`),
})

// Tagged template binding (dynamic reference)
template({
  data: b`currentList`,
  output: "values",
  value: text().withValue(b`currentList._index_.name`),
})
```

### Nested Templates

Handle multi-dimensional data with nested templates:

```typescript
collection()
  .withValues([
    template({
      data: "categories",
      output: "values",
      value: collection()
        .withLabel(text().withValue(b`categories._index_.name`))
        .withValues([
          template({
            data: b`categories._index_.items`,
            output: "values",
            value: text().withValue(b`categories._index_.items._index1_.title`),
          }),
        ]),
    }),
  ]);

// Note: Nested templates use _index1_, _index2_, etc. for each depth level
```

### Value Functions

For advanced control, use a function that receives the build context:

```typescript
import { BaseBuildContext } from "@player-tools/fluent";

template({
  data: "users",
  output: "values",
  value: (ctx: BaseBuildContext) => {
    return {
      id: `user-card-${ctx.parentId}`,
      type: "custom-card",
      title: "{{users._index_.name}}",
      subtitle: "{{users._index_.email}}",
      metadata: {
        createdAt: "{{users._index_.createdAt}}",
      },
    };
  },
})
```

### Real-World Example: Dynamic Form Fields

```typescript
const dynamicForm = collection()
  .withLabel(text().withValue("Survey"))
  .withValues([
    text().withValue("Please answer the following questions:"),
    template({
      data: "survey.questions",
      output: "values",
      dynamic: true,  // Updates if questions change
      value: collection()
        .withLabel(text().withValue(b`survey.questions._index_.text`))
        .withValues([
          input().withBinding(b`survey.responses[_index_]`),
        ]),
    }),
    action()
      .withLabel(text().withValue("Submit"))
      .withExpression(e`submitSurvey()`),
  ]);
```

## API Reference

### Flow Creation

```typescript
flow({
  id: string, // Optional, defaults to "root"
  views: Array<Builder>, // View builders or assets
  data: object, // Initial data model
  schema: object, // Optional data validation schema
  navigation: object, // State machine definition
  context: object, // Optional additional context
});
```

### Core Exports

```typescript
// Data binding and expressions
import { binding, expression } from "@player-tools/fluent";

// Flow creation
import { flow } from "@player-tools/fluent";

// Context helpers
import {
  createNestedContext,
  createTemplateContext,
  createSwitchContext,
} from "@player-tools/fluent";

// ID management
import { globalIdRegistry } from "@player-tools/fluent";

// Schema utilities
import { extractBindingsFromSchema } from "@player-tools/fluent";

// Base builder class (for custom builders)
import { FluentBuilderBase } from "@player-tools/fluent";
```

### Builder Pattern

All generated builders follow this pattern:

```typescript
builder()
  .withProperty(value) // Set property
  .build(context?); // Generate asset
```

Chain multiple properties:

```typescript
text()
  .withId("greeting")
  .withValue(b`user.name`)
  .withModifiers([{ type: "bold" }]);
```

## Configuration

### Custom Naming Strategies

Control how generated builders are named:

```javascript
// .fluentgenrc.json
{
  "generator": {
    "naming": {
      "convention": "kebab-case", // 'camelCase', 'snake_case', 'PascalCase'
      "transform": "(name) => name.replace(/Asset$/, '')"
    }
  }
}
```

## Best Practices

**Reset IDs Between Flows** — Call `globalIdRegistry.reset()` when creating multiple independent flows to avoid ID collisions.

**Use Schema Bindings** — Generate bindings from your schema to catch typos at compile time.

**Leverage Type Inference** — Let TypeScript infer types from your schema and builders whenever possible.

**Keep Builders Pure** — Builders should not have side effects. They're just functions that return data.

**Extract Common Patterns** — Create helper functions for frequently used builder combinations.

---

**Part of the [Player-UI](https://github.com/player-ui/player) ecosystem** — A cross-platform UI framework for building consistent experiences across platforms.
