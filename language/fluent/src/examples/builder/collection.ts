import type { Asset, Template } from "@player-ui/types";
import type { CollectionAsset } from "../types/collection";
import type {
  ParentCtx,
  ExtractBuilderArgs,
  BaseFluentBuilder,
  TemplateFunction,
} from "../../types";
import { isTemplateFunction } from "../../types";
import { genId } from "../../id-generator";
import { createAssetWrapper } from "../../asset-wrapper";
import { markAsBuilder, safeToString } from "../../utils";

/**
 * Derived builder args type for CollectionAsset
 */
type CollectionBuilderArgs = ExtractBuilderArgs<CollectionAsset>;

/**
 * Internal state for the collection component
 * Stores the current asset state
 */
interface CollectionComponentState {
  /** The collection asset being built */
  asset: CollectionAsset;
  /** The label asset to be built when the component is called */
  labelAsset?: Asset | (<K extends ParentCtx>(ctx: K) => Asset);
  /** The values asset to be built when the component is called */
  valuesAssets?: Array<Asset | (<K extends ParentCtx>(ctx: K) => Asset)>;
  /** Templates to be applied to the collection */
  templates?: Array<Template | TemplateFunction>;
}

/** This interface is a callable Collection component with a fluent API for configuring Collections */
export interface CollectionComponent
  extends BaseFluentBuilder<CollectionComponent> {
  /** Generate the CollectionAsset with context */
  <K extends ParentCtx>(ctx: K): CollectionAsset;

  /** An optional label to title the collection */
  withLabel: (
    label: NonNullable<CollectionBuilderArgs["label"]>,
  ) => CollectionComponent;

  /** The string value to show */
  withValues: (
    values: NonNullable<CollectionBuilderArgs["values"]>,
  ) => CollectionComponent;

  /** @private Component state */
  state: CollectionComponentState;
}

/** Creates a collection component with a fluent API for configuration. */
export function collection(
  args?: Partial<CollectionBuilderArgs>,
): CollectionComponent {
  // Initialize the component state
  const state: CollectionComponentState = {
    asset: {
      id: "",
      type: "collection",
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
    };

    // Handle label if present
    if (component.state.labelAsset) {
      result.label = createAssetWrapper(
        component.state.labelAsset,
        ctx,
        "label",
      );
    }

    // Handle values if present
    if (component.state.valuesAssets) {
      result.values = component.state.valuesAssets.map((item, index) =>
        createAssetWrapper(item, ctx, `values-${index}`),
      );
    }

    // Handle templates if present
    if (component.state.templates?.length) {
      (result as Asset).template = component.state.templates.map((template) =>
        isTemplateFunction(template) ? template(ctx) : template,
      );
    }

    return result;
  }) as CollectionComponent;

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

  component.withValues = (values) => {
    component.state.valuesAssets = values;
    return component;
  };

  component.withApplicability = (applicability) => {
    component.state.asset.applicability = safeToString(applicability);
    return component;
  };

  component.withTemplate = (template) => {
    if (!component.state.templates) {
      component.state.templates = [];
    }
    component.state.templates.push(template);
    return component;
  };

  // Apply any initial args
  if (args) {
    if (args.id) component.withId(args.id);
    if (args.label) component.withLabel(args.label);
    if (args.values) component.withValues(args.values);
    if (args.applicability) component.withApplicability(args.applicability);
  }

  return markAsBuilder(component);
}
