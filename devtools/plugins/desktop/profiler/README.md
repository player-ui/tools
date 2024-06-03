# @player-tools/devtools-profiler-web-plugin

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

This package provides a basic devtools profiler plugin for the Player UI.

The profiler measures and records the execution duration of each Player's tappable hook by leveraging the `performance.now()` API. It organizes the results into a table with columns for 'name' and 'duration'. Additionally, it renders the data into a flame graph, providing a graphical representation of the time spent in each hook. This allows for an intuitive understanding of where the most time is being spent in the code execution.

## Overview

The `@player-tools/devtools-profiler-web-plugin` package is a part of the Player UI Devtools architecture.

## Installation

The package is available as an npm package. You can install it using (p)npm or yarn:

```bash
npm install @player-tools/devtools-desktop-basic
```

```bash
yarn add @player-tools/devtools-desktop-basic
```

## Usage

You can import the plugin in your TypeScript or JavaScript files:

```ts
import { ProfilerPlugin } from "@player-tools/devtools-profiler-web-plugin";
```

Then, you can use the `ProfilerPlugin` in your application:

```ts
const myPlugin = new ProfilerPlugin();
```

## Contributing

We welcome contributions to the Player UI Devtools. If you're interested in contributing, please check out the contributing guide.
