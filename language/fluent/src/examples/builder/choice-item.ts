import type { Asset } from "@player-ui/types";
import type { ChoiceItem } from "../types/choice";
import type { ParentCtx, ExtractBuilderArgs } from "../../types";
import { genId } from "../../id-generator";
import { createAssetWrapper } from "../../asset-wrapper";
import { markAsBuilder, safeFromMixedType, safeToString } from "../../utils";

/**
 * Derived builder args type for ChoiceItem
 */
type ChoiceItemBuilderArgs<AnyTextAsset extends Asset = Asset> =
  ExtractBuilderArgs<ChoiceItem<AnyTextAsset>>;

/**
 * Internal state for the choiceitem component
 * Stores the current asset state
 */
interface ChoiceItemComponentState<AnyTextAsset extends Asset = Asset> {
  /** The choiceitem asset being built */
  asset: ChoiceItem<AnyTextAsset>;
  /** The label asset to be built when the component is called */
  labelAsset?: AnyTextAsset | (<K extends ParentCtx>(ctx: K) => AnyTextAsset);
}

/** This interface is a callable ChoiceItem component with a fluent API for configuring ChoiceItems */
export interface ChoiceItemComponent<AnyTextAsset extends Asset = Asset> {
  /** Generate the ChoiceItem with context */
  <K extends ParentCtx>(ctx: K): ChoiceItem<AnyTextAsset>;

  /** A unique identifier for the choice item */
  withId: (
    id: NonNullable<ChoiceItemBuilderArgs<AnyTextAsset>["id"]>,
  ) => ChoiceItemComponent<AnyTextAsset>;

  /** A text-like asset for the choice's label */
  withLabel: (
    label: NonNullable<ChoiceItemBuilderArgs<AnyTextAsset>["label"]>,
  ) => ChoiceItemComponent<AnyTextAsset>;

  /** The value of the input from the data-model */
  withValue: (
    value: NonNullable<ChoiceItemBuilderArgs<AnyTextAsset>["value"]>,
  ) => ChoiceItemComponent<AnyTextAsset>;

  /** @private Component state */
  state: ChoiceItemComponentState<AnyTextAsset>;
}

/** Creates a choiceItem component with a fluent API for configuration. */
export function choiceItem<AnyTextAsset extends Asset = Asset>(
  args?: Partial<ChoiceItemBuilderArgs<AnyTextAsset>>,
): ChoiceItemComponent<AnyTextAsset> {
  // Initialize the component state
  const state: ChoiceItemComponentState<AnyTextAsset> = {
    asset: {
      id: "",
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
    } as ChoiceItem<AnyTextAsset>;

    // Handle label if present
    if (component.state.labelAsset) {
      result.label = createAssetWrapper(
        component.state.labelAsset,
        ctx,
        "label",
      );
    }

    return result;
  }) as ChoiceItemComponent<AnyTextAsset>;

  // Set the initial state
  component.state = state;

  // Define chainable methods
  component.withId = (id) => {
    component.state.asset.id = safeToString(id);
    return component;
  };

  component.withLabel = (label) => {
    component.state.labelAsset = label;
    return component;
  };

  component.withValue = (value) => {
    component.state.asset.value = safeFromMixedType(value);
    return component;
  };

  // Apply any initial args
  if (args) {
    if (args.id) component.withId(args.id);
    if (args.label) component.withLabel(args.label);
    if (args.value) component.withValue(args.value);
  }

  return markAsBuilder(component);
}
