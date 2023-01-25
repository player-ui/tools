import type { ObjectType, TSManifest } from '@player-tools/xlr';
import type { Asset, ReactPlayerPlugin, Flow, View } from '@player-ui/react';

export const DroppedItemTypes = {
  ASSET: 'ASSET',
};

export const DragAndDropAssetType = Symbol('drop-target');
export const UUIDSymbol = Symbol('drag-and-drop-uuid');

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
    new (): ReactPlayerPlugin;
  };

  /** A manifest describing the plugins capabilities */
  manifest: TSManifest;
}

export interface ExtensionProviderAssetIdentifier {
  /** The name of the plugin that supplied this type */
  pluginName: string;

  /** The asset type in the plugin */
  name: string;

  /** The capability the type belongs to */
  capability: string;
}

export const isDropTargetAsset = (obj: unknown): obj is DropTargetAssetType => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    (obj as DropTargetAssetType).__type === DragAndDropAssetType
  );
};

/** Creates a drop target asset */
export const makeDropTarget = (
  id: string,
  context?: DropTargetAssetType['context']
): DropTargetAssetType => {
  const symbol = Symbol(`drop-target-${id}`);
  return {
    __type: DragAndDropAssetType,
    id,
    type: 'drop-target',
    [UUIDSymbol]: symbol,
    context,
    values: [],
  };
};

/** Returns the shadow ID for any given asset */
export const getAssetSymbol = (asset: Asset): symbol => {
  return (asset as any)[UUIDSymbol];
};

export interface PlacedAsset {
  /** The identifier for where the populated asset is from */
  identifier: ExtensionProviderAssetIdentifier;

  /** The current descriptor for the value stored at this asset */
  type: ObjectType;

  /**
   * A mapping of asset slot name to drop target handlers
   */
  asset: Asset;
}

export interface DropTargetAssetType extends Asset<'drop-target'> {
  /** An opaque identifier for the placeholder */
  __type: typeof DragAndDropAssetType;

  /**
   * The context for what this value is in
   * Used for determining if a value is allowed to be dropped in this slot or not
   */
  context?: {
    /** The identifier for the parent asset type */
    parent: Omit<ExtensionProviderAssetIdentifier, 'capability'>;

    /** The name of the property that this asset fulfills */
    propertyName?: string;

    /** The index of the property that this asset fulfills */
    propertyIndex?: number;
  };

  /** The effective value that should be rendered. Generated from `.values` */
  value?: {
    /** The current descriptor for the value stored at this asset */
    type: ObjectType;

    /**
     * A mapping of asset slot name to drop target handlers
     */
    asset: Asset;
  };

  /**
   * The asset or assets that currently populate this slot
   * if not set, then this slot is empty and a placeholder will be shown instead
   * if multiple assets are in the slot, they will be converted to a collection on the fly
   */
  values?: Array<PlacedAsset>;
}

export interface TransformedDropTargetAssetType extends DropTargetAssetType {
  /** Context relative to the parent's position */
  context?: DropTargetAssetType['context'];

  /** Set the value of this slot to the replacement value */
  placeAsset: (
    identifier: ExtensionProviderAssetIdentifier,
    action: 'replace' | 'append' | 'prepend'
  ) => void;

  /** Append the asset to the slot */
  appendAsset: (identifier: ExtensionProviderAssetIdentifier) => void;

  /**
   * Remove the value stored at this location
   * If the parent slot is a collection we can automatically collapse it
   */
  clearAsset: () => void;
}
