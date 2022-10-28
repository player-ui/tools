import { Flow, View } from '@player-ui/types';
import { Runtime } from '.';

export type ActivePlayerState = {
  /**
   * state associated with player config
   */
  configState?: Runtime.PlayerConfigRPC['result'] | null;
  /**
   * Flow related Information of the player.
   */
  flowInfo?: Runtime.PlayerRuntimeInfoRPC['result'] | null;
  /**
   * A collection of all the events associated with the running player instance.
   */
  timelineEvents: Array<
    | Runtime.PlayerDataChangeEvent
    | Runtime.PlayerLogEvent
    | Runtime.PlayerFlowStartEvent
  >;
  /**
   * View related information of the player.
   */
  view?: View | undefined;
  /**
   * State assocaited with the data of the player
   */
  dataState: DataState;
  /**
   * State associated with the console evaluations.
   */
  consoleState: ConsoleState;
  /**
   * profiler related information of the player
   */
  profilerInfo?: ProfilerNode | null;
};

export type PlayersState = {
  /**
   * This represents the currently selected player id.
   */
  selectedPlayerId: string | null;
  /**
   * Collection of all the players active on the web page.
   */
  activePlayers: Record<string, ActivePlayerState>;
  /**
   * Web Player version
   */
  version: string;
};

export type StoreState = {
  /**
   * State related to all the players on the web page.
   */
  players: PlayersState;
};

export type FlowInfoState = {
  /**
   * Current Flow Id.
   */
  currentFlowID?: string;
  /**
   * Current Flow State
   */
  currentFlowState?: string;
  /**
   * Current View Id.
   */
  currentViewID?: string;
  /**
   * Current FLow
   */
  currentFlow?: Flow;
};

export type DataState = {
  /**
   * The binding selected on the Data panel.
   */
  selectedBinding?: Runtime.PlayerDataBindingRPC['result'];
  /**
   * All the bindings in the data state.
   */
  allBindings?: Runtime.PlayerDataBindingRPC['result'];
};

export interface ConsoleState {
  /**
   * History of all the console evaluations
   */
  history: Array<{
    /**
     * Unique Id representing a Console evaluation.
     */
    id: string;
    /**
     * Expression being evaluated.
     */
    expression: string;
    /**
     * Result of the console evaluation.
     */
    result: Runtime.PlayerExpressionRPC['result'];
  }>;
}

export type ProfilerNode = {
  /**
   * hook name
   */
  name: string;
  /**
   * startTime of the hook
   */
  startTime?: number;
  /**
   * endTime of the hook
   */
  endTime?: number;
  /**
   * duration of hook resolution times
   * unit: ms
   */
  value?: number;
  /**
   * tooltip to be shown on hover
   */
  tooltip?: string;
  /**
   * subhook profiler nodes
   */
  children: ProfilerNode[];
};
