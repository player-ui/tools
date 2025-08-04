import type { AssetWrapper, Asset } from "@player-ui/types";

export interface CollectionAsset extends Asset<"collection"> {
  /** An optional label to title the collection */
  label?: AssetWrapper;
  /** The string value to show */
  values?: Array<AssetWrapper>;

  /** Applicability expression that conditionally shows or hides an asset (and all of its children) from the view tree */
  applicability?: string;
}
