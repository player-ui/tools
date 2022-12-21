import { wrapStore } from 'webext-redux';
import {
  createLogger,
  BACKGROUND_SOURCE,
  type Methods,
} from '@player-tools/devtools-common';
import { createDevtoolsStore, dispatchEvents, Actions, listenerMiddleware } from '@player-tools/devtools-client';
import { browser } from 'webextension-polyfill-ts';

const logger = createLogger(BACKGROUND_SOURCE);

async function sendMessage<T extends Methods.MethodTypes>(
  method: Methods.ByType<T>,
): Promise<Methods.ByType<T>['result']> {
  const [{ id: tabId }] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (!tabId) return Promise.reject("could not find active tab");

  return await browser.tabs.sendMessage(tabId, method);
}

// Configure middleware to forward 'clear-store' actions
// to the content script so it can clear any caches when
// we reset the store! This also serves as an example for
// how to configure other side effects, if necessary.
listenerMiddleware.startListening({
  actionCreator: Actions['clear-store'],
  effect: sendMessage,
})

const store = createDevtoolsStore(sendMessage);

wrapStore(store);
logger.log('Wrapped Redux Store');

// Connect events to store
browser.runtime.onMessage.addListener(dispatchEvents(store.dispatch));
