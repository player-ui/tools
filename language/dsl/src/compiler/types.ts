import type {
  Schema,
  Navigation,
  Flow,
  Expression,
  ExpressionObject,
  NavigationFlow,
  NavigationFlowState,
  NavigationFlowViewState,
} from '@player-ui/types';
import type { RemoveUnknownIndex, AddUnknownIndex } from '../types';

export type NavigationFlowReactViewState = Omit<
  NavigationFlowViewState,
  'ref'
> & {
  /** The view element */
  ref: React.ReactElement | string;
};

export type NavFlowState =
  | Exclude<NavigationFlowState, NavigationFlowViewState>
  | NavigationFlowReactViewState;

export type NavigationFlowWithReactView = Pick<
  NavigationFlow,
  'startState' | 'onStart' | 'onEnd'
> & {
  [key: string]:
    | undefined
    | string
    | Expression
    | ExpressionObject
    | NavFlowState;
};

export type NavigationWithReactViews = Pick<Navigation, 'BEGIN'> &
  Record<string, string | NavigationFlowWithReactView>;

export type FlowWithoutUnknown = RemoveUnknownIndex<Flow>;
export type FlowWithReactViews = AddUnknownIndex<
  Omit<FlowWithoutUnknown, 'views' | 'navigation'> & {
    /** An array of JSX view elements */
    views?: Array<React.ReactElement>;

    /** The navigation element */
    navigation?: NavigationWithReactViews;
  }
>;

export type DSLFlow = FlowWithReactViews;

export interface DSLSchema {
  [key: string]: Schema.DataType | DSLSchema;
}

export type SerializeType = 'view' | 'flow' | 'schema' | 'navigation';

export type SerializablePlayerExportTypes =
  | React.ReactElement
  | FlowWithReactViews
  | Schema.Schema
  | Navigation;

export type LoggingInterface = Pick<Console, 'warn' | 'error' | 'log'>;
