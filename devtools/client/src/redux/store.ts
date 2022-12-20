import {
  type AnyAction,
  type Dispatch,
  type Middleware,
  type EnhancedStore,
  configureStore,
  ReducersMapObject,
} from '@reduxjs/toolkit';
import { StoreState } from './state';
import { Methods } from './actions';
import { playersReducer } from './reducers';
import { listenerMiddleware } from './middleware';
import { buildAliases } from './aliases';

const createStore = (
  methodThunks: Methods.MethodThunks,
  middleware?: Middleware<any, StoreState, Dispatch<AnyAction>>,
  reducers?: ReducersMapObject<StoreState, AnyAction>
): EnhancedStore<
  StoreState,
  any,
  Middleware<any, StoreState, Dispatch<AnyAction>>[]
> =>
  configureStore({
    reducer: {
      // TODO: Look into slices
      players: playersReducer(methodThunks),
      ...reducers,
    },
    middleware: (getDefaultMiddleware) => {
      // TODO: Potentially hook up our own middleware for dispatching additional actions from event actions
      const m = getDefaultMiddleware()
        .prepend(buildAliases(methodThunks))
        .concat(listenerMiddleware.middleware)

      if (middleware) m.prepend(middleware);

      return m;
    },
  });

/**
 * This function returns the players store. Accepts optional middleware and callback to enhance the store.
 * @param middleware Additional middleware to be added to the store. Optional.
 * @param reducers Additional reducers to be added to the store. Optional
 * @returns
 */
// TODO: Turn into store enhancer?
export const createDevtoolsStore = (
  onMethodRequest: Methods.MethodHandler,
  middleware?: Middleware<any, StoreState, Dispatch<AnyAction>>,
  additionalReducers?: any
): EnhancedStore<
  StoreState,
  any,
  Middleware<any, StoreState, Dispatch<AnyAction>>[]
> => createStore(Methods.buildAsyncThunks(onMethodRequest), middleware, additionalReducers)
