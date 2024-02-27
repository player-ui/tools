import type { RPCController } from ".";

// This only makes sense from a window context, which would only be relevant for a web player -- thus, this _should_ come from the web player?
// TODO: Should this actually come from the web player?
export type DevtoolsMessagePublisher = (message: any) => void;
export type DevtoolsMessageSource = (controller: RPCController) => void;

export interface DevtoolsGlobals {
  // actually to publish messages
  __PLAYER_DEVTOOLS_RPC_PUBLISHERS?: DevtoolsMessagePublisher[];

  // configure events to consumer
  __PLAYER_DEVTOOLS_RPC_SOURCES?: DevtoolsMessageSource[];
}

export const setupWindowRPCPublisher = (
  devtoolsGlobals: DevtoolsGlobals,
  publishMessage: DevtoolsMessagePublisher
) => {
  if (devtoolsGlobals.__PLAYER_DEVTOOLS_RPC_PUBLISHERS) {
    devtoolsGlobals.__PLAYER_DEVTOOLS_RPC_PUBLISHERS?.push(publishMessage);
    return;
  }

  // eslint-disable-next-line no-param-reassign
  devtoolsGlobals.__PLAYER_DEVTOOLS_RPC_PUBLISHERS = [publishMessage];
};

export const setupWindowRPCSource = (
  devtoolsGlobals: DevtoolsGlobals,
  configureSource: DevtoolsMessageSource
) => {
  if (devtoolsGlobals.__PLAYER_DEVTOOLS_RPC_SOURCES) {
    devtoolsGlobals.__PLAYER_DEVTOOLS_RPC_SOURCES?.push(configureSource);
    return;
  }

  // eslint-disable-next-line no-param-reassign
  devtoolsGlobals.__PLAYER_DEVTOOLS_RPC_SOURCES = [configureSource];
};
