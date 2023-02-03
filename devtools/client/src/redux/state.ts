import { Flow, View } from '@player-ui/types';
import { Methods, Events, ProfilerNode } from '@player-tools/devtools-common';

export type ActivePlayerState = {
  /**
   * state associated with player config
   */
  configState?: Methods.PlayerConfigMethod['result'] | null;
  /**
   * Flow related Information of the player.
   */
  flowInfo?: Methods.PlayerRuntimeInfoMethod['result'] | null;
  /**
   * A collection of all the events associated with the running player instance.
   */
  timelineEvents: Array<Events.TimelineEvents>;
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
  selectedBinding?: Methods.PlayerDataBindingMethod['result'];
  /**
   * All the bindings in the data state.
   */
  allBindings?: Methods.PlayerDataBindingMethod['result'];
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
    result: Methods.PlayerExpressionMethod['result'];
  }>;
}
