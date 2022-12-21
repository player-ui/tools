import {
  type AnyAction,
  type Dispatch,
  type Middleware,
  type EnhancedStore,
  configureStore,
  ReducersMapObject,
} from '@reduxjs/toolkit';
import { StoreState } from './state';
import {
  type MethodThunks,
  type MethodHandler,
  buildMethodThunks,
} from './actions';
import { playersReducer } from './reducers';
import { listenerMiddleware } from './middleware';
import { buildAliases } from './aliases';

const createStore = (
  methodThunks: MethodThunks,
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
      const m = getDefaultMiddleware()
        .prepend(buildAliases(methodThunks))
        .concat(listenerMiddleware.middleware);

      if (middleware) m.concat(middleware);

      return m;
    },
  });

/**
 * This function returns the players store. Accepts optional middleware and callback to enhance the store.
 * @param middleware Additional middleware to be added to the store. Optional.
 * @param reducers Additional reducers to be added to the store. Optional
 * @returns
 */
// TODO: Turn into store enhancer? Maybe remove middleware and additionalReducers?
export const createDevtoolsStore = (
  onMethodRequest: MethodHandler,
  middleware?: Middleware<any, StoreState, Dispatch<AnyAction>>,
  additionalReducers?: any
): EnhancedStore<
  StoreState,
  any,
  Middleware<any, StoreState, Dispatch<AnyAction>>[]
> =>
  createStore(
    buildMethodThunks(onMethodRequest),
    middleware,
    additionalReducers
  );
