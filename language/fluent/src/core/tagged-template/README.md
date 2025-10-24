# Tagged Template System

A comprehensive type-safe template system for creating dynamic expressions and bindings with full TypeScript support through phantom types and schema integration.

## Table of Contents

- [Overview](#overview)
- [Core Concepts](#core-concepts)
- [Type Safety & Schema Integration](#type-safety--schema-integration)
- [API Reference](#api-reference)
- [Usage Examples](#usage-examples)
- [Advanced Features](#advanced-features)
- [Best Practices](#best-practices)

## Overview

The tagged-template system provides a type-safe way to create dynamic expressions and data bindings for template rendering. It leverages TypeScript's phantom types to provide compile-time type checking while generating runtime template strings.

### Key Features

- **Type-Safe Bindings**: Create data bindings with full TypeScript type checking
- **Expression Templates**: Build complex logical and arithmetic expressions
- **Schema Integration**: Automatically extract type-safe bindings from schema definitions
- **Standard Library**: Rich set of pre-built operations (logical, arithmetic, comparison)
- **Phantom Types**: Compile-time type information without runtime overhead

## Core Concepts

### TaggedTemplateValue<T>

The foundation of the system is `TaggedTemplateValue<T>`, which uses a phantom type `T` to provide type information:

```typescript
interface TaggedTemplateValue<T = unknown> {
  [TaggedTemplateValueSymbol]: true;
  /** Phantom type marker - not available at runtime */
  readonly _phantomType?: T;
  toValue(): string;
  toRefString(options?: TemplateRefOptions): string;
  toString(): string;
}
```

The phantom type `T` acts like a "fat pointer" - it carries type information about the data that the binding targets, enabling TypeScript to perform compile-time type checking on standard library functions and user-defined functions that work with `TaggedTemplateValue<T>`.

### Binding

Creates data binding expressions that reference data paths:

```typescript
import { binding } from "./binding";

// Basic binding (backward compatible)
const userAge = binding`user.age`; // TaggedTemplateValue<unknown>

// Type-safe binding with phantom type
const typedAge = binding<number>`user.age`; // TaggedTemplateValue<number>

console.log(userAge.toString()); // "{{user.age}}"
```

### Expression

Creates executable expressions with syntax validation:

```typescript
import { expression } from "./expression";

// Basic expression
const calc = expression`user.age + 5`;

// Typed expression
const addNumbers = (
  a: TaggedTemplateValue<number>,
  b: TaggedTemplateValue<number>,
) => expression`{{${a}}} + {{${b}}}`;

// If we try passing a binding that doens't target a number we get a type error
```

### Schema Integration

Extract type-safe bindings directly from schema definitions:

```typescript
import { extractBindingsFromSchema } from "./extract-bindings-from-schema";

const schema = {
  ROOT: {
    user: { type: "UserType" },
    count: { type: "NumberType" },
  },
  UserType: {
    name: { type: "StringType" },
    age: { type: "NumberType" },
    preferences: { type: "PreferenceType" },
  },
  PreferenceType: {
    theme: { type: "StringType" },
    notifications: { type: "BooleanType" },
  },
} as const satisfies Schema.Schema; // <- this is necessary to force Typescript to evaluate keys as string literal

const bindings = extractBindingsFromSchema(schema);

// Type-safe access with full IntelliSense
bindings.user.name; // TaggedTemplateValue<string>
bindings.user.age; // TaggedTemplateValue<number>
bindings.user.preferences.theme; // TaggedTemplateValue<string>
bindings.count; // TaggedTemplateValue<number>
```

## Type Safety & Schema Integration

### The `as const satisfies Schema.Schema` Requirement

For TypeScript to correctly infer types, schemas must be declared with this specific pattern:

```typescript
// ✅ CORRECT - Enables full type inference
const schema = {
  ROOT: {
    user: { type: "UserType" },
  },
  UserType: {
    name: { type: "StringType" },
  },
} as const satisfies Schema.Schema;

// ❌ INCORRECT - Type inference will be limited
const schema: Schema.Schema = {
  ROOT: {
    user: { type: "UserType" },
  },
  UserType: {
    name: { type: "StringType" },
  },
};
```

The `as const` assertion preserves literal types, while `satisfies Schema.Schema` ensures the structure is valid. This combination allows TypeScript to:

1. Infer exact property names and types
2. Maintain type relationships between schema references
3. Generate precise `TaggedTemplateValue<T>` types
4. Enable full IntelliSense support

### Phantom Types and Type Checking

Phantom types enable the standard library functions to provide type-safe operations:

```typescript
import { add, equal, greaterThan } from "./std";

const userAge = binding<number>`user.age`;
const minimumAge = binding<number>`settings.minimumAge`;
const userName = binding<string>`user.name`;

// ✅ Type-safe arithmetic (number + number)
const ageSum = add(userAge, minimumAge);

// ✅ Type-safe comparison (number > number)
const isOldEnough = greaterThan(userAge, minimumAge);

// ✅ Type-safe equality (string === string)
const isAdmin = equal(userName, "admin");

// ❌ TypeScript error - can't add string to number
const invalid = add(userName, userAge); // Type error!
```

### Array Handling

Arrays in schemas are handled with special binding structures:

```typescript
const schema = {
  ROOT: {
    tags: { type: "StringType", isArray: true },
    scores: { type: "NumberType", isArray: true },
    users: { type: "UserType", isArray: true },
  },
  UserType: {
    name: { type: "StringType" },
  },
} as const satisfies Schema.Schema;

const bindings = extractBindingsFromSchema(schema);

// String arrays have 'name' property
bindings.tags.name; // TaggedTemplateValue<string> -> "{{tags._current_}}"

// Number/Boolean arrays have 'value' property
bindings.scores.value; // TaggedTemplateValue<number> -> "{{scores._current_}}"

// Complex type arrays expose nested structure
bindings.users.name; // TaggedTemplateValue<string> -> "{{users._current_.name}}"
```

## API Reference

### `binding<T>(template): TaggedTemplateValue<T>`

Creates a data binding with optional type annotation.

```typescript
binding`data.path`; // TaggedTemplateValue<unknown>
binding<string>`user.name`; // TaggedTemplateValue<string>
binding<number>`user.age`; // TaggedTemplateValue<number>
```

### `expression<T>(template): TaggedTemplateValue<T>`

Creates an executable expression with syntax validation.

```typescript
expression`user.age + 1`;
expression`user.name === "admin"`;
expression`condition ? value1 : value2`;
```

### `extractBindingsFromSchema<S>(schema): ExtractedBindings<S>`

Extracts type-safe bindings from a schema definition.

```typescript
const bindings = extractBindingsFromSchema(schema);
// Returns fully typed binding structure matching schema
```

### Standard Library Functions

#### Logical Operations

- `and(...args)` - Logical AND (&&)
- `or(...args)` - Logical OR (||)
- `not(value)` - Logical NOT (!)
- `xor(left, right)` - Exclusive OR
- `nand(...args)` - NOT AND
- `nor(...args)` - NOT OR

#### Comparison Operations

- `equal(left, right)` - Loose equality (==)
- `strictEqual(left, right)` - Strict equality (===)
- `notEqual(left, right)` - Inequality (!=)
- `strictNotEqual(left, right)` - Strict inequality (!==)
- `greaterThan(left, right)` - Greater than (>)
- `greaterThanOrEqual(left, right)` - Greater than or equal (>=)
- `lessThan(left, right)` - Less than (<)
- `lessThanOrEqual(left, right)` - Less than or equal (<=)

#### Arithmetic Operations

- `add(...args)` - Addition (+)
- `subtract(left, right)` - Subtraction (-)
- `multiply(...args)` - Multiplication (\*)
- `divide(left, right)` - Division (/)
- `modulo(left, right)` - Modulo (%)

#### Control Flow

- `conditional(condition, ifTrue, ifFalse)` - Ternary operator (?:)
- `call(functionName, ...args)` - Function call
- `literal(value)` - Literal value

## Usage Examples

### Basic Binding and Expression Usage

```typescript
import { binding, expression } from "./index";

// Simple data binding
const userName = binding<string>`user.name`;
const userAge = binding<number>`user.age`;

// Expression with bindings
const greeting = expression`"Hello, " + ${userName}`;
const isAdult = expression`${userAge} >= 18`;

console.log(userName.toString()); // "{{user.name}}"
console.log(greeting.toString()); // "@["Hello, " + {{user.name}}]@"
console.log(isAdult.toString()); // "@[{{user.age}} >= 18]@"
```

### Schema-Driven Development

```typescript
import { extractBindingsFromSchema } from "./extract-bindings-from-schema";
import { and, greaterThan, equal } from "./std";

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
  equal(data.user.role, data.settings.adminRole),
);

console.log(isAuthorizedAdmin.toString());
// "{{data.user.age > data.settings.minAge && data.user.role == data.settings.adminRole}}"
```

### Working with Arrays

```typescript
const listSchema = {
  ROOT: {
    items: { type: "ItemType", isArray: true },
    tags: { type: "StringType", isArray: true },
    scores: { type: "NumberType", isArray: true },
  },
  ItemType: {
    name: { type: "StringType" },
    value: { type: "NumberType" },
  },
} as const satisfies Schema.Schema;

const data = extractBindingsFromSchema(listSchema);

// Array item bindings
data.items.name; // "{{items._current_.name}}"
data.items.value; // "{{items._current_.value}}"
data.tags.name; // "{{tags._current_}}" (string arrays use .name)
data.scores.value; // "{{scores._current_}}" (number arrays use .value)
```

### Custom Functions with Type Safety

```typescript
import type { TaggedTemplateValue } from "./types";
import { expression } from "./expression";

// Custom function that works with typed template values
function formatCurrency<T extends number>(
  amount: TaggedTemplateValue<T> | T,
  currency: string = "USD",
): TaggedTemplateValue<string> {
  const amountExpr = isTaggedTemplateValue(amount)
    ? amount.toRefString({ nestedContext: "expression" })
    : String(amount);

  return expression`"${currency} " + ${amountExpr}.toFixed(2)` as TaggedTemplateValue<string>;
}

// Usage with type safety
const price = binding<number>`product.price`;
const formattedPrice = formatCurrency(price, "EUR");
// Type is TaggedTemplateValue<string>
```

## Advanced Features

### Nested Template Composition

Templates can be composed and nested while maintaining proper context:

```typescript
const baseCondition = expression`user.age > 18`;
const complexCondition = and(
  baseCondition,
  equal(binding<string>`user.status`, "active"),
);

// Proper nesting with context handling
const finalExpression = expression`${complexCondition} ? "authorized" : "denied"`;
```

### Expression Validation

Expressions are validated for syntax errors at creation time:

```typescript
// ✅ Valid expression
const valid = expression`user.age + (5 * 2)`;

// ❌ Throws error - unbalanced parentheses
const invalid = expression`user.age + (5 * 2`; // Error: Expected ) at character 15
```

## Best Practices

### 1. Always Use Schema Types

```typescript
// ✅ GOOD - Schema enables full type safety
const schema = {
  ROOT: { user: { type: "UserType" } },
  UserType: { name: { type: "StringType" } },
} as const satisfies Schema.Schema;

const bindings = extractBindingsFromSchema(schema);
const userName = bindings.user.name; // TaggedTemplateValue<string>

// ❌ AVOID - Manual binding loses type information
const userName = binding`user.name`; // TaggedTemplateValue<unknown>
```

### 2. Leverage Standard Library

```typescript
// ✅ GOOD - Use type-safe standard library functions
import { and, greaterThan, equal } from "./std";

const condition = and(
  greaterThan(data.user.age, 18),
  equal(data.user.status, "active"),
);

// ❌ AVOID - Manual expression construction
const condition = expression`${data.user.age} > 18 && ${data.user.status} == "active"`;
```

### 3. Type Your Custom Functions

```typescript
// ✅ GOOD - Properly typed custom function
function isInRange<T extends number>(
  value: TaggedTemplateValue<T> | T,
  min: number,
  max: number,
): TaggedTemplateValue<boolean> {
  return and(greaterThanOrEqual(value, min), lessThanOrEqual(value, max));
}

// Usage maintains type safety
const userAge = binding<number>`user.age`;
const isValidAge = isInRange(userAge, 13, 120); // TaggedTemplateValue<boolean>
```

This system provides a powerful foundation for creating type-safe, dynamic templates while maintaining excellent developer experience through TypeScript integration and comprehensive tooling support.
