import { browser } from 'webextension-polyfill-ts';

browser.devtools.panels.create(
  'Player',
  '../media/player-logo.png',
  '/panel/panel.html'
);
