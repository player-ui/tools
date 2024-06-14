/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mock, vi } from "vitest";

type MessengerSpies = {
  sendMessage: Mock;
  addListener: Mock;
  removeListener: Mock;
  messageCallback: Mock;
};

export class MockedMessagingAPI {
  private listeners: Set<(event: any) => void> = new Set();

  constructor(private spies: Array<MessengerSpies>) {}

  addListener(callback: (event: any) => void) {
    this.spies.forEach(({ addListener }) => addListener(callback));

    this.listeners.add(callback);
  }

  removeListener(callback: (event: any) => void) {
    this.spies.forEach(({ removeListener }) => removeListener(callback));

    this.listeners.delete(callback);
  }

  async sendMessage(event: any, fail = false) {
    this.spies.forEach(({ sendMessage }) => sendMessage(event));

    if (fail) {
      throw new Error("Failed to send message");
    }

    this.listeners.forEach((listener) => listener(event));
  }
}

export function createMockContext() {
  const spies = {
    web: {
      sendMessage: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      messageCallback: vi.fn(),
    },
    devtools: {
      sendMessage: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      messageCallback: vi.fn(),
    },
  };

  const mockMessagingAPI = new MockedMessagingAPI([spies.web, spies.devtools]);

  return {
    spies,
    mockMessagingAPI,
  };
}
