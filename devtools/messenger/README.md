# @player-tools/devtools-messenger

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)

Devtools Messenger is a communication layer agnostic, self-sufficient, and lossless messenger designed for seamless communication between instances. It operates independently without a bookkeeper, ensuring no data loss during the communication process.

## Features

- **Self-sufficient**: Operates independently without the need for a bookkeeper.
- **Lossless**: Ensures no data loss during the communication process.
- **Communication Layer Agnostic**: Can be used with any communication layer.

## How it Works

The Messenger class sends beacon messages to announce its presence. When it receives a beacon from another instance, it establishes a connection, sending all the events so far. It also keeps track of the messages it has received and checks for lost messages whenever it receives a new message (messages have a sequential id).

## Installation

To install Devtools Messenger, run the following command, using your preferred package manager:

```sh
npm @player-tools/devtools-messenger
```

## Usage

Here's a basic example of how to use Devtools Messenger:

```ts
import { Messenger } from 'devtools-messenger';

const messenger = new Messenger({
  context: 'devtools',
  target: 'player',
  messageCallback: (message) => dispatch(message),
  sendMessage: (message) => browser.runtime.sendMessage(message),
  addListener: (callback) => {
    browser.runtime.onMessage.addListener(callback);
  },
  removeListener: (callback) => {
    browser.runtime.onMessage.removeListener(callback);
  },
});
```

## API Reference

### Messenger Class

The main class in Devtools Messenger is the `Messenger`. It is responsible for sending and receiving messages.

#### Constructor

The `Messenger` class constructor takes an options object with the following properties:

- `context`: The context to use for this instance. It can be either "player" or "devtools".
- `target`: The target for the messages.
- `messageCallback`: A callback function to handle messages.
- `sendMessage`: A function to send messages.
- `addListener`: A function to add a listener.
- `removeListener`: A function to remove a listener.

### Methods

The Messenger class has the following methods:

- `sendMessage(message: T | string)`: Sends a message. The message can be a string or an object of type T, where T is the type of your events.
- `destroy()`: Destroys the messenger instance. It removes all listeners and sends a disconnect message to all connections.

### Error Handling

If a message fails to be sent, the `handleFailedMessage` function will be called with the failed message as an argument. This function can be provided in the options object when creating a Messenger instance.

## Contributing

We welcome contributions! Please see our contributing guide for more details.

## License

Devtools Messenger is MIT licensed.
