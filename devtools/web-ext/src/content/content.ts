import { browser } from 'webextension-polyfill-ts';
import {
  Message,
  RUNTIME_SOURCE,
  CONTENT_SOURCE,
  createLogger,
} from '@player-tools/devtools-common';
import { handleMessage } from '@player-tools/devtools-client';
import { INJECTED_SCRIPT_ID } from '../constants';

const logger = createLogger(CONTENT_SOURCE);

/** Create a script element to be injected into the dom */
function getScript() {
  const injectedScript = document.createElement('script');
  injectedScript.src = browser.extension.getURL('../runtime/runtime.js');
  injectedScript.id = INJECTED_SCRIPT_ID;
  return injectedScript;
}

// TODO: Barf
document.documentElement.append(getScript());

browser.runtime.onMessage.addListener((message) => {
  window.postMessage(message, '*');
});

window.addEventListener('message', (event: MessageEvent<Message>) => {
  if (event.source !== window) {
    return;
  }

  if (event.data.source === RUNTIME_SOURCE) {
    logger.log('Sending Message to Background', event.data);
    // TODO: I hate that we're diverging here, like just send to a single place and observe from there
    browser.runtime.sendMessage(event.data);
    handleMessage(event.data);
  }
});
