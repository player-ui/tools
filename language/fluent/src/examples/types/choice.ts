import type { Asset, AssetWrapper, Binding } from "@player-ui/types";

/**
 * A choice asset represents a single selection choice, often displayed as radio buttons in a web context.
 * This will allow users to test out more complex flows than just inputs + buttons.
 */
export interface ChoiceAsset<AnyTextAsset extends Asset = Asset>
  extends Asset<"choice"> {
  /** A text-like asset for the choice's label */
  title?: AssetWrapper<AnyTextAsset>;

  /** Asset container for a note. */
  note?: AssetWrapper<AnyTextAsset>;

  /** The location in the data-model to store the data */
  binding?: Binding;

  /** The options to select from */
  items?: Array<ChoiceItem>;

  /** Optional additional data */
  metaData?: {
    beacon?: string | Record<string, unknown>;
  };
}

export type ValueType = string | number | boolean | null;

export interface ChoiceItem<AnyTextAsset extends Asset = Asset> {
  /** The id associated with the choice item */
  id: string;

  /** A text-like asset for the choice's label */
  label?: AssetWrapper<AnyTextAsset>;

  /** The value of the input from the data-model */
  value?: ValueType;

  /** Applicability expression that conditionally shows or hides an asset (and all of its children) from the view tree */
  applicability?: string;
}
