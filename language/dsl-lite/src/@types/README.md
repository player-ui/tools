# DSL TypeScript Definitions

This directory contains TypeScript type definitions for the DSL-lite compiler.

## Overview

These type definitions provide the necessary types to work with the JSX-based DSL for @player-ui/player content. They are designed to replace React's type definitions within the scope of the DSL compiler, providing a lightweight alternative that doesn't depend on React or DOM types.

## Key Features

- Complete TypeScript support for JSX syntax in the DSL
- Support for our custom intrinsic elements: `obj`, `array`, `property`, and `value`
- Type definitions for our React-like hooks: `useState`, `useRef`, `useContext`, and `createContext`
- JSX factories for both standard and development environments

## Files

- `global.d.ts` - Basic type definitions for core DSL primitives
- `index.d.ts` - Main type definitions including hooks and JSX support
- `jsx-runtime.d.ts` - Type definitions for JSX runtime
- `jsx-dev-runtime.d.ts` - Type definitions for JSX development runtime

## Usage

These types are used internally by the DSL compiler and are referenced in the project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "react": ["./src/@types/index.d.ts"],
      "react/jsx-runtime": ["./src/@types/jsx-runtime.d.ts"],
      "react/jsx-dev-runtime": ["./src/@types/jsx-dev-runtime.d.ts"],
      "react-dom": ["./src/@types/index.d.ts"]
    },
    "typeRoots": ["./src/@types", "./node_modules/@types"]
  }
}
```

This configuration ensures that the compiler uses our type definitions instead of React's when working with JSX in the DSL.
