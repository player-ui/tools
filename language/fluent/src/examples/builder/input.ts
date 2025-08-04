import type { Asset } from "@player-ui/types";
import type { InputAsset } from "../types/input";
import type {
  ParentCtx,
  ExtractBuilderArgs,
  BaseFluentBuilder,
} from "../../types";
import { genId } from "../../id-generator";
import { createAssetWrapper } from "../../asset-wrapper";
import { markAsBuilder, safeFromMixedType, safeToString } from "../../utils";

/**
 * Derived builder args type for InputAsset
 */
type InputBuilderArgs<AnyTextAsset extends Asset = Asset> = ExtractBuilderArgs<
  InputAsset<AnyTextAsset>
>;

/**
 * Internal state for the input component
 * Stores the current asset state
 */
interface InputComponentState<AnyTextAsset extends Asset = Asset> {
  /** The input asset being built */
  asset: InputAsset<AnyTextAsset>;
  /** The label asset to be built when the component is called */
  labelAsset?: AnyTextAsset | (<K extends ParentCtx>(ctx: K) => AnyTextAsset);
  /** The note asset to be built when the component is called */
  noteAsset?: AnyTextAsset | (<K extends ParentCtx>(ctx: K) => AnyTextAsset);
}

/**
 * This is the most generic way of gathering data. The input is bound to a data model using the 'binding' property.
 * Players can get field type information from the 'schema' definition, thus to decide the input controls for visual rendering.
 *
 * This interface is a callable Input component with a fluent API for configuring Inputs
 */
export interface InputComponent<AnyTextAsset extends Asset = Asset>
  extends BaseFluentBuilder<InputComponent<AnyTextAsset>> {
  /** Generate the InputAsset with context */
  <K extends ParentCtx>(ctx: K): InputAsset<AnyTextAsset>;

  /** Asset container for a field label. */
  withLabel: (
    label: NonNullable<InputBuilderArgs<AnyTextAsset>["label"]>,
  ) => InputComponent<AnyTextAsset>;

  /** Asset container for a note. */
  withNote: (
    note: NonNullable<InputBuilderArgs<AnyTextAsset>["note"]>,
  ) => InputComponent<AnyTextAsset>;

  /** The location in the data-model to store the data */
  withBinding: (
    binding: NonNullable<InputBuilderArgs<AnyTextAsset>["binding"]>,
  ) => InputComponent<AnyTextAsset>;

  /** Additional data to beacon when this input changes */
  withMetaDataBeacon: (
    beacon: NonNullable<
      NonNullable<InputBuilderArgs<AnyTextAsset>["metaData"]>["beacon"]
    >,
  ) => InputComponent<AnyTextAsset>;

  /** Optional additional data */
  withMetaData: (
    metaData: NonNullable<InputBuilderArgs<AnyTextAsset>["metaData"]>,
  ) => InputComponent<AnyTextAsset>;

  /** @private Component state */
  state: InputComponentState<AnyTextAsset>;
}

/** Creates a input component with a fluent API for configuration. */
export function input<AnyTextAsset extends Asset = Asset>(
  args?: Partial<InputBuilderArgs<AnyTextAsset>>,
): InputComponent<AnyTextAsset> {
  // Initialize the component state
  const state: InputComponentState<AnyTextAsset> = {
    asset: {
      id: "",
      type: "input",
      binding: "",
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
    } as InputAsset<AnyTextAsset>;

    // Handle label if present
    if (component.state.labelAsset) {
      result.label = createAssetWrapper(
        component.state.labelAsset,
        ctx,
        "label",
      );
    }

    // Handle note if present
    if (component.state.noteAsset) {
      result.note = createAssetWrapper(component.state.noteAsset, ctx, "note");
    }

    return result;
  }) as InputComponent<AnyTextAsset>;

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

  component.withNote = (note) => {
    component.state.noteAsset = note;
    return component;
  };

  component.withBinding = (binding) => {
    component.state.asset.binding = safeFromMixedType(binding);
    return component;
  };

  component.withMetaDataBeacon = (beacon) => {
    component.state.asset.metaData = {
      ...(component.state.asset.metaData || {}),
      beacon: safeFromMixedType(beacon),
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
    if (args.label) component.withLabel(args.label);
    if (args.note) component.withNote(args.note);
    if (args.binding) component.withBinding(args.binding);
    if (args.metaData) component.withMetaData(args.metaData);
    if (args.applicability) component.withApplicability(args.applicability);
  }

  return markAsBuilder(component);
}
