import type {
  Asset,
  AssetWrapper,
  Binding,
  Expression,
} from "@player-ui/types";

export interface SimpleModifier<Type extends string> {
  /** THe mofifier type */
  type: Type;
}

export const ActionRoles = [
  "primary",
  "secondary",
  "tertiary",
  "upsell",
  "back",
  "link",
  "inline-link",
  "tertiary-button",
] as const;

export type ActionRole = (typeof ActionRoles)[number];

/**
 * User actions can be represented in several places.
 * Each view typically has one or more actions that allow the user to navigate away from that view.
 * In addition, several asset types can have actions that apply to that asset only.
 */
export interface ActionAsset<AnyAsset extends Asset = Asset>
  extends Asset<"action"> {
  /** The transition value of the action in the state machine */
  value?: string;

  /** A text-like asset for the action's label */
  label?: AssetWrapper<AnyAsset>;

  /** An optional expression to execute before transitioning */
  exp?: Expression;

  /** An optional string that describes the action for screen-readers */
  accessibility?: string;

  /** An optional confirmation dialog to show before executing the action */
  confirmation?: {
    /** message asking for confirmation */
    message: string;
    /** label for the confirm button */
    affirmativeLabel: string;
    /** label for the deny button */
    negativeLabel?: string;
  };

  /** Additional optional data to assist with the action interactions on the page */
  metaData?: ActionMetaData;

  /** Triggers the listed bindings to be validated */
  validate?: Array<Binding> | Binding;
}

export interface ActionMetaData {
  // Can't pull from @cg-player/types b/c of circular dependencies
  /** beacon to send when the action runs */
  beacon?: string | Record<string, unknown>;

  /**
   * A semantic hint to render the action in different user contexts
   */
  role?: ActionRole;

  /** Force transition to the next view without checking for validation TODO need to update this to support an expression */
  skipValidation?: boolean;

  /** Size of the button */
  size?: "small" | "medium" | "large";

  /** true to indicate the button should be disabled */
  disabled?: boolean;

  /** true to indicate that the button label should be hidden */
  hideLabel?: boolean;

  /** true to indicate that the button icon should be hidden */
  hideIcon?: boolean;

  /** true to indicate that the action should display as a button instead of a link */
  showAsButton?: boolean;

  /** true to indicate to take container width, responsive: Full Width on mobile */
  fullWidth?: boolean | "responsive";
}
