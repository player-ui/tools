import type { Asset, AssetWrapper, Binding } from "@player-ui/types";

/**
 * This is the most generic way of gathering data. The input is bound to a data model using the 'binding' property.
 * Players can get field type information from the 'schema' definition, thus to decide the input controls for visual rendering.
 * */
export interface InputAsset<AnyTextAsset extends Asset = Asset>
  extends Asset<"input"> {
  /** Asset container for a field label. */
  label?: AssetWrapper<AnyTextAsset>;

  /** Asset container for a note. */
  note?: AssetWrapper<AnyTextAsset>;

  /** The location in the data-model to store the data */
  binding: Binding;

  /** Optional additional data */
  metaData?: {
    /** Additional data to beacon when this input changes */
    beacon?: string | Record<string, unknown>;
  };
}
