import type { Asset } from "@player-ui/types";
import type { ActionAsset } from "../types/action";
import {
  type ParentCtx,
  type ExtractBuilderArgs,
  BaseFluentBuilder,
} from "../../types";
import { genId } from "../../id-generator";
import { createAssetWrapper } from "../../asset-wrapper";
import {
  markAsBuilder,
  safeFromMixedType,
  safeToBoolean,
  safeToString,
} from "../../utils";

/**
 * Derived builder args type for ActionAsset
 */
type ActionBuilderArgs<AnyTextAsset extends Asset = Asset> = ExtractBuilderArgs<
  ActionAsset<AnyTextAsset>
>;

/**
 * Internal state for the action component
 * Stores the current asset state
 */
interface ActionComponentState<AnyTextAsset extends Asset = Asset> {
  /** The action asset being built */
  asset: ActionAsset<AnyTextAsset>;
  /** The label asset to be built when the component is called */
  labelAsset?: AnyTextAsset | (<K extends ParentCtx>(ctx: K) => AnyTextAsset);
}

/**
 * User actions can be represented in several places.
 * Each view typically has one or more actions that allow the user to navigate away from that view.
 * In addition, several asset types can have actions that apply to that asset only.
 *
 * This interface is a callable Action component with a fluent API for configuring Actions
 */
export interface ActionComponent<AnyTextAsset extends Asset = Asset>
  extends BaseFluentBuilder<ActionComponent<AnyTextAsset>> {
  /** Generate the ActionAsset with context */
  <K extends ParentCtx>(ctx: K): ActionAsset<AnyTextAsset>;

  /** The transition value of the action in the state machine */
  withValue: (
    value: NonNullable<ActionBuilderArgs<AnyTextAsset>["value"]>,
  ) => ActionComponent<AnyTextAsset>;

  /** A text-like asset for the action's label */
  withLabel: (
    label: NonNullable<ActionBuilderArgs<AnyTextAsset>["label"]>,
  ) => ActionComponent<AnyTextAsset>;

  /** An optional expression to execute before transitioning */
  withExp: (
    exp: NonNullable<ActionBuilderArgs<AnyTextAsset>["exp"]>,
  ) => ActionComponent<AnyTextAsset>;

  /** An optional string that describes the action for screen-readers */
  withAccessibility: (
    accessibility: NonNullable<
      ActionBuilderArgs<AnyTextAsset>["accessibility"]
    >,
  ) => ActionComponent<AnyTextAsset>;

  /** Additional data to beacon */
  withMetaDataBeacon: (
    beacon: NonNullable<
      NonNullable<ActionBuilderArgs<AnyTextAsset>["metaData"]>["beacon"]
    >,
  ) => ActionComponent<AnyTextAsset>;

  /** Force transition to the next view without checking for validation */
  withMetaDataSkipValidation: (
    skipValidation: NonNullable<
      NonNullable<ActionBuilderArgs<AnyTextAsset>["metaData"]>["skipValidation"]
    >,
  ) => ActionComponent<AnyTextAsset>;

  /** string value to decide for the left anchor sign */
  withMetaDataRole: (
    role: NonNullable<
      NonNullable<ActionBuilderArgs<AnyTextAsset>["metaData"]>["role"]
    >,
  ) => ActionComponent<AnyTextAsset>;

  /** Additional optional data to assist with the action interactions on the page */
  withMetaData: (
    metaData: NonNullable<ActionBuilderArgs<AnyTextAsset>["metaData"]>,
  ) => ActionComponent<AnyTextAsset>;

  /** @private Component state */
  state: ActionComponentState<AnyTextAsset>;
}

/** Creates a action component with a fluent API for configuration. */
export function action<AnyTextAsset extends Asset = Asset>(
  args?: Partial<ActionBuilderArgs<AnyTextAsset>>,
): ActionComponent<AnyTextAsset> {
  // Initialize the component state
  const state: ActionComponentState<AnyTextAsset> = {
    asset: {
      id: "",
      type: "action",
    },
  };

  // Create the component function
  const component = (<K extends ParentCtx>(_ctx: K) => {
    // If the asset has an id, use it otherwise generate a new id using the genId function
    const ctx = component.state.asset.id
      ? {
          ..._ctx,
          parentId: component.state.asset.id,
          branch: { type: "custom" },
        }
      : _ctx;
    const id = genId(ctx);

    // Create the result asset
    const result = {
      ...component.state.asset,
      id,
    } as ActionAsset<AnyTextAsset>;

    // Handle label if present
    if (component.state.labelAsset) {
      result.label = createAssetWrapper(
        component.state.labelAsset,
        ctx,
        "label",
      );
    }

    return result;
  }) as ActionComponent<AnyTextAsset>;

  // Set the initial state
  component.state = state;

  // Define chainable methods
  component.withId = (id) => {
    component.state.asset.id = safeToString(id);
    return component;
  };

  component.withValue = (value) => {
    component.state.asset.value = safeToString(value);
    return component;
  };

  component.withLabel = (label) => {
    component.state.labelAsset = label;
    return component;
  };

  component.withExp = (exp) => {
    component.state.asset.exp = safeFromMixedType(exp);
    return component;
  };

  component.withAccessibility = (accessibility) => {
    component.state.asset.accessibility = safeToString(accessibility);
    return component;
  };

  component.withMetaDataBeacon = (beacon) => {
    component.state.asset.metaData = {
      ...(component.state.asset.metaData || {}),
      beacon: safeFromMixedType(beacon),
    };
    return component;
  };

  component.withMetaDataSkipValidation = (skipValidation) => {
    component.state.asset.metaData = {
      ...(component.state.asset.metaData || {}),
      skipValidation: safeToBoolean(skipValidation),
    };
    return component;
  };

  component.withMetaDataRole = (role) => {
    component.state.asset.metaData = {
      ...(component.state.asset.metaData || {}),
      role: safeToString(role),
    };
    return component;
  };

  component.withMetaData = (metaData) => {
    // Simple update - no required properties
    component.state.asset.metaData = {
      ...(component.state.asset.metaData || {}),
      ...(safeFromMixedType(metaData) || {}),
    };
    return component;
  };

  component.withApplicability = (applicability) => {
    component.state.asset.applicability = safeToString(applicability);
    return component;
  };

  // Apply any initial args
  if (args) {
    if (args.id) component.withId(args.id);
    if (args.value) component.withValue(args.value);
    if (args.label) component.withLabel(args.label);
    if (args.exp) component.withExp(args.exp);
    if (args.accessibility) component.withAccessibility(args.accessibility);
    if (args.metaData) component.withMetaData(args.metaData);
    if (args.applicability) component.withApplicability(args.applicability);
  }

  return markAsBuilder(component);
}
