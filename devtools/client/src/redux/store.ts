import {
  type AnyAction,
  type Dispatch,
  type Middleware,
  type MiddlewareArray,
  type ActionReducerMapBuilder,
  type EnhancedStore,
  configureStore,
  createReducer,
  combineReducers,
  createAsyncThunk,
} from '@reduxjs/toolkit';
import { Message } from '@player-tools/devtools-common';
import { PlayersState, StoreState } from './state';
import { Methods } from './actions';
import { playersReducer } from './reducers';
import { listenerMiddleware } from './middleware';

/**
 * This function returns the players store. Accepts optional middleware and callback to enhance the store.
 * @param middleware : Middleware to be added to the store. Optional.
 * @param additionalReducers Additional reducers to be added to the store. Optional
 * @returns
 */
export const createDevtoolsStore = (
  onMethodRequest: Methods.MethodHandler,
  middleware?: Middleware<any, StoreState, Dispatch<AnyAction>>,
  additionalReducers?: any,
): EnhancedStore<
  StoreState,
  any,
  Middleware<any, StoreState, Dispatch<AnyAction>>[]
> =>
  configureStore({
    reducer: {
      // TODO: Look into slices
      players: playersReducer(Methods.buildAsyncThunks(onMethodRequest)),
      ...additionalReducers,
    },
    middleware: (getDefaultMiddleware) => {
      // TODO: Potentially hook up our own middleware for dispatching additional actions from event actions
      const m = getDefaultMiddleware()
        .concat(listenerMiddleware.middleware)

      if (middleware) m.prepend(middleware)

      return m
    }
  });
