# DSL-Lite

🚧🚧🚧🚧 WIP 🚧🚧🚧🚧

A lightweight JSX runtime implementation for writing [Player UI](https://player-ui.github.io/) experiences using familiar React-like syntax.

This library enables developers to create Player UI content using JSX instead of writing raw JSON, leading to cleaner, more maintainable, and type-safe code.

It's an option to `@player-tools/dsl` for scenarios where the user requires compilation speed and doesn't require other React API than the hooks exposed by this library.

## Features

- ✨ **React-like Syntax**: Write Player UI experiences using familiar JSX syntax
- 🔄 **Hooks API**: Includes React-inspired hooks such as `useRef` and `useContext`
- 🧩 **Component Model**: Create reusable UI components with props and composition
- 🌲 **AST Generation**: Generate and manipulate structured abstract syntax trees
- 📝 **Template Literals**: Convenience utilities for binding expressions and data
- 🔍 **Type Safety**: Full TypeScript support with comprehensive type definitions

## Installation

```bash
# Using npm
npm install @player-tools/dsl-lite

# Using yarn
yarn add @player-tools/dsl-lite

# Using pnpm
pnpm add @player-tools/dsl-lite
```

## Usage

### Basic Example

```tsx
import { Asset } from "@player-tools/dsl-lite";
import { Text } from "@player-ui/reference-assets-plugin-components";

const MyView = () => (
  <Asset id="my-text" type="text">
    <Text>Hello Player UI!</Text>
  </Asset>
);

// Convert JSX to Player UI JSON format
const { jsonValue } = render(<MyView />);
console.log(jsonValue);
```

### Using Hooks

```tsx
import { useRef, useContext, render, Asset } from "@player-tools/dsl-lite";
import { Text } from "@player-ui/reference-assets-plugin-components";

const MyComponent = () => {
  // Create a ref to access the AST node
  const assetRef = useRef(null);

  return (
    <Asset ref={assetRef} id="my-asset" type="text">
      <Text>Access AST nodes with refs</Text>
    </Asset>
  );
};

const { jsonValue } = render(<MyComponent />);
```

### Using Expressions and Bindings

```tsx
import { expression, binding, render, Asset } from "@player-tools/dsl-lite";
import { Text } from "@player-ui/reference-assets-plugin-components";

const DynamicContent = () => (
  <>
    <Asset id="dynamic-text" type="text">
      <text>hello, {binding`user.name`}!</text>
    </asset>
    <Asset
      id="conditional"
      type="text"
      visible={expression`user.isAdmin == true`}
    >
      <Text>Admin Panel</Text>
    </Asset>
  </>
);

const { jsonValue } = render(<DynamicContent />);
```

## API Reference

### JSX Runtime

- `createElement(type, props, ...children)`: Core JSX runtime function
- `Fragment`: Component for returning multiple elements without a wrapper
- `render(element)`: Converts JSX to Player UI JSON format

### Hooks

- `useRef(initialValue)`: Reference hook for accessing AST nodes
- `createContext(defaultValue)`: Create a context for sharing data
- `useContext(Context)`: Access context values

### Utilities

- `binding`: Tagged template literal for data binding expressions
- `expression`: Tagged template literal for complex expressions
- `createObjectNode()`, `createArrayNode()`, etc.: AST node creation utilities
- `toJSON()`: Convert AST nodes to plain JSON

## Advanced Usage

### Custom Components

Create your own reusable components:

```tsx
import { binding, Asset } from "@player-tools/dsl-lite";
import { Text } from "@player-ui/reference-assets-plugin-components";

interface ButtonProps {
  id: string;
  label: string;
  onPress?: string | Function;
  disabled?: boolean;
}

const Button = ({ id, label, onPress, disabled }: ButtonProps) => (
  <Asset
    id={id}
    type="action"
    value={label}
    onPress={onPress}
    disabled={disabled}
  >
    <Text>{label}</Text>
  </Asset>
);

// Usage
const MyView = () => (
  <Template>
    <Button
      id="submit-btn"
      label="Submit"
      onPress={() => console.log("Submitted")}
    />
  </Template>
);
```
