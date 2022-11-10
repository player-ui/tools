import type {
  AliasAction,
  ConfigAction,
  DataBindingAction,
  ExpressionAction,
  StartProfilerAction,
  StopProfilerAction,
} from '@player-tools/devtools-common';
import type { AsyncRPCActions } from './actions';

export const GET_INFO_DETAILS = 'GET_INFO_DETAILS';
export const GET_CONFIG_DETAILS = 'GET_CONFIG_DETAILS';
export const GET_VIEW_DETAILS = 'GET_VIEW_DETAILS';
export const GET_DATA_BINDING_DETAILS = 'GET_DATA_BINDING_DETAILS';
export const GET_CONSOLE_EVAL = 'GET_CONSOLE_EVAL';
export const START_PROFILER = 'START_PROFILER';
export const STOP_PROFILER = 'STOP_PROFILER';

const _alias = (aliases: any) => () => (next: any) => (action: any) => {
  const alias = aliases[action.type];

  if (alias) {
    return next(alias(action));
  }

  return next(action);
};

export const buildAliases = (actions: AsyncRPCActions) =>
  _alias({
    GET_INFO_DETAILS: (action: AliasAction) =>
      actions['player-runtime-info-request'](action.payload),
    GET_CONFIG_DETAILS: (action: ConfigAction) =>
      actions['player-config-request'](action.payload),
    GET_VIEW_DETAILS: (action: AliasAction) =>
      actions['player-view-details-request'](action.payload),
    GET_DATA_BINDING_DETAILS: (action: DataBindingAction) =>
      actions['player-data-binding-details'](action.payload),
    GET_CONSOLE_EVAL: (action: ExpressionAction) =>
      actions['player-execute-expression'](action.payload),
    START_PROFILER: (action: StartProfilerAction) =>
      actions['player-start-profiler-request'](action.payload),
    STOP_PROFILER: (action: StopProfilerAction) =>
      actions['player-stop-profiler-request'](action.payload),
  });
