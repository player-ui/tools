import type { ObjectType, TSManifest } from '@player-tools/xlr';
import type { Asset, WebPlayerPlugin, Flow, View } from '@player-ui/react';

export const DroppedItemTypes = {
  ASSET: 'ASSET',
};

export const DragAndDropAssetType = 'test';

export type FlowWithOneView<T extends Asset = Asset> = Flow<T> & {
  views: [View<T>];
};

export interface DroppedAsset {
  type: typeof DroppedItemTypes.ASSET;
  identifier: ExtensionProviderAssetIdentifier;
}

export interface ExtensionProvider {
  /** A constructor to create an instance of the plugin */
  plugin: {
    new (): WebPlayerPlugin;
  };

  /** A manifest describing the plugins capabilities */
  manifest: TSManifest;
}

export interface ExtensionProviderAssetIdentifier {
  /** The name of the plugin that supplied this type */
  pluginName: string;

  /** The asset type in the plugin */
  name: string;
}

export const isDropTargetAsset = (obj: unknown): obj is DropTargetAssetType => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as DropTargetAssetType).__type === DragAndDropAssetType
  );
};

export interface DropTargetAssetType extends Asset<'drop-target'> {
  /** An opaque identifier for the placeholder */
  __type: typeof DragAndDropAssetType;

  /**
   * The context for what this value is in
   * Used for determining if a value is allowed to be dropped in this slot or not
   */
  context?: {
    /** The identifier for the parent asset type */
    parent: ExtensionProviderAssetIdentifier;

    /** The name of the property that this asset fulfills */
    propertyName?: string;
  };

  /**
   * An asset that's currently populating this slot
   * if not set, then this slot is empty and a placeholder will be shown instead
   */
  value?: {
    /** The identifier for where the populated asset is from */
    identifier: ExtensionProviderAssetIdentifier;

    /** The current descriptor for the value stored at this asset */
    type: ObjectType;

    /**
     * A mapping of asset slot name to drop target handlers
     */
    asset: Asset;
  };
}

export interface TransformedDropTargetAssetType extends DropTargetAssetType {
  /** Context relative to the parent's position */
  context?: DropTargetAssetType['context'] & {
    /**
     * If the slot should accept being appended to
     * Set if the parent asset supports an array (and this is the last item)
     * or if the parent slot is a single item and we can convert to a collection
     */
    allowArrayAppend: boolean;
  };

  /** Set the value of this slot to the replacement value */
  replaceAsset: (identifier: ExtensionProviderAssetIdentifier) => void;

  /** Append the asset to the slot */
  appendAsset: (identifier: ExtensionProviderAssetIdentifier) => void;

  /**
   * Remove the value stored at this location
   * If the parent slot is a collection we can automatically collapse it
   */
  clearAsset: () => void;
}
