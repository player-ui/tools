import {
  BACKGROUND_SOURCE,
  createLogger,
  Methods,
} from '@player-tools/devtools-common';
import { createAsyncThunk, type AsyncThunk } from '@reduxjs/toolkit';

const logger = createLogger(BACKGROUND_SOURCE);

/** Type describing an object containing async thunks for each Method defined */
export type MethodThunks = {
  [key in Methods.Method['type']]: AsyncThunk<
    Methods.ByType<key>['result'],
    Methods.ByType<key>,
    any
  >;
};

/** Signature for handling method requests */
export type MethodHandler = <T extends Methods.MethodTypes>(
  method: Methods.ByType<T>
) => Promise<Methods.ByType<T>['result']>;

/** Utility for building async thunks for all known method types */
export const buildMethodThunks = (
  onMethodRequest: MethodHandler
): MethodThunks =>
  Object.fromEntries(
    Methods.MethodTypes.map((method) => [
      method,
      createAsyncThunk<
        Methods.ByType<typeof method>['result'],
        Methods.ByType<typeof method>
      >(method, async (method) => {
        logger.log(`Requesting ${method.type}`, method.params);
        const data = (await onMethodRequest(method)) as Methods.ByType<
          typeof method.type
        >['result'];
        logger.log(`Response from ${method.type}`, data);
        return data;
      }),
    ])
  ) as MethodThunks;
