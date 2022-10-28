export const RUNTIME_SOURCE = '__PLAYER_RUNTIME__';
export const CONTENT_SOURCE = '__PLAYER_CONTENT__';
export const PANEL_SOURCE = '__PLAYER_PANEL__';
export const POPUP_SOURCE = '__PLAYER__POPUP__';
export const BACKGROUND_SOURCE = '__PLAYER_BACKGROUND__';

export type MESSAGE_SOURCE =
  | typeof RUNTIME_SOURCE
  | typeof CONTENT_SOURCE
  | typeof PANEL_SOURCE
  | typeof POPUP_SOURCE
  | typeof BACKGROUND_SOURCE;
