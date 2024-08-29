import uid from "tiny-uid";
import type {
  BaseEvent,
  Connection,
  DisconnectEvent,
  EventsBatchEvent,
  InternalEvent,
  MessengerEvent,
  MessengerOptions,
  RequestLostEventsEvent,
  Transaction,
  TransactionMetadata,
} from "@player-tools/devtools-types";

const counters: Record<string, number> = {};

const internalEvents: Array<InternalEvent<BaseEvent<string, unknown>>["type"]> =
  [
    "MESSENGER_BEACON",
    "MESSENGER_DISCONNECT",
    "MESSENGER_REQUEST_LOST_EVENTS",
    "MESSENGER_EVENT_BATCH",
  ];

/**
 * Messenger<EventsType>
 *
 * Self-sufficient, lossless communication between instances.
 *
 * @param options
 * @param options.context - context to use for this instance
 * @param options.id - unique id for this instance, will be generated if not provided
 * @param options.beaconIntervalMS - time to wait between beacons in milliseconds, defaults to 1000
 * @param options.debug - if true, will log debug messages to console, defaults to false
 * @param options.messageCallback - callback to handle messages
 * @param options.sendMessage - function to send messages
 * @param options.addListener - function to add a listener
 * @param options.removeListener - function to remove a listener
 * @param options.handleFailedMessage - function to handle failed messages
 * @param option.log - function to handle logging
 * @returns Messenger
 * @example
 * ```typescript
 * const messenger = new Messenger({{
 *      context: "devtools",
 *      target: "player",
 *      messageCallback: (message) => dispatch(message),
 *      sendMessage: (message) =>
 *        browser.tabs
 *          ? browser.tabs
 *              .query({ active: true, currentWindow: true })
 *              .then((tabs) => {
 *                if (tabs[0].id) {
 *                  browser.tabs.sendMessage(tabs[0].id, message);
 *                }
 *              })
 *          : browser.runtime.sendMessage(message),
 *      addListener: (callback) => {
 *        browser.runtime.onMessage.addListener(callback);
 *      },
 *      removeListener: (callback) => {
 *        browser.runtime.onMessage.removeListener(callback);
 *      },
 * });
 *  ```
 */
export class Messenger<T extends BaseEvent<string, unknown>> {
  /** static record of events per context */
  private static contextEvents: Record<
    string,
    Array<BaseEvent<string, unknown>>
  > = {};

  /** connections record */
  private connections: Record<string, Connection> = {};

  /** beacon interval */
  private beaconInterval: NodeJS.Timeout | null = null;

  /** time between beacons milliseconds */
  private beaconIntervalMS: number;

  /** callback to handle messages, here for instance binding */
  private handleMessage: (
    message: TransactionMetadata & MessengerEvent<T>
  ) => void;

  /** unique id */
  private id: string;

  constructor(private options: MessengerOptions<T>) {
    // set defaults:
    this.id = options.id || uid();
    this.beaconIntervalMS = options.beaconIntervalMS || 1000;

    // start beacon interval:
    this.beaconInterval = setInterval(
      this.beacon.bind(this),
      this.beaconIntervalMS
    );

    // bind message handler:
    this.handleMessage = this._handleMessage.bind(this);

    // add listener:
    this.options.addListener(this.handleMessage);

    // if events for this context don't exist, create an empty array
    if (!(Messenger.contextEvents[this.options.context] as T[])) {
      (Messenger.contextEvents[this.options.context] as T[]) = [];
    }
  }

  private log(message: string) {
    if (this.options.debug) {
      this.options.logger.log(
        `[MESSENGER-${this.id}](${this.options.context}): ${message}`
      );
    }
  }

  /** generate a sequential id for each non-internal message */
  private getTransactionID(message: MessengerEvent<T>, target?: string) {
    if (
      !target ||
      internalEvents.includes(message.type as InternalEvent<T>["type"])
    ) {
      return -1;
    }

    if (!counters[target]) {
      counters[target] = 0;
    }

    return counters[target]++;
  }

  private addTransactionMetadata(event: MessengerEvent<T>): Transaction<T> {
    const metadata = {
      _messenger_: true,
      id: this.getTransactionID(event, event.target),
      sender: this.id,
      timestamp: Date.now(),
      context: this.options.context,
      ...(event.target && { target: event.target }),
    };

    return {
      ...metadata,
      ...event,
    };
  }

  /** there is no persistent layer bookkeeping connections,
   * so beacon to inform others of its presence */
  private beacon() {
    this.options.sendMessage(
      this.addTransactionMetadata({
        type: "MESSENGER_BEACON",
        payload: null,
      })
    );
  }

  private _handleMessage(transaction: Transaction<T>) {
    const parsed: Transaction<T> =
      typeof transaction === "string" ? JSON.parse(transaction) : transaction;

    const isFromMessenger = parsed._messenger_;
    const isFromSelf = parsed.sender === this.id;
    const isFromSameContext = parsed.context === this.options.context;
    const isTargetingOthers = parsed.target ? parsed.target !== this.id : false;
    const isKnownConnection = Boolean(this.connections[parsed.sender]);

    if (
      !isFromMessenger ||
      isFromSelf ||
      isFromSameContext ||
      isTargetingOthers ||
      (isKnownConnection && parsed.type === "MESSENGER_BEACON")
    ) {
      return;
    }

    const handlers: Record<string, (parsed: Transaction<T>) => void> = {
      MESSENGER_BEACON: this.handleBeaconMessage.bind(this),
      MESSENGER_DISCONNECT: this.handleDisconnectMessage.bind(this),
      MESSENGER_REQUEST_LOST_EVENTS: this.handleLostEventsRequest.bind(this),
    };

    const handler = handlers[(parsed as BaseEvent<string, unknown>).type];

    if (handler) {
      handler(parsed);
      return;
    }

    if (isKnownConnection) {
      const isBatch = parsed.type === "MESSENGER_EVENT_BATCH";

      const transactionID = isBatch
        ? (parsed.payload as EventsBatchEvent<T>["payload"]).events[0].id
        : parsed.id;

      if (transactionID === -1) {
        console.dir({ parsed }, { depth: null });
        return;
      }

      const { messagesReceived, desync } = this.connections[parsed.sender];

      // if we already received this message, ignore:
      if (transactionID <= messagesReceived) {
        return;
      }

      // if we missed messages, request them, unless we already did:
      if (!desync && transactionID > messagesReceived + 1) {
        const message: RequestLostEventsEvent = {
          type: "MESSENGER_REQUEST_LOST_EVENTS",
          payload: {
            messagesReceived,
          },
          target: parsed.sender,
        };

        this.options.sendMessage(this.addTransactionMetadata(message));

        this.log(
          `requesting lost messages from ${parsed.context}:${parsed.sender}`
        );

        // set desync, so we don't request again:
        this.connections[parsed.sender].desync = true;

        // don't process this message, since we requested missing ones:
        return;
      }

      if (isBatch) {
        // clear desync flag on event batch:
        this.connections[parsed.sender].desync = false;
        this.connections[parsed.sender].messagesReceived += (
          parsed.payload as EventsBatchEvent<T>["payload"]
        ).events.length;
      } else {
        this.connections[parsed.sender].messagesReceived += 1;
      }
    }

    this.options.messageCallback(parsed);

    this.log(
      `message received: ${(parsed as BaseEvent<string, unknown>).type}`
    );
  }

  private handleBeaconMessage(parsed: Transaction<T>) {
    if (this.connections[parsed.sender]) {
      return;
    }

    this.connections[parsed.sender] = {
      id: parsed.sender,
      messagesReceived: 0,
      messagesSent: 0,
      desync: false,
    };

    if ((Messenger.contextEvents[this.options.context] as T[]).length > 0) {
      const message: EventsBatchEvent<T> = {
        type: "MESSENGER_EVENT_BATCH",
        payload: {
          events: (Messenger.contextEvents[this.options.context] as T[]).map(
            (event) => this.addTransactionMetadata(event)
          ),
        },
        target: parsed.sender,
      };

      this.options.sendMessage(this.addTransactionMetadata(message));

      this.log(
        `messages [0 - ${
          (Messenger.contextEvents[this.options.context] as T[]).length - 1
        }] sent to ${parsed.context}:${parsed.sender}`
      );

      this.connections[parsed.sender].messagesSent =
        Messenger.contextEvents[this.options.context].length;
    }

    this.log(`new connection added - ${parsed.context}:${parsed.sender}`);
  }

  private handleLostEventsRequest(parsed: Transaction<T>) {
    if (
      !this.connections[parsed.sender] ||
      Messenger.contextEvents[this.options.context].length === 0
    ) {
      return;
    }

    const sentCount = this.connections[parsed.sender].messagesSent;

    const missingEvents = (
      Messenger.contextEvents[this.options.context] as T[]
    ).slice(
      sentCount,
      (Messenger.contextEvents[this.options.context] as T[]).length
    );

    if (missingEvents.length === 0) {
      return;
    }

    const message: EventsBatchEvent<T> = {
      type: "MESSENGER_EVENT_BATCH",
      payload: {
        events: missingEvents.map((event) =>
          this.addTransactionMetadata(event)
        ),
      },
      target: parsed.sender,
    };

    this.options.sendMessage(this.addTransactionMetadata(message));

    this.connections[parsed.sender].messagesSent =
      Messenger.contextEvents[parsed.context].length;

    this.log(
      `messages [0 - ${
        (Messenger.contextEvents[this.options.context] as T[]).length - 1
      }] sent to ${parsed.context}:${parsed.sender}`
    );
  }

  private handleDisconnectMessage(
    parsed: TransactionMetadata & MessengerEvent<T>
  ) {
    delete this.connections[parsed.sender];

    this.log(`disconnected - ${parsed.context}:${parsed.sender}`);
  }

  public sendMessage(message: T | string) {
    const parsed: T =
      typeof message === "string" ? JSON.parse(message) : message;

    Messenger.contextEvents[this.options.context].push(parsed);

    // send to all connections:
    Object.values(this.connections).forEach(({ id }) => {
      const msg = this.addTransactionMetadata({ target: id, ...parsed });
      this.options
        .sendMessage(msg)
        .then(() => {
          if (msg.id !== -1 && msg.target === id) {
            this.connections[id].messagesSent += 1;
          }
        })
        .catch(() => {
          this.options.handleFailedMessage?.(msg);

          this.log(
            `message failed: ${msg.context}:${id} - index: ${
              (Messenger.contextEvents[this.options.context] as T[]).length
            }`
          );
        });
    });
  }

  public destroy() {
    if (this.beaconInterval) {
      clearInterval(this.beaconInterval);
    }

    this.options.removeListener(this.handleMessage);

    Object.keys(this.connections).forEach((connection) => {
      const event: DisconnectEvent = {
        type: "MESSENGER_DISCONNECT",
        payload: null,
        target: connection,
      };
      const message = this.addTransactionMetadata(event);
      this.options.sendMessage(message);
    });

    this.log("destroyed");
  }

  static resetEvents() {
    Messenger.contextEvents = {};
  }
}
