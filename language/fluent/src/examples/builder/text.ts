import type {
  ParentCtx,
  ExtractBuilderArgs,
  BaseFluentBuilder,
} from "../../types";
import { genId } from "../../id-generator";
import { markAsBuilder, safeToArray, safeToString } from "../../utils";
import type { TextAsset } from "../types/text";

/**
 * Derived builder args type for TextAsset
 */
type TextBuilderArgs = ExtractBuilderArgs<TextAsset>;

/**
 * Internal state for the text component
 * Stores the current asset state
 */
interface TextComponentState {
  /** The text asset being built */
  asset: TextAsset;
}

/**
 * A text asset is a simple text string that can be displayed to the user.
 * It can be modified with modifiers to change its appearance.
 *
 * This interface is a callable Text component with a fluent API for configuring Texts
 */
export interface TextComponent extends BaseFluentBuilder<TextComponent> {
  /** Generate the TextAsset with context */
  <K extends ParentCtx>(ctx: K): TextAsset;

  /** The text to display */
  withValue: (value: NonNullable<TextBuilderArgs["value"]>) => TextComponent;

  /** Any modifiers on the text */
  withModifiers: (
    modifiers: NonNullable<TextBuilderArgs["modifiers"]>,
  ) => TextComponent;

  /** @private Component state */
  state: TextComponentState;
}

/** Creates a text component with a fluent API for configuration. */
export function text(args?: Partial<TextBuilderArgs>): TextComponent {
  // Initialize the component state
  const state: TextComponentState = {
    asset: {
      id: "",
      type: "text",
      value: "",
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

    return result;
  }) as TextComponent;

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

  component.withModifiers = (modifiers) => {
    component.state.asset.modifiers = safeToArray(modifiers);
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
    if (args.modifiers) component.withModifiers(args.modifiers);
    if (args.applicability) component.withApplicability(args.applicability);
  }

  return markAsBuilder(component);
}
