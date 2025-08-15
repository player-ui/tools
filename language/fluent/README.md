# @player-tools/fluent

A high-performance, function-based fluent DSL for creating Player-UI content with **31-63x performance improvements** over React-based approaches. This package provides a dependency-free, type-safe API for authoring dynamic content while maintaining full TypeScript support and excellent developer experience.

## Table of Contents

- [Overview](#overview)
- [Performance Benefits](#performance-benefits)
- [Quick Start](#quick-start)
- [Core Architecture](#core-architecture)
- [API Reference](#api-reference)
  - [Flow Creation](#flow-creation)
  - [Asset Builders](#asset-builders)
  - [Tagged Templates](#tagged-templates)
  - [ID Generation](#id-generation)
- [Directory Structure](#directory-structure)
- [Examples](#examples)
- [Advanced Features](#advanced-features)
- [Contributing](#contributing)
- [Migration Guide](#migration-guide)

## Overview

`@player-tools/fluent` is the core library for fluent builders in the Player-UI ecosystem. It represents a fundamental architectural shift from React-based DSL compilation to a lightweight, function-based approach that delivers exceptional performance while preserving the developer experience you love.

### Why Fluent DSL?

- **🚀 Blazing Fast**: 31-63x faster than React DSL compilation
- **💪 Zero Dependencies**: No React overhead, smaller bundle sizes
- **🎯 Type Safe**: Full TypeScript support with IDE autocompletion
- **🔧 Developer Friendly**: Familiar fluent API patterns
- **⚡ Edge Ready**: Perfect for WebAssembly and edge computing
- **🏗️ Composable**: Natural functional composition patterns

## Performance Benefits

Our benchmarking demonstrates dramatic performance improvements across content sizes:

| Content Size | Functional DSL | React DSL | Improvement    |
| ------------ | -------------- | --------- | -------------- |
| Small        | 0.031ms        | 0.963ms   | **31x faster** |
| Medium       | 0.074ms        | 3.573ms   | **48x faster** |
| Large        | 0.136ms        | 8.638ms   | **63x faster** |

This translates to real business impact:

- **Reduced Infrastructure Costs**: 70% reduction in compute requirements
- **Better User Experience**: Sub-50ms content generation
- **Higher Throughput**: Scale from 5 RPS to 50+ RPS on equivalent hardware

## Quick Start

### Installation

```bash
pnpm i @player-tools/fluent
```

### Basic Usage

```typescript
import { binding as b, expression as e } from "@player-tools/fluent";
import { action, info, text } from "./examples";

// Create dynamic text with type-safe bindings
const welcomeText = text().withValue(b<string>`user.name`);

// Build an info view with actions
const welcomeView = info()
  .withId("welcome-view")
  .withTitle(text().withValue("Welcome!"))
  .withPrimaryInfo(welcomeText)
  .withActions([
    action()
      .withLabel(text().withValue("Get Started"))
      .withExpression(e`navigate('next')`),
  ]);

// Create a complete flow
const myFlow = flow({
  id: "welcome-flow",
  views: [welcomeView],
  data: {
    user: { name: "Player Developer" },
  },
  navigation: {
    BEGIN: "FLOW_1",
    FLOW_1: {
      startState: "VIEW_1",
      VIEW_1: {
        state_type: "VIEW",
        ref: "welcome-view",
        transitions: {
          next: "END",
        },
      },
    },
  },
});
```

## Core Architecture

The fluent DSL is built on four foundational concepts:

### 1. **Function-Based Builders**

Every component is a function that returns Player-UI assets. No React reconciliation overhead.

### 2. **Automatic ID Generation**

Hierarchical IDs are generated automatically based on parent context, eliminating manual ID management.

### 3. **Type-Safe Templates**

Tagged templates with phantom types provide compile-time type checking for bindings and expressions.

### 4. **Context-Aware Composition**

Parent-child relationships are automatically maintained through context propagation.

## API Reference

### Flow Creation

The `flow` function creates complete Player-UI flows with automatic view processing:

```typescript
import { flow } from "@player-tools/fluent";

const myFlow = flow({
  id: "my-flow", // Optional, defaults to "root"
  views: [
    /* views */
  ], // Array of view builders or assets
  data: {
    /* data */
  }, // Initial data model
  schema: {
    /* schema */
  }, // Data validation schema
  navigation: {
    /* nav */
  }, // State machine navigation
  context: {
    /* ctx */
  }, // Additional context
});
```

### Asset Builders

Asset builders follow a consistent fluent pattern:

```typescript
// Text assets
const myText = text()
  .withId("custom-id") // Optional custom ID
  .withValue(b`user.greeting`) // Dynamic binding
  .withModifiers([{ type: "tag", name: "important" }]); // Text styling
```

### Marking Custom Builders

When creating custom builder functions, you must mark them using the `markAsBuilder` utility so the system can identify them as fluent builders:

```typescript
import { markAsBuilder } from "@player-tools/fluent";

// Create a custom builder function
function customTextBuilder() {
  return (ctx) => ({
    type: "text",
    id: ctx.generateId("custom-text"),
    value: "Custom content",
  });
}

// Mark the builder so the system can identify it
const customText = markAsBuilder(customTextBuilder());

// Now it can be used in fluent compositions
const view = info()
  .withTitle(text().withValue("Title"))
  .withPrimaryInfo(customText); // ✅ Works correctly
```

**Why is marking required?** The fluent DSL system uses runtime type guards to distinguish between builder functions and regular functions. Without marking, custom builders won't be recognized by the system and may cause runtime errors or unexpected behavior.

**When to mark builders:**

- Creating custom builder functions from scratch
- Wrapping existing functions to make them compatible with the fluent DSL
- Building utility functions that return builder functions

### Schema-Driven Development

Avoid typos and leverage Typescript type system:

```typescript
import {
  extractBindingsFromSchema,
  and,
  greaterThan,
  equal,
} from "@player-tools/fluent";

const userSchema = {
  ROOT: {
    user: { type: "UserType" },
    settings: { type: "SettingsType" },
  },
  UserType: {
    name: { type: "StringType" },
    age: { type: "NumberType" },
    role: { type: "StringType" },
  },
  SettingsType: {
    minAge: { type: "NumberType" },
    adminRole: { type: "StringType" },
  },
} as const satisfies Schema.Schema;

const data = extractBindingsFromSchema(userSchema);

// Create complex type-safe expressions
const isAuthorizedAdmin = and(
  greaterThan(data.user.age, data.settings.minAge),
  equal(data.user.role, data.settings.adminRole)
);

console.log(isAuthorizedAdmin.toString());
// "{{data.user.age > data.settings.minAge && data.user.role == data.settings.adminRole}}"
```

### ID Generation

Automatic hierarchical ID generation eliminates manual ID management:

```typescript
// IDs are automatically generated based on context
const form = collection()
  .withLabel(text().withValue("User Form")) // ID: "collection.label"
  .withValues([
    input().withBinding(b`user.name`), // ID: "collection.values-0"
    input().withBinding(b`user.email`), // ID: "collection.values-1"
  ]);

// Custom IDs override automatic generation
const customText = text().withId("my-custom-id").withValue("Custom content");
```

## Directory Structure

The `@player-tools/fluent` package is organized into focused modules:

```
src/
├── asset-wrapper/          # Asset wrapping with automatic ID generation
├── examples/               # Example builders and usage patterns
│   ├── builder/            # Fluent builders (text, action, input, etc.)
│   └── types/              # TypeScript definitions for assets
├── flow/                   # Flow creation and processing
├── id-generator/           # Automatic hierarchical ID generation
├── schema/                 # Schema integration and type extraction
├── switch/                 # Conditional logic and branching
├── tagged-template/        # Type-safe bindings and expressions
│   ├── binding.ts          # Data binding template tags
│   ├── expression.ts       # Expression template tags
│   ├── std.ts              # Standard library functions
│   └── README.md           # Detailed tagged template documentation
├── template/               # Template processing and rendering
├── utils/                  # Utility functions and helpers
├── types                   # Core type definitions
└── index.ts                # Main entry point
```

### Key Directories

- **`asset-wrapper/`**: Handles proper nesting and ID generation for child assets
- **`flow/`**: Creates complete Player-UI flows with navigation and data
- **`id-generator/`**: Generates hierarchical IDs automatically based on parent context
- **`tagged-template/`**: Type-safe binding and expression system with phantom types
- **`template/`**: Allows you to create multiple assets based on array data from your model
- **`schema/`**: Schema integration for type-safe data access

### Guidelines

- **Follow the fluent pattern**: All builders should use the `.withX()` convention
- **Maintain type safety**: Use TypeScript effectively with proper generics
- **Auto-generate IDs**: Use the context system for automatic ID generation
- **Add JSDoc comments**: Document all public APIs thoroughly
- **Write tests**: Comprehensive test coverage is required

## Migration Guide

### From React DSL

Migrating from React DSL to fluent DSL is straightforward:

```typescript
// Before (React DSL)
<Info id="welcome">
  <InfoTitle>
    <Text value="Welcome!" />
  </InfoTitle>
  <InfoPrimaryInfo>
    <Text value={binding`user.name`} />
  </InfoPrimaryInfo>
</Info>

// After (Fluent DSL)
info()
  .withId("welcome")
  .withTitle(text().withValue("Welcome!"))
  .withPrimaryInfo(text().withValue(b`user.name`))
```

### Key Changes

1. **JSX → Fluent methods**: Replace JSX elements with fluent builder calls
2. **Props → Methods**: Convert props to `.withX()` method calls

---

**Note**: This is part of the Player-UI ecosystem. For more information about Player-UI, visit the main repository and documentation.
