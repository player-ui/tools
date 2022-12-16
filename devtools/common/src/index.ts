import { Events as events } from './events';
import { Methods as methods } from './methods';

export * from './types';
export * from './logger';

export { Events } from './events';
export { Methods } from './methods';

// TODO: I'm really not sure about the Runtime namespace
export namespace Runtime {
  // export const Methods = methods;
  // export const Events = events;
  // export namespace Methods {}
  // export namespace Events {}
}
