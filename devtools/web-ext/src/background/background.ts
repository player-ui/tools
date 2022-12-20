import { wrapStore } from 'webext-redux';
import {
  createLogger,
  BACKGROUND_SOURCE,
  type Methods,
} from '@player-tools/devtools-common';
import { createDevtoolsStore, dispatchEvents } from '@player-tools/devtools-client';
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

const store = createDevtoolsStore(sendMessage);

wrapStore(store);
logger.log('Wrapped Redux Store');

// Connect events to store
browser.runtime.onMessage.addListener(dispatchEvents(store.dispatch));
