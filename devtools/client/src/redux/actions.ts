import { type AsyncThunk, createAsyncThunk } from '@reduxjs/toolkit';
import {
  Runtime,
  createLogger,
  BACKGROUND_SOURCE,
} from '@player-tools/devtools-common';
import type { RuntimeRPCRequestHandlers } from '../rpc';

const logger = createLogger(BACKGROUND_SOURCE);

export type AsyncRPCActions = {
  [key in Runtime.RuntimeRPCTypes]: AsyncThunk<
    Extract<Runtime.RuntimeRPC, { type: key }>['result'],
    Extract<Runtime.RuntimeRPC, { type: key }>['params'],
    any
  >;
};

export const buildRPCActions = (
  handlers: RuntimeRPCRequestHandlers
): AsyncRPCActions =>
  Runtime.RuntimeRPCTypes.reduce((acc, rpcType) => {
    // TODO: Fix this
    // @ts-ignore
    acc[rpcType] = createAsyncThunk<
      Extract<Runtime.RuntimeRPC, { type: typeof rpcType }>['result'],
      Extract<Runtime.RuntimeRPC, { type: typeof rpcType }>['params']
    >(rpcType, async (params) => {
      logger.log(`Requesting ${rpcType}`, params);
      const data = (await handlers[rpcType].call(params)) as Extract<
        Runtime.RuntimeRPC,
        { type: typeof rpcType }
      >['result'];
      logger.log(`Response from ${rpcType}`, data);
      return data;
    });
    return acc;
  }, {} as AsyncRPCActions);
