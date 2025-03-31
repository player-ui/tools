import { describe, beforeEach, expect, test, vi } from "vitest";
import { Messenger } from "../index";
import { createMockContext } from "./helpers";
import { BaseEvent } from "@player-tools/devtools-types";

vi.useFakeTimers();

describe("Messenger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Messenger.reset();
  });

  test("beacons", () => {
    const { spies, mockMessagingAPI } = createMockContext();

    // not assigning to a variable would lead to "new for side effects" error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const messenger = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web1.messageCallback,
      context: "devtools",
      id: "test1",
      logger: console,
    });

    vi.advanceTimersByTime(1000);

    expect(spies.web1.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
  });

  test("queue messages while handshake is in progress, and send them as the connection is established", () => {
    const { spies, mockMessagingAPI } = createMockContext();

    const messenger = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web1.messageCallback,
      context: "devtools",
      id: "test2",
      logger: console,
    });

    const events: Array<BaseEvent<string, unknown>> = [
      { type: "TEST", payload: { count: 1 } },
      { type: "TEST", payload: { count: 2 } },
      { type: "TEST", payload: { count: 3 } },
    ];

    messenger.sendMessage(events[0]);

    vi.advanceTimersByTime(1000);

    messenger.sendMessage(events[1]);

    vi.advanceTimersByTime(1000);

    messenger.sendMessage(events[2]);

    vi.advanceTimersByTime(1000);

    mockMessagingAPI.sendMessage({
      type: "MESSENGER_BEACON",
      context: "content-script",
      _messenger_: true,
      sender: "test-2",
    });

    expect(spies.web1.sendMessage).toHaveBeenCalledTimes(8);

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ ...events[0], sender: "test2" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ ...events[1], sender: "test2" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ ...events[2], sender: "test2" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({
        type: "MESSENGER_EVENT_BATCH",
        target: "test-2",
        payload: {
          events: [
            expect.objectContaining({ ...events[0] }),
            expect.objectContaining({ ...events[1] }),
            expect.objectContaining({ ...events[2] }),
          ],
        },
      }),
    );
  });

  test("messeges sent between two Messenger instances", () => {
    const { spies, mockMessagingAPI } = createMockContext();

    const eventsweb1: Array<BaseEvent<string, unknown>> = [
      { type: "TEST", payload: { count: 1 } },
      { type: "TEST", payload: { count: 2 } },
    ];

    const eventsDevtools: Array<BaseEvent<string, unknown>> = [
      { type: "TEST", payload: { count: 3 } },
      { type: "TEST", payload: { count: 4 } },
    ];

    const messenger1 = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web1.messageCallback,
      context: "player",
      id: "web1",
      logger: console,
    });

    vi.advanceTimersByTime(1000);

    messenger1.sendMessage(eventsweb1[0]);

    const messenger2 = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.devtools.messageCallback,
      context: "devtools",
      id: "devtools1",
      logger: console,
    });

    vi.advanceTimersByTime(1000);

    messenger2.sendMessage(eventsDevtools[0]);

    vi.advanceTimersByTime(1000);

    messenger1.sendMessage(eventsweb1[1]);

    messenger2.sendMessage(eventsDevtools[1]);

    vi.advanceTimersByTime(1000);

    expect(spies.web1.sendMessage).toHaveBeenCalledTimes(12);

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ ...eventsweb1[0], sender: "web1" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        type: "MESSENGER_EVENT_BATCH",
        target: "devtools1",
        payload: {
          events: [expect.objectContaining({ ...eventsweb1[0] })],
        },
      }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({ ...eventsDevtools[0], sender: "devtools1" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      9,
      expect.objectContaining({ ...eventsweb1[1], sender: "web1" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      10,
      expect.objectContaining({ ...eventsDevtools[1], sender: "devtools1" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      11,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );

    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      12,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
  });

  test("messages sent between two web Messenger instances and one devtools instance", () => {
    const { spies, mockMessagingAPI } = createMockContext();

    const eventsWeb1: Array<BaseEvent<string, unknown>> = [
      { type: "TEST", target: "web2", payload: { count: 1 } },
      { type: "TEST", target: "devtools", payload: { count: 2 } },
    ];

    const eventsWeb2: Array<BaseEvent<string, unknown>> = [
      { type: "TEST", target: "web1", payload: { count: 3 } },
      { type: "TEST", target: "devtools", payload: { count: 4 } },
    ];

    const eventsDevtools: Array<BaseEvent<string, unknown>> = [
      { type: "TEST", target: "web1", payload: { count: 5 } },
      { type: "TEST", target: "web2", payload: { count: 6 } },
    ];

    const messengerWeb1 = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web1.messageCallback,
      id: "web2",
      context: "player",
      logger: console,
    });

    const messengerWeb2 = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web2.messageCallback,
      id: "web3",
      context: "player",
      logger: console,
    });

    const messengerDevtools = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.devtools.messageCallback,
      id: "devtools2",
      context: "devtools",
      logger: console,
    });

    vi.advanceTimersByTime(1000);

    messengerWeb1.sendMessage(eventsWeb1[0]);
    messengerWeb2.sendMessage(eventsWeb2[0]);
    messengerDevtools.sendMessage(eventsDevtools[0]);

    vi.advanceTimersByTime(1000);

    messengerWeb1.sendMessage(eventsWeb1[1]);
    messengerWeb2.sendMessage(eventsWeb2[1]);
    messengerDevtools.sendMessage(eventsDevtools[1]);

    vi.advanceTimersByTime(1000);

    expect(spies.web1.sendMessage).toHaveBeenCalledTimes(15);
    expect(spies.web2.sendMessage).toHaveBeenCalledTimes(15);
    expect(spies.devtools.sendMessage).toHaveBeenCalledTimes(15);
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ ...eventsWeb1[0], target: "web2" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ ...eventsWeb2[0], target: "web1" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({ ...eventsDevtools[0], target: "web1" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      9,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      10,
      expect.objectContaining({ ...eventsWeb1[1], target: "devtools" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      11,
      expect.objectContaining({ ...eventsWeb2[1], target: "devtools" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      12,
      expect.objectContaining({ ...eventsDevtools[1], target: "web2" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      13,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      14,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
    expect(spies.web1.sendMessage).toHaveBeenNthCalledWith(
      15,
      expect.objectContaining({ type: "MESSENGER_BEACON" }),
    );
  });
});
