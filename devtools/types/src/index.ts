import type { Flow } from "@player-ui/types";

export interface BaseEvent<T extends string, P> {
  /** Event type */
  type: T;
  /** Event payload */
  payload: P;
}

export type TransactionMetadata = {
  /** Unique ID */
  id: number;
  /** Timestamp */
  timestamp: number;
  /** Sender ID */
  sender: string;
  /** Target ID */
  target?: string;
  /** Context */
  context: "player" | "devtools";
  /** Messenger tag */
  _messenger_: boolean;
};

export type BeaconEvent = BaseEvent<"MESSENGER_BEACON", null>;

export type EventsBatchEvent<T extends BaseEvent<string, unknown>> = BaseEvent<
  "MESSENGER_EVENT_BATCH",
  {
    /** Array of Events */
    events: (MessengerEvent<T> & TransactionMetadata)[];
  }
>;

export type RequestLostEventsEvent = BaseEvent<
  "MESSENGER_REQUEST_LOST_EVENTS",
  {
    /** Last received message id */
    lastReceivedMessageId: number;
  }
>;

export type DisconnectEvent = BaseEvent<"MESSENGER_DISCONNECT", null>;

export type InternalEvent<T extends BaseEvent<string, unknown>> =
  | BeaconEvent
  | RequestLostEventsEvent
  | EventsBatchEvent<T>
  | DisconnectEvent;

export type MessengerEvent<T extends BaseEvent<string, unknown>> =
  | T
  | InternalEvent<T>;

export type Transaction<T extends BaseEvent<string, unknown>> =
  TransactionMetadata & MessengerEvent<T>;

export type Connection = {
  /** Target ID */
  id: string;
  /** Last sent message id */
  lastSentMessageId: number;
  /** Last received message id */
  lastReceivedMessageId: number;
  /** Lost events since the last one received */
  desync: boolean;
};

/** Messenger options */
export interface MessengerOptions<T extends BaseEvent<string, unknown>> {
  /** API to send messages (e.g. window.postMessage, browser.runtime.sendMessage) */
  sendMessage: (message: MessengerEvent<T>) => Promise<void>;
  /** API to add a listener (e.g. window.addEventListener, browser.runtime.onMessage.addListener) */
  addListener: (
    callback: (message: TransactionMetadata & MessengerEvent<T>) => void
  ) => void;
  /** API to remove a listener (e.g. window.removeEventListener, browser.runtime.onMessage.removeListener) */
  removeListener: (
    callback: (message: TransactionMetadata & MessengerEvent<T>) => void
  ) => void;
  /** Callback to handle messages */
  messageCallback: (message: TransactionMetadata & MessengerEvent<T>) => void;
  /** Context */
  context: "player" | "devtools";
  /** Unique id */
  id?: string;
  /** Time between beacons in ms */
  beaconIntervalMS?: number;
  /** Debug mode */
  debug?: boolean;
  /** Handle failed message */
  handleFailedMessage?: (message: Transaction<T>) => void;
  /** Logger */
  logger: {
    /** Log message */
    log: (...args: Array<unknown>) => void;
  };
}

/** Plugin data */
export interface PluginData {
  /** Plugin id */
  id: string;
  /** Plugin version */
  version: string;
  /** Plugin name */
  name: string;
  /** Plugin description */
  description: string;
  /** Plugin UI */
  flow: Flow;
}

export interface ExtensionState {
  /** currently being inspected */
  current: {
    /** player */
    player: string | null;
    /** plugin */
    plugin: string | null;
  };
  /**  */
  players: Record<
    string,
    {
      /** registeredPlugins */
      plugins: Record<string, PluginData>;
      /** active */
      active: boolean;
    }
  >;
}

interface InitPayload {
  /** Devtools plugins */
  plugins: Record<string, PluginData>;
}

interface FlowChangePayload {
  /** Flow */
  flow: Partial<Flow>;
  /** Plugin ID */
  pluginID: string;
}

interface DataChangePayload {
  /** Data */
  data: Flow["data"];
  /** Plugin ID */
  pluginID: string;
}

interface EventsBatchPayload {
  /** Events */
  events: Array<TransactionMetadata & MessengerEvent<ExtensionSupportedEvents>>;
}

/** Proxy events from the devtools player to the devtools plungins */
interface PluginInteractionPayload {
  /** Interaction Type */
  type: string;
  /** Stringified payload */
  payload?: string;
}

export type PlayerInitEvent = BaseEvent<
  "PLAYER_DEVTOOLS_PLAYER_INIT",
  InitPayload
>;

export type DevtoolsFlowChangeEvent = BaseEvent<
  "PLAYER_DEVTOOLS_PLUGIN_FLOW_CHANGE",
  FlowChangePayload
>;

export type DevtoolsDataChangeEvent = BaseEvent<
  "PLAYER_DEVTOOLS_PLUGIN_DATA_CHANGE",
  DataChangePayload
>;

export type PlayerStoppedEvent = BaseEvent<
  "PLAYER_DEVTOOLS_PLAYER_STOPPED",
  null
>;

export type DevtoolsEventsBatchEvent = BaseEvent<
  "MESSENGER_EVENT_BATCH",
  EventsBatchPayload
>;

export type ExtensionSelectedPlayerEvent = BaseEvent<
  "PLAYER_DEVTOOLS_PLAYER_SELECTED",
  {
    /** Player ID */
    playerID: string;
  }
>;

export type ExtensionSelectedPluginEvent = BaseEvent<
  "PLAYER_DEVTOOLS_PLUGIN_SELECTED",
  {
    /** Plugin ID */
    pluginID: string;
  }
>;

export type DevtoolsPluginInteractionEvent = BaseEvent<
  "PLAYER_DEVTOOLS_PLUGIN_INTERACTION",
  PluginInteractionPayload
>;

export type ExtensionSupportedEvents =
  | PlayerInitEvent
  | DevtoolsFlowChangeEvent
  | DevtoolsDataChangeEvent
  | PlayerStoppedEvent
  | DevtoolsEventsBatchEvent
  | ExtensionSelectedPlayerEvent
  | ExtensionSelectedPluginEvent
  | BeaconEvent
  | DisconnectEvent
  | DevtoolsPluginInteractionEvent;

export type CommunicationLayerMethods = Pick<
  MessengerOptions<ExtensionSupportedEvents>,
  "sendMessage" | "addListener" | "removeListener"
>;

/** Interface representing the Devtools Plugins Store. */
export interface DevtoolsPluginsStore {
  /** Plugins data. */
  plugins: Record<string, PluginData>;
  /** Array of supported events. */
  messages: Array<ExtensionSupportedEvents>;
  /** Array of interactions triggered from the Devtools Player Content by plugin and player */
  interactions: Array<DevtoolsPluginInteractionEvent>;
}
