import { type ActionReducerMapBuilder, createReducer } from '@reduxjs/toolkit';
import type { PlayersState } from './state';
import { Actions, EventActions, type MethodThunks } from './actions';

const initialState = {
  selectedPlayerId: null,
  activePlayers: {},
} as PlayersState;

const methodsReducer = (methods: MethodThunks) => (builder: ActionReducerMapBuilder<PlayersState>) => {
  builder.addCase(
    methods['player-runtime-info-request'].fulfilled,
    (state, action) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) {
        return;
      }

      const data =
        action.payload && Object.keys(action.payload).length > 0
          ? action.payload
          : null;
      activePlayers[selectedPlayerId].flowInfo = data;
    }
  );

  builder.addCase(
    methods['player-config-request'].fulfilled,
    (state, action) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) {
        return;
      }

      activePlayers[selectedPlayerId].configState = action.payload;
    }
  );

  builder.addCase(
    methods['player-view-details-request'].fulfilled,
    (state, action) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) {
        return;
      }

      activePlayers[selectedPlayerId].view = action.payload?.lastViewUpdate;
    }
  );

  builder.addCase(
    methods['player-data-binding-details'].fulfilled,
    (state, action) => {
      const {
        meta: {
          arg: { params: { binding, playerID } },
        },
        payload,
      } = action;
      const { activePlayers } = state;

      if (!playerID || !activePlayers[playerID]) {
        return;
      }

      if (binding === '') {
        activePlayers[playerID].dataState.allBindings = payload;
        return;
      }

      activePlayers[playerID].dataState.selectedBinding = payload;
    }
  );

  builder.addCase(
    methods['player-execute-expression'].fulfilled,
    (state, action) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) {
        return;
      }

      activePlayers[selectedPlayerId].consoleState?.history?.push({
        id: action.meta.requestId,
        result: action.payload,
        expression: action.payload?.exp ?? '',
      });
    }
  );

  builder.addCase(
    methods['player-start-profiler-request'].fulfilled,
    (state, action) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) return;

      activePlayers[selectedPlayerId].profilerInfo = action.payload?.data;
    }
  );

  builder.addCase(
    methods['player-stop-profiler-request'].fulfilled,
    (state, action) => {
      const { activePlayers, selectedPlayerId } = state;

      if (!selectedPlayerId) return;

      activePlayers[selectedPlayerId].profilerInfo = action.payload?.data;
    }
  );
};

const eventsReducer = (builder: ActionReducerMapBuilder<PlayersState>) => {
  builder.addCase(EventActions['player-init'], (state, action) => {
    const {
      payload: { version, playerID },
    } = action;
    state.activePlayers[playerID] = {
      timelineEvents: [],
      dataState: {},
      consoleState: { history: [] },
    };
    state.version = version;
  });

  builder.addCase(EventActions['player-removed'], (state, action) => {
    delete state.activePlayers[action.payload.playerID];
  });

  builder.addCase(EventActions['player-flow-start'], (state, action) => {
    const {
      payload: { flow, playerID },
    } = action;

    if (!state.activePlayers[playerID]) {
      state.activePlayers[playerID] = {
        flowInfo: { currentFlow: flow },
        timelineEvents: [],
        dataState: {},
        consoleState: { history: [] },
      };
      state.selectedPlayerId = playerID;
      return;
    }

    state.activePlayers[playerID].flowInfo = {
      ...state.activePlayers[playerID].flowInfo,
      currentFlow: flow,
    };
  });

  builder.addCase(EventActions['player-view-update-event'], (state, action) => {
    const {
      payload: { playerID, update },
    } = action;

    if (!state.activePlayers[playerID]) {
      state.activePlayers[playerID] = {
        view: update,
        timelineEvents: [],
        dataState: {},
        consoleState: { history: [] },
      };
      state.selectedPlayerId = playerID;
      return;
    }

    state.activePlayers[playerID].view = update;
  });
};

const actionsReducer = (builder: ActionReducerMapBuilder<PlayersState>) => {
  builder.addCase(Actions['selected-player'], (state, action) => {
    if (action.payload) {
      state.selectedPlayerId = action.payload;
      return;
    }

    state.selectedPlayerId = Object.keys(state.activePlayers)[0] || null;
  });

  builder.addCase(Actions['player-timeline-event'], (state, action) => {
    const {
      payload: { playerID },
    } = action;

    if (!state.activePlayers[playerID]) {
      state.activePlayers[playerID] = {
        timelineEvents: [action.payload],
        dataState: {},
        consoleState: { history: [] },
      };
      state.selectedPlayerId = playerID;
      return;
    }

    state.activePlayers[playerID].timelineEvents.push(action.payload);
  });

  builder.addCase(Actions['clear-selected-data-details'], (state) => {
    const { activePlayers, selectedPlayerId } = state;

    if (!selectedPlayerId || !activePlayers[selectedPlayerId]) {
      return;
    }

    activePlayers[selectedPlayerId].dataState.selectedBinding = undefined;
  });

  builder.addCase(Actions['clear-console'], (state) => {
    const { activePlayers, selectedPlayerId } = state;

    if (!selectedPlayerId) {
      return;
    }

    activePlayers[selectedPlayerId].consoleState = {
      history: [],
    };
  });

  builder.addCase(Actions['clear-logs'], (state) => {
    const { activePlayers, selectedPlayerId } = state;

    if (!selectedPlayerId) {
      return;
    }

    activePlayers[selectedPlayerId].timelineEvents = [];
  });

  builder.addCase(Actions['clear-store'], () => {
    return initialState;
  });
};

export const playersReducer = (methods: MethodThunks) =>
  createReducer<PlayersState>(initialState, (builder) => {
    actionsReducer(builder)
    eventsReducer(builder)
    methodsReducer(methods)(builder)
  });
