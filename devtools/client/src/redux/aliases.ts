import { Methods as RuntimeMethods, RUNTIME_SOURCE } from '@player-tools/devtools-common';
import { Methods } from './actions';

export const GET_INFO_DETAILS = 'GET_INFO_DETAILS';
export const GET_CONFIG_DETAILS = 'GET_CONFIG_DETAILS';
export const GET_VIEW_DETAILS = 'GET_VIEW_DETAILS';
export const GET_DATA_BINDING_DETAILS = 'GET_DATA_BINDING_DETAILS';
export const GET_CONSOLE_EVAL = 'GET_CONSOLE_EVAL';
export const START_PROFILER = 'START_PROFILER';
export const STOP_PROFILER = 'STOP_PROFILER';


export interface MethodAction<T extends RuntimeMethods.MethodTypes> {
  payload: RuntimeMethods.ByType<T>['params'];
}

// Copied from webext redux library not allowed in flipper
const _alias = (aliases: any) => () => (next: any) => (action: any) => {
  const alias = aliases[action.type];

  if (alias) {
    return next(alias(action));
  }

  return next(action);
};

// TODO: Make sure typings are correct here
const alias = <T extends RuntimeMethods.MethodTypes>(type: T, methods: Methods.MethodThunks) => (action: MethodAction<T>) => methods[type]({
  type,
  params: action.payload,
  source: RUNTIME_SOURCE,
} as RuntimeMethods.ByType<T>)

export const buildAliases = (methods: Methods.MethodThunks) =>
  _alias({
    GET_INFO_DETAILS: alias('player-runtime-info-request', methods),
    GET_CONFIG_DETAILS: alias('player-config-request', methods),
    GET_VIEW_DETAILS: alias('player-view-details-request', methods),
    GET_DATA_BINDING_DETAILS: alias('player-data-binding-details', methods),
    GET_CONSOLE_EVAL: alias('player-execute-expression', methods),
    START_PROFILER: alias('player-start-profiler-request', methods),
    STOP_PROFILER: alias('player-stop-profiler-request', methods),
  });
