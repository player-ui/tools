import type {
  ComponentType,
  Context,
  ContextStackItem,
  Provider,
  JSXElement,
  ProviderProps,
} from "./types";

const componentKeys = new Map<ComponentType, string>();
let nextComponentId = 1;

let currentComponent: ComponentType | null = null;

const contextStack: Array<ContextStackItem> = [];

export function setCurrentComponent(component: ComponentType | null) {
  currentComponent = component;

  // Assign stable component ID if it's a new component
  if (component && !componentKeys.has(component)) {
    componentKeys.set(component, `component_${nextComponentId++}`);
  }
}

export function createContext<T>(defaultValue: T): Context<T> {
  const context: Partial<Context<T>> = {
    $$typeof: Symbol.for("jsx.context"),
    _defaultValue: defaultValue,
  };

  const providerFunction = (props: ProviderProps<T>): JSXElement => ({
    type: providerFunction,
    props,
    $$typeof: Symbol.for("jsx.element"),
  });

  providerFunction.$$typeof = Symbol.for("jsx.provider");
  providerFunction._context = context as Context<T>;

  context.Provider = providerFunction as Provider<T>;

  return context as Context<T>;
}

export function useContext<T>(context: Context<T>): T {
  for (let i = contextStack.length - 1; i >= 0; i--) {
    if (contextStack[i].context === context) {
      return contextStack[i].value as T;
    }
  }

  return context._defaultValue;
}

export function pushContext<T>(context: Context<T>, value: T): void {
  contextStack.push({ context, value });
}

export function popContext(): void {
  contextStack.pop();
}

/**
 * Get the currently rendering component
 * @returns The current component function
 */
export function getCurrentComponent(): ComponentType | null {
  return currentComponent;
}

export function resetHookState() {
  contextStack.length = 0;
  componentKeys.clear();
  nextComponentId = 1;
  currentComponent = null;
}
