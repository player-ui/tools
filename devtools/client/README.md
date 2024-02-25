# @player-tools/devtools-client

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

The `@player-tools/devtools-client` exposes the Panel containing the ReactPlayer responsible for running the content sent by the Player devtool plugins on the inspected Player UI instance and the navigation bar.

You can check how to use it in the [browser-extension](TODO) and [Flipper desktop App client](TODO).

## Overview

The Devtools client is a part of the Player UI Devtools architecture. It allows you to create custom devtools panels that can be used to debug and inspect your Player UI experiences, using the same plugin system used by other Player UI plugins.

The Devtools client receives its content from the devtools plugins running into the Player UI in use by the inspected page. This allows extending the devtools with custom panels, without the need to create a new extension. You can create your own devtools plugins and use them in the Player UI Devtools Browser Extension.

For more information on the architecture of the Devtools client, please refer to the Devtools Browser Extension README.

## Installation

The Devtools client is available as an npm package. You can install it using npm or yarn:

```bash
npm install @player-tools/devtools-client
```

```bash
yarn add @player-tools/devtools-client
```

## Usage

The Devtools client is a React component that receives the content from the devtools plugins running into the Player UI in use by the inspected page. You can use it in your React application as any other React component.

```jsx
import { Panel } from '@player-tools/devtools-client';
import type { MessengerOptions } from '@player-tools/devtools-messenger';
import browser from 'webextension-polyfill';

const port = browser.runtime.connect();

const communicationLayer: Pick<
  MessengerOptions,
  'sendMessage' | 'addListener' | 'removeListener'
> = {
  sendMessage: async (message) =>
    port.postMessage({
      tabId: browser.devtools.inspectedWindow.tabId,
      body: message,
    }),
  addListener: (callback) => {
    port.onMessage.addListener(({ body }) => callback(body));
  },
  removeListener: (callback) => {
    port.onMessage.removeListener(callback);
  },
};

root.render(<Panel communicationLayer={communicationLayer} />);
```

## Contributing

We welcome contributions to the Player UI Devtools Browser Extension. If you're interested in contributing, please check out the [contributing guide](TODO).

## License

The Player UI Devtools Browser Extension is licensed under the [MIT license](TODO).
