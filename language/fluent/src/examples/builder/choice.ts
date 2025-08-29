import type { Asset } from "@player-ui/types";
import type { ChoiceAsset, ChoiceItem } from "../types/choice";
import {
  type ParentCtx,
  type ExtractBuilderArgs,
  type BaseFluentBuilder,
  isFluentBuilder,
} from "../../types";
import { genId } from "../../id-generator";
import { createAssetWrapper } from "../../asset-wrapper";
import { markAsBuilder, safeFromMixedType, safeToString } from "../../utils";
import { ChoiceItemComponent } from "./choice-item";

/**
 * Derived builder args type for ChoiceAsset
 */
type ChoiceBuilderArgs<AnyTextAsset extends Asset = Asset> = ExtractBuilderArgs<
  ChoiceAsset<AnyTextAsset>
>;

/**
 * Internal state for the choice component
 * Stores the current asset state
 */
interface ChoiceComponentState<AnyTextAsset extends Asset = Asset> {
  /** The choice asset being built */
  asset: ChoiceAsset<AnyTextAsset>;
  /** The title asset to be built when the component is called */
  titleAsset?: AnyTextAsset | (<K extends ParentCtx>(ctx: K) => AnyTextAsset);
  /** The note asset to be built when the component is called */
  noteAsset?: AnyTextAsset | (<K extends ParentCtx>(ctx: K) => AnyTextAsset);
  /** The choice item builders to be built when the component is called */
  itemsBuilders?: Array<
    | ChoiceItem<AnyTextAsset>
    | (<K extends ParentCtx>(ctx: K) => ChoiceItem<AnyTextAsset>)
  >;
}

/**
 * A choice asset represents a single selection choice, often displayed as radio buttons in a web context.
 * This will allow users to test out more complex flows than just inputs + buttons.
 *
 * This interface is a callable Choice component with a fluent API for configuring Choices
 */
export interface ChoiceComponent<AnyTextAsset extends Asset = Asset>
  extends BaseFluentBuilder<ChoiceComponent<AnyTextAsset>> {
  /** Generate the ChoiceAsset with context */
  <K extends ParentCtx>(ctx: K): ChoiceAsset<AnyTextAsset>;

  /** A text-like asset for the choice's label */
  withTitle: (
    title: NonNullable<ChoiceBuilderArgs<AnyTextAsset>["title"]>,
  ) => ChoiceComponent<AnyTextAsset>;

  /** Asset container for a note. */
  withNote: (
    note: NonNullable<ChoiceBuilderArgs<AnyTextAsset>["note"]>,
  ) => ChoiceComponent<AnyTextAsset>;

  /** The location in the data-model to store the data */
  withBinding: (
    binding: NonNullable<ChoiceBuilderArgs<AnyTextAsset>["binding"]>,
  ) => ChoiceComponent<AnyTextAsset>;

  /** The options to select from */
  withItems: (
    items:
      | NonNullable<ChoiceBuilderArgs<AnyTextAsset>["items"]>
      | Array<ChoiceItemComponent>,
  ) => ChoiceComponent<AnyTextAsset>;

  /** Sets the beacon property of metaData */
  withMetaDataBeacon: (
    beacon: NonNullable<
      NonNullable<ChoiceBuilderArgs<AnyTextAsset>["metaData"]>["beacon"]
    >,
  ) => ChoiceComponent<AnyTextAsset>;

  /** Optional additional data */
  withMetaData: (
    metaData: NonNullable<ChoiceBuilderArgs<AnyTextAsset>["metaData"]>,
  ) => ChoiceComponent<AnyTextAsset>;

  /** @private Component state */
  state: ChoiceComponentState<AnyTextAsset>;
}

/** Creates a choice component with a fluent API for configuration. */
export function choice<AnyTextAsset extends Asset = Asset>(
  args?: Partial<ChoiceBuilderArgs<AnyTextAsset>>,
): ChoiceComponent<AnyTextAsset> {
  // Initialize the component state
  const state: ChoiceComponentState<AnyTextAsset> = {
    asset: {
      id: "",
      type: "choice",
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
    } as ChoiceAsset<AnyTextAsset>;

    // Handle title if present
    if (component.state.titleAsset) {
      result.title = createAssetWrapper(
        component.state.titleAsset,
        ctx,
        "title",
      );
    }

    // Handle note if present
    if (component.state.noteAsset) {
      result.note = createAssetWrapper(component.state.noteAsset, ctx, "note");
    }

    // Handle items if present
    if (component.state.itemsBuilders) {
      result.items = [
        ...(component.state.asset.items || []),
        ...component.state.itemsBuilders.map((item, index) => {
          if (typeof item === "function") {
            return item({ ...ctx, parentId: `${ctx.parentId}-items-${index}` });
          }
          return item;
        }),
      ];
    }

    return result;
  }) as ChoiceComponent<AnyTextAsset>;

  // Set the initial state
  component.state = state;

  // Define chainable methods
  component.withId = (id) => {
    component.state.asset.id = safeToString(id);
    return component;
  };

  component.withTitle = (title) => {
    component.state.titleAsset = title;
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

  component.withItems = (items) => {
    items.forEach((item) => {
      if (isFluentBuilder(item)) {
        component.state.itemsBuilders = [
          ...(component.state.itemsBuilders || []),
          item,
        ];
      } else {
        component.state.asset.items = [
          ...(component.state.asset.items || []),
          item as ChoiceItem,
        ];
      }
    });
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
    if (args.title) component.withTitle(args.title);
    if (args.note) component.withNote(args.note);
    if (args.binding) component.withBinding(args.binding);
    if (args.items) component.withItems(args.items);
    if (args.metaData) component.withMetaData(args.metaData);
    if (args.applicability) component.withApplicability(args.applicability);
  }

  return markAsBuilder(component);
}
