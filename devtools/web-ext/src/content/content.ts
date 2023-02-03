import { browser } from 'webextension-polyfill-ts';
import { v4 as uuid } from 'uuid';
import {
  CONTENT_SOURCE,
  createLogger,
  Methods,
  Events,
} from '@player-tools/devtools-common';
import { INJECTED_SCRIPT_ID } from '../constants';

const logger = createLogger(CONTENT_SOURCE);

/** Create a script element to be injected into the dom */
function getScript() {
  const injectedScript = document.createElement('script');
  injectedScript.src = browser.extension.getURL('../runtime/runtime.js');
  injectedScript.id = INJECTED_SCRIPT_ID;
  return injectedScript;
}

document.documentElement.append(getScript());

/** Method type with unique identifier for tracking incoming method responses */
type MethodWithId<T extends Methods.MethodTypes = Methods.MethodTypes> = Methods.ByType<T> & { id: string };

/** Tracker for method requests sent to the frontend */
const requestsInFlight = new Map<string, (response: Methods.Method['result']) => void>();

/** Handle messages sent from the background to the content script */
browser.runtime.onMessage.addListener((request) => {
  // Forward method requests to Player context
  if (Methods.isMethod(request) && !request.result) {
    const id = uuid();
    window.postMessage({
      ...request,
      id,
    }, '*');

    return new Promise((resolve) => {
      requestsInFlight.set(id, resolve)
    })
  } else if (request.type === 'clear-store') {
    // If we clear the store, we don't care about any pending information
    requestsInFlight.clear()
  }
});

/** Send window events from Player to background */
window.addEventListener('message', ({ data, source }: MessageEvent<MethodWithId | Events.Event>) => {
  if (source !== window) return;

  if (Methods.isMethod(data) && data.result) {
    // TODO: Should this return the full method request?
    requestsInFlight.get(data.id)?.(data.result)
  } else if (Events.isEvent(data)) {
    // Forward events to background
    browser.runtime.sendMessage(data);
  }
});
