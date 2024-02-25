import { describe, afterEach, expect, test, vi } from "vitest";
import { Messenger } from "../index";
import { createMockContext } from "./helpers";

vi.useFakeTimers();

describe("Messenger", () => {
  afterEach(() => {
    vi.clearAllMocks();
    Messenger.resetEvents();
  });

  test("beacons", () => {
    const { spies, mockMessagingAPI } = createMockContext();

    // not assigning to a variable would lead to "new for side effects" error
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const messenger = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web.messageCallback,
      id: "test",
      context: "player",
      logger: console,
    });

    vi.advanceTimersByTime(1000);

    expect(spies.web.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );
  });

  test("queue messages while handshake is in progress, and send them as the connection is established", () => {
    const { spies, mockMessagingAPI } = createMockContext();

    const messenger = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web.messageCallback,
      id: "test",
      context: "player",
      logger: console,
    });

    const events = [
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

    expect(spies.web.sendMessage).toHaveBeenCalledTimes(5);

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({
        type: "MESSENGER_EVENT_BATCH",
        payload: {
          events: [
            expect.objectContaining({ ...events[0], target: "test-2" }),
            expect.objectContaining({ ...events[1], target: "test-2" }),
            expect.objectContaining({ ...events[2], target: "test-2" }),
          ],
        },
      })
    );
  });

  test("messeges sent between two Messenger instances", () => {
    const { spies, mockMessagingAPI } = createMockContext();

    const eventsWeb = [
      { type: "TEST", payload: { count: 1 } },
      { type: "TEST", payload: { count: 2 } },
    ];

    const eventsDevtools = [
      { type: "TEST", payload: { count: 3 } },
      { type: "TEST", payload: { count: 4 } },
    ];

    const messenger1 = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.web.messageCallback,
      id: "web",
      context: "player",
      logger: console,
    });

    vi.advanceTimersByTime(1000);

    messenger1.sendMessage(eventsWeb[0]);

    const messenger2 = new Messenger({
      sendMessage: mockMessagingAPI.sendMessage.bind(mockMessagingAPI),
      addListener: mockMessagingAPI.addListener.bind(mockMessagingAPI),
      removeListener: mockMessagingAPI.removeListener.bind(mockMessagingAPI),
      messageCallback: spies.devtools.messageCallback,
      id: "devtools",
      context: "devtools",
      logger: console,
    });

    vi.advanceTimersByTime(1000);

    messenger2.sendMessage(eventsDevtools[0]);

    vi.advanceTimersByTime(1000);

    messenger1.sendMessage(eventsWeb[1]);

    messenger2.sendMessage(eventsDevtools[1]);

    vi.advanceTimersByTime(1000);

    expect(spies.web.sendMessage).toHaveBeenCalledTimes(11);

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        type: "MESSENGER_EVENT_BATCH",
        payload: {
          events: [
            expect.objectContaining({ ...eventsWeb[0], target: "devtools" }),
          ],
        },
      })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      5,
      expect.objectContaining({ ...eventsDevtools[0], sender: "devtools" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      6,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      7,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      8,
      expect.objectContaining({ ...eventsWeb[1], sender: "web" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      9,
      expect.objectContaining({ ...eventsDevtools[1], sender: "devtools" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      10,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );

    expect(spies.web.sendMessage).toHaveBeenNthCalledWith(
      11,
      expect.objectContaining({ type: "MESSENGER_BEACON" })
    );
  });
});
