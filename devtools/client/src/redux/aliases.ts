import { Methods as Methods, RUNTIME_SOURCE } from '@player-tools/devtools-common';
import { MethodThunks } from './actions/methods';

export const GET_INFO_DETAILS = 'GET_INFO_DETAILS';
export const GET_CONFIG_DETAILS = 'GET_CONFIG_DETAILS';
export const GET_VIEW_DETAILS = 'GET_VIEW_DETAILS';
export const GET_DATA_BINDING_DETAILS = 'GET_DATA_BINDING_DETAILS';
export const GET_CONSOLE_EVAL = 'GET_CONSOLE_EVAL';
export const START_PROFILER = 'START_PROFILER';
export const STOP_PROFILER = 'STOP_PROFILER';


interface MethodAction<T extends Methods.MethodTypes> {
  payload: Methods.ByType<T>['params'];
}

// Copied from webext redux library not allowed in flipper
const _alias = (aliases: any) => () => (next: any) => (action: any) => {
  const alias = aliases[action.type];

  if (alias) {
    return next(alias(action));
  }

  return next(action);
};

/** Helper for building corresponding method action via supplied thunks */
const alias = <T extends Methods.MethodTypes>(type: T, methods: MethodThunks) => (action: MethodAction<T>) => methods[type]({
  type,
  params: action.payload,
  source: RUNTIME_SOURCE,
} as Methods.ByType<T>)

export const buildAliases = (methods: MethodThunks) =>
  _alias({
    GET_INFO_DETAILS: alias('player-runtime-info-request', methods),
    GET_CONFIG_DETAILS: alias('player-config-request', methods),
    GET_VIEW_DETAILS: alias('player-view-details-request', methods),
    GET_DATA_BINDING_DETAILS: alias('player-data-binding-details', methods),
    GET_CONSOLE_EVAL: alias('player-execute-expression', methods),
    START_PROFILER: alias('player-start-profiler-request', methods),
    STOP_PROFILER: alias('player-stop-profiler-request', methods),
  });
