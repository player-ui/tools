import { wrapStore } from 'webext-redux';
import { v4 as uuid } from 'uuid';
import {
  createLogger,
  BACKGROUND_SOURCE,
  type Methods,
} from '@player-tools/devtools-common';
import { createDevtoolsStore } from '@player-tools/devtools-client';
import { browser, Tabs } from 'webextension-polyfill-ts';

const logger = createLogger(BACKGROUND_SOURCE);
const requestsInFlight = new Map<string, (response: Methods.Method['result']) => void>();

// TODO: Not sure if this belongs in background
browser.runtime.onMessage.addListener((message) => {
  logger.log('i gots a message: ' + JSON.stringify(message));

  const handler = requestsInFlight.get(message.id);
  requestsInFlight.delete(message.id);
  handler?.(message.result);
});

async function sendMessage(message: Methods.Method & { id: string }) {
  const tabs: Tabs.Tab[] = await browser.tabs.query({
    active: true,
    currentWindow: true,
  });
  const tabId = tabs[0]?.id;
  if (!tabId) {
    return;
  }

  // TODO: Can we just use the return value here?
  browser.tabs.sendMessage(tabId, message);
}


// Delegate to plugin for how to handle communications
const methodHandler = async <T extends Methods.MethodTypes>(
  method: Methods.ByType<T>
): Promise<Methods.ByType<T>['result']> => {
  return new Promise((resolve) => {
    const id = uuid();

    const message = {
      ...method,
      id,
      // TODO: Why can't I just send method w/ a uuid?
      // params: method.params,
      // type: method.type,
    }

    // const result = {} as Methods.ByType<T>['result']
    // resolve(result)

    requestsInFlight.set(id, resolve as any);
    sendMessage(message)
  })
};

// TODO: publish message
wrapStore(createDevtoolsStore(methodHandler));
logger.log('Wrapped Redux Store');
