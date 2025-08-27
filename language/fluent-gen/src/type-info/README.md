# TypeScript Type Extraction System

A comprehensive TypeScript type analysis engine that extracts structured metadata from TypeScript interfaces. This system provides deep introspection capabilities for TypeScript types, enabling advanced code generation, tooling, and type analysis workflows.

## 🎯 Purpose

This library analyzes TypeScript interfaces and returns detailed structural information about their properties, dependencies, and relationships. It's designed to power code generation tools, particularly fluent API builders, by providing complete type metadata.

## 📋 Main API

The system exposes a single primary function:

```typescript
import { extractTypescriptInterfaceInfo } from "./src/type-info";

const result = extractTypescriptInterfaceInfo({
  filePath: "path/to/your/types.ts",
  interfaceName: "YourInterface",
});
```

### Input Parameters

- `filePath`: Path to the TypeScript file containing the interface
- `interfaceName`: Name of the interface to analyze

### Return Type: `ExtractResult`

```typescript
interface ExtractResult {
  kind: "non-terminal";
  type: "object";
  name: string; // Interface name
  typeAsString: string; // Full interface text
  properties: PropertyInfo[]; // Array of analyzed properties
  filePath: string; // Source file path
  dependencies: Dependency[]; // External dependencies
  documentation?: string; // JSDoc documentation
}
```

## 🏗️ Core Architecture

The system uses a modular, strategy-based architecture:

### Main Components

1. **`InterfaceExtractor`** - Main orchestrator that coordinates the extraction process
2. **`TypeAnalyzer`** - Strategy pattern implementation for analyzing different TypeScript constructs
3. **`SymbolResolver`** - Resolves type symbols across files and external modules with caching
4. **Utility Type Expanders** - Specialized handlers for TypeScript utility types

### Analysis Strategies

The `TypeAnalyzer` uses specialized analyzers:

- **`PrimitiveAnalyzer`** - Handles `string`, `number`, `boolean`, literals
- **`ArrayAnalyzer`** - Processes arrays and `Array<T>` syntax
- **`UnionAnalyzer`** - Analyzes union types (`A | B`)
- **`IntersectionAnalyzer`** - Handles intersection types (`A & B`)
- **`ObjectAnalyzer`** - Processes inline object types
- **`ReferenceAnalyzer`** - Resolves type references and external types
- **`TupleAnalyzer`** - Handles tuple types (`[A, B, C]`)

## ✨ Supported TypeScript Features

### Type Constructs

- ✅ Primitive types (`string`, `number`, `boolean`)
- ✅ Literal types (`'active'`, `42`, `true`)
- ✅ Arrays (`string[]`, `Array<T>`)
- ✅ Tuples (`[string, number]`)
- ✅ Union types (`string | number`)
- ✅ Intersection types (`A & B`)
- ✅ Object types and interfaces
- ✅ Optional properties (`prop?`)
- ✅ Enum types
- ✅ Generic types with constraints

### Utility Types

- ✅ `Pick<T, K>` - Property selection
- ✅ `Omit<T, K>` - Property exclusion
- ✅ `Partial<T>` - All properties optional
- ✅ `Required<T>` - All properties required
- ✅ `Record<K, V>` - Key-value mapping
- ✅ `NonNullable<T>` - Exclude null/undefined

### Advanced Features

- ✅ **External Module Resolution** - Resolves imports from external packages
- ✅ **Circular Dependency Detection** - Prevents infinite recursion
- ✅ **JSDoc Extraction** - Captures documentation comments
- ✅ **Generic Parameter Handling** - Resolves generic constraints and defaults
- ✅ **Interface Inheritance** - Processes `extends` clauses
- ✅ **Symbol Caching** - Performance optimization for repeated analysis

## 🔧 Usage Examples

### Basic Interface Analysis

```typescript
// types.ts
interface User {
  id: number;
  name: string;
  email?: string;
}

// Analysis
const result = extractTypescriptInterfaceInfo({
  filePath: "./types.ts",
  interfaceName: "User",
});

console.log(result.properties);
// [
//   { type: 'number', name: 'id', isOptional: false, ... },
//   { type: 'string', name: 'name', isOptional: false, ... },
//   { type: 'string', name: 'email', isOptional: true, ... }
// ]
```

### Complex Types with Utility Types

```typescript
// types.ts
interface UserProfile {
  id: number;
  personal: Pick<User, "name" | "email">;
  settings: Partial<AppSettings>;
  tags: string[];
}

// The system will:
// 1. Resolve Pick<User, 'name' | 'email'> to { name: string; email?: string }
// 2. Expand Partial<AppSettings> to make all AppSettings properties optional
// 3. Identify dependencies on User and AppSettings interfaces
// 4. Return structured PropertyInfo for each property
```

### External Module Dependencies

```typescript
// types.ts
import { Asset } from "@player-ui/types";

interface GameAsset extends Asset {
  score: number;
  metadata: Record<string, unknown>;
}

// Analysis will:
// 1. Detect dependency on @player-ui/types module
// 2. Record the inheritance relationship
// 3. Expand Record<string, unknown> utility type
// 4. Include dependency information in result.dependencies
```

## 📊 Property Type System

The system categorizes all properties into a structured type hierarchy:

### Terminal Types (No Further Analysis)

```typescript
StringProperty; // string, string literals
NumberProperty; // number, numeric literals
BooleanProperty; // boolean, boolean literals
EnumProperty; // TypeScript enums
UnknownProperty; // unknown, any, or unresolvable types
MethodProperty; // Function types
```

### Non-Terminal Types (Expandable)

```typescript
ObjectProperty; // Interfaces, classes, inline objects
UnionProperty; // Union types (A | B)
```

Each property includes:

- `name` - Property name
- `type` - Category classification
- `typeAsString` - Original TypeScript text
- `isOptional` - Whether property is optional
- `isArray` - Whether property is an array
- `documentation` - JSDoc comments
- `properties` - Nested properties (for ObjectProperty)

## 🔄 Symbol Resolution

The `SymbolResolver` handles complex scenarios:

### Resolution Strategies

1. **Local Declaration** - Finds types in the same file
2. **Import Resolution** - Resolves imported types from other files
3. **External Module Resolution** - Handles node_modules dependencies

### Caching System

- **Symbol Cache** - Avoids re-analyzing the same symbols
- **Type Analysis Cache** - Caches complex type expansion results
- **File System Cache** - Optimizes file reading operations

## 🎨 Extensibility

The system is designed for extension:

### Adding New Analyzers

```typescript
class CustomAnalyzer implements TypeAnalysisStrategy {
  canHandle(typeNode: TypeNode): boolean {
    // Implement detection logic
  }

  analyze(args: AnalysisArgs): PropertyInfo | null {
    // Implement analysis logic
  }
}

// Register with TypeAnalyzer
```

### Custom Utility Type Expanders

```typescript
class MyUtilityExpander extends UtilityTypeExpander {
  getTypeName(): string {
    return "MyUtility";
  }

  expand(args: ExpansionArgs): PropertyInfo | null {
    // Implement expansion logic
  }
}

// Register with UtilityTypeRegistry
```

