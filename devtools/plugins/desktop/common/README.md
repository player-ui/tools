# @player-tools/devtools-desktop-common

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

This package provides common utilities for the Player UI Devtools desktop plugins. It includes a communication layer and state management utilities that can be used across different plugins.

## Overview

The `@player-tools/devtools-desktop-common` package is a part of the Player UI Devtools architecture. It provides a set of common utilities that can be used to create custom devtools plugins for the Player UI.

The package includes a communication layer that allows plugins to communicate with the Player UI and a set of state management utilities that can be used to manage the state of the plugins.

## Installation

The package is available as an npm package. You can install it using (p)npm or yarn:

```bash
npm install @player-tools/devtools-desktop-common

yarn add @player-tools/devtools-desktop-common
```

## Usage
You can import the utilities from the package in your TypeScript or JavaScript files:

```ts
import { communicationLayer, usePluginState } from '@player-tools/devtools-desktop-common';
```

## Contributing

We welcome contributions to the Player UI Devtools. If you're interested in contributing, please check out the contributing guide.

## License

The Player UI Devtools are licensed under the MIT license.