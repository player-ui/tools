import type { Asset, AssetWrapper } from "@player-ui/types";
import { ActionAsset } from "./action";

/** A Modifier to apply 'highlight' styling to the collection */
export interface CalloutModifier {
  /** the type of modifier */
  type: "callout";
  /** specification on why the callout needs to be highlighted--this determines the coloring  */
  value: "support" | "legal";
}
export interface TagModifier {
  /** the type of modifier */
  type: "tag";
  /** the value for the tag */
  value: "block";
}
export interface CollectionMetaData {
  /** the role of the collection */
  role?:
    | "section"
    | "ocr-surface"
    | "ocr-instructions-lighting"
    | "ocr-instructions-positioning"
    | "swd-head-start-text"
    | "premium"
    | "address";
}
/**
 * A collection is a group of assets
 *
 * @asset
 */
export interface Collection<AnyAsset extends Asset = Asset>
  extends Asset<"collection"> {
  /** The collection items to show */
  values?: Array<AssetWrapper<AnyAsset>>;

  /** The additional information to  show */
  additionalInfo?: AssetWrapper<AnyAsset>;

  /** The result text to show */
  resultText?: AssetWrapper<AnyAsset> | Array<AssetWrapper<AnyAsset>>;

  /** The label defining the collection  */
  label?: AssetWrapper<AnyAsset>;

  /** Actions attached to the collection */
  actions?: Array<AssetWrapper<ActionAsset>>;

  /** Extra data associated with the collection */
  metaData?: CollectionMetaData;

  /** Ways to modify how the component looks */
  modifiers?: Array<CalloutModifier | TagModifier>;
}

export interface FieldCollectionMetaData {
  /** the role of the field collection */
  role?: "section" | "address" | "name" | "phone";
}
/**
 * A field collection is a group of field assets
 *
 * @asset
 */
export interface FieldCollection<AnyAsset extends Asset = Asset>
  extends Asset<"fieldCollection"> {
  /** The collection items to show */
  values?: Array<AssetWrapper<AnyAsset>>;

  /** The additional information to  show */
  additionalInfo?: AssetWrapper<AnyAsset>;

  /** The result text to show */
  resultText?: AssetWrapper<AnyAsset>;

  /** The label defining the collection  */
  label?: AssetWrapper<AnyAsset>;

  /** Extra data associated with the collection */
  metaData?: FieldCollectionMetaData;

  /** Actions attached to the collection */
  actions?: Array<AssetWrapper<ActionAsset>>;
}
/**
 * The OverviewCollection asset
 *
 * @asset
 */
export interface OverviewCollection<AnyAsset extends Asset = Asset>
  extends Asset<"overviewCollection"> {
  /** The collection items to show */
  values?: Array<AssetWrapper<AnyAsset>>;

  /** The label defining the collection  */
  label?: AssetWrapper<AnyAsset>;

  /** Actions attached to the collection */
  actions?: Array<AssetWrapper<ActionAsset>>;
}

/**
 * SplashCollection asset is very similar to the basic Collection, which is a group of assets.
 * It can also contain an image. It is intended to display read-only data.
 */
export interface SplashCollection<AnyAsset extends Asset = Asset>
  extends Asset<"splashCollection"> {
  /** Extra data associated with the Asset */
  metaData?: {
    /** Changes the style slightly */
    role?: "promotional";
  };

  /** Asset container for an image */
  splash?: AssetWrapper<AnyAsset>;

  /** Label, typically a single text asset */
  label?: AssetWrapper<AnyAsset>;

  /** Array of assets, typically text assets */
  values?: Array<AssetWrapper<AnyAsset>>;

  /** @deprecated additionalInfo in splash collection is no longer supported */
  additionalInfo?: AssetWrapper<AnyAsset>;

  /** @deprecated resultText in splash collection is no longer supported */
  resultText?: AssetWrapper<AnyAsset>;

  /** @deprecated actions in splash collection is no longer supported */
  actions?: Array<AssetWrapper<ActionAsset>>;
}

export type CollectionType =
  | Collection
  | FieldCollection
  | OverviewCollection
  | SplashCollection;

export type CollectionValue = AssetWrapper<Asset<string>>;
