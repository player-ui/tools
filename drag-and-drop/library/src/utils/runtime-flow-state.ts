import type { ObjectType } from '@player-tools/xlr';
import type { Asset, AssetWrapper, Flow, View } from '@player-ui/types';
import type {
  ExtensionProviderAssetIdentifier,
  FlowWithOneView,
  DropTargetAssetType,
  PlacedAsset,
} from '../types';
import { UUIDSymbol } from '../types';
import { makeDropTarget, getAssetSymbol } from '../types';
import { isDropTargetAsset } from '../types';

/** The type for exporting and restoring the flow state */
export interface ExportedRuntimeFlowState {
  /**
   * The root node of the drag and drop view
   */
  root: DropTargetAssetType;
}

export interface RuntimeFlowStateOptions {
  /**
   * Function to call when a placed asset has required properties that need to be resolved before actually placing it.
   */
  resolveRequiredProperties: (asset: Asset, type: ObjectType) => Promise<Asset>;

  /**
   * Function that will be called when multiple assets are dropped onto the same target and a collection needs to be created
   */
  resolveCollectionConversion: (assets: Array<AssetWrapper>) => {
    /** The generated collection asset with the provided `assets` array as children */
    asset: Asset;
    /** The corresponding type for the generated collection asset */
    type: ObjectType;
  };

  /**
   * The content to initialize the editing experience with
   */
  restoreFrom?:
    | {
        /**
         * The editor state to resume from
         */
        state: ExportedRuntimeFlowState;

        /**
         * The full Player flow to initialize with
         */
        flow: never;
      }
    | {
        /**
         * The editor state to resume from
         */
        flow: Flow;
        /**
         * The full Player flow to initialize with
         */
        state: never;
      };
}

/**
 * Manages the translation between Drag and Drop state to Player state
 */
export class RuntimeFlowState {
  private ROOT: DropTargetAssetType;
  /** Symbol to Real Asset */
  private realAssetMappings: Map<symbol, PlacedAsset> = new Map();
  /** Symbol to Drop Target Asset */
  private dropTargetAssets: Map<symbol, DropTargetAssetType> = new Map();
  /** Asset Symbol to Drop Target Symbol */
  private assetsToTargets: Map<symbol, symbol> = new Map();
  /** Drop Target Symbol to Asset Symbol */
  private targetsToAssets: Map<symbol, symbol> = new Map();

  private resolveRequiredProperties: (
    asset: Asset,
    type: ObjectType
  ) => Promise<Asset>;

  private resolveCollectionConversion: (assets: Array<AssetWrapper>) => {
    /** The generated collection asset with the provided `assets` array as children */
    asset: Asset;
    /** The corresponding type for the generated collection asset */
    type: ObjectType;
  };

  constructor(options: RuntimeFlowStateOptions) {
    this.ROOT = makeDropTarget('drag-and-drop-view');
    this.dropTargetAssets.set(getAssetSymbol(this.ROOT), this.ROOT);
    this.resolveRequiredProperties = options.resolveRequiredProperties;
    this.resolveCollectionConversion = options.resolveCollectionConversion;
  }

  exportState(): ExportedRuntimeFlowState {
    return {
      root: this.ROOT,
    };
  }

  private computeViewForDropTarget(
    asset: DropTargetAssetType
  ): DropTargetAssetType['value'] | undefined {
    if (!asset.values || asset.values.length === 0) {
      return undefined;
    }

    if (asset.values.length === 1) {
      return asset.values[0];
    }

    const realDropTargetSymbol = getAssetSymbol(asset);
    const assetsWithPlaceholders = asset.values.reduce<AssetWrapper[]>(
      (coll, placedAsset, index) => {
        const prefixAsset = makeDropTarget(
          `${asset.id}-${index * 2 - 1}`,
          asset.context
            ? {
                ...asset.context,
                arrayElement: true,
              }
            : undefined
        );

        if (index > 0) {
          this.dropTargetAssets.set(getAssetSymbol(prefixAsset), prefixAsset);
        }

        const mockDropTarget = makeDropTarget(
          `${asset.id}-${index * 2}`,
          asset.context
            ? {
                ...asset.context,
                arrayElement: true,
                mockTarget: true,
              }
            : undefined
        );

        mockDropTarget[UUIDSymbol] = realDropTargetSymbol;

        mockDropTarget.value =  {
          ...placedAsset,
          asset: {
            ...placedAsset.asset,
            id: `${asset.id}-${index * 2}`,
          },
        };

        return [
          ...coll,
          ...(index > 0 ? [{ asset: prefixAsset }] : []),
          {asset: mockDropTarget },
        ];
      },
      []
    );

    return this.resolveCollectionConversion(assetsWithPlaceholders as any);
  }

  private async createNewAsset(
    idPrefix: string,
    type: ObjectType
  ): Promise<Asset> {
    const typeProp =
      type.properties.type.node.type === 'string'
        ? type.properties.type.node.const
        : undefined;

    if (typeProp === undefined) {
      throw new Error('type property must be a constant');
    }

    let asset: Asset = {
      id: `${idPrefix}-${typeProp}`,
      type: typeProp,
      [UUIDSymbol]: Symbol(`${idPrefix}-${typeProp}`),
    };

    let hasRequiredProperties = false;

    Object.entries(type.properties).forEach(([key, prop]) => {
      if (prop.node.type === 'string' && prop.node.const !== undefined) {
        asset[key] = prop.node.const;
      }

      if (prop.required === true && !['type', 'id'].includes(key)) {
        hasRequiredProperties = true;
      }

      if (
        (prop.node.type === 'ref' &&
          prop.node.ref.startsWith('AssetWrapper')) ||
        (prop.node.type === 'array' &&
          prop.node.elementType.type === 'ref' &&
          prop.node.elementType.ref.startsWith('AssetWrapper'))
      ) {
        const isArray = prop.node.type === 'array';
        const context = {
          propertyName: key,
          parent: {
            pluginName: 'drag-and-drop-placeholder',
            name: typeProp,
          },
          arrayElement: isArray,
        };
        const id = isArray ? `${idPrefix}-${key}-0` : `${idPrefix}-${key}`;
        const assetSlot = makeDropTarget(id, context);

        this.dropTargetAssets.set(getAssetSymbol(assetSlot), assetSlot);
        this.targetsToAssets.set(
          getAssetSymbol(assetSlot),
          getAssetSymbol(asset)
        );
        if (isArray) {
          asset[key] = [{ asset: assetSlot }];
        } else {
          asset[key] = { asset: assetSlot };
        }
      }
    });

    if (hasRequiredProperties) {
      asset = await this.resolveRequiredProperties(asset, type);
    }

    return asset;
  }

  updateAsset(assetSymbol: symbol, newAsset: Asset) {
    let placedAsset = this.realAssetMappings.get(assetSymbol);
    if (!placedAsset) {
      throw new Error(
        `Cannot set asset value for unknown id: ${assetSymbol.toString()}`
      );
    }

    if (!placedAsset.asset) {
      throw new Error(
        `Cannot update an asset that doesn't have any properties`
      );
    }

    placedAsset = {
      ...placedAsset,
      asset: {
        ...placedAsset.asset,
        ...newAsset,
      },
    };
    this.realAssetMappings.set(assetSymbol, placedAsset);

    const containingDropTargetSymbol = this.assetsToTargets.get(assetSymbol);
    if (!containingDropTargetSymbol){
      throw new Error('Cant get parent drop target symbol');
    }

    const containingDropTarget = this.dropTargetAssets.get(
      containingDropTargetSymbol
    );

    if (!containingDropTarget){
      throw new Error('Cant get parent drop target');
    } 

    const updateIndex = containingDropTarget.values?.findIndex((value) => {
      return getAssetSymbol(value.asset) === assetSymbol;
    })

    if (updateIndex === undefined || !containingDropTarget.values){
      throw new Error('Cant find index to update in drop target')
    };
    
    containingDropTarget.values[updateIndex] = placedAsset;

    containingDropTarget.value = this.computeViewForDropTarget(containingDropTarget)
  }

  async placeAsset(
    /** The symbol for the drop target to place the asset in */
    dropTargetSymbol: symbol,
    /** XLR Info about the asset being placed */
    replacement: {
      /** The identifier for where the populated asset is from */
      identifier: ExtensionProviderAssetIdentifier;

      /** The current descriptor for the value stored at this asset */
      type: ObjectType;
    },
    action: 'replace' | 'append' | 'prepend',
    /** The symbol for the asset to replace if the new asset is being dropped into a generated collection*/
    assetSymbol?: symbol
  ): Promise<void> {
    const containingDropTarget = this.dropTargetAssets.get(dropTargetSymbol);
    if (!containingDropTarget) {
      throw new Error(
        `Cannot set asset value for unknown drop target: ${dropTargetSymbol.toString()}`
      );
    }

    if (!isDropTargetAsset(containingDropTarget)) {
      throw new Error(`Cannot drop asset onto non drop target asset`);
    }

    const newAsset = await this.createNewAsset(containingDropTarget.id, replacement.type);

    const newWrappedAsset = {
      asset: newAsset,
      ...replacement,
    };

    this.realAssetMappings.set(getAssetSymbol(newAsset), newWrappedAsset);

    if (action === 'replace') {
      if(assetSymbol){
        const updateIndex = containingDropTarget.values?.findIndex((value) => {
          return getAssetSymbol(value.asset) === assetSymbol;
        })
    
        if (updateIndex === undefined || !containingDropTarget.values){
          throw new Error('Cant find index to update in drop target')
        };
        
        containingDropTarget.values[updateIndex] = newWrappedAsset;
      } else {
        containingDropTarget.values = [newWrappedAsset];
      }
    } else if (action === 'append') {
      containingDropTarget.values = [...(containingDropTarget.values ?? []), newWrappedAsset];
    } else if (action === 'prepend') {
      containingDropTarget.values = [newWrappedAsset, ...(containingDropTarget.values ?? [])];
    }

    containingDropTarget.value = this.computeViewForDropTarget(containingDropTarget);

    const newAssetSymbol = getAssetSymbol(newAsset);
    this.assetsToTargets.set(newAssetSymbol, dropTargetSymbol);

    // Resolve Arrays in parent
    if (
      containingDropTarget.context?.arrayElement &&
      containingDropTarget.context.propertyName
    ) {
      const containingAssetSymbol = this.targetsToAssets.get(dropTargetSymbol);
      if (!containingAssetSymbol) {
        throw new Error(
          `Error: can't get parent asset mapping of drop target ${dropTargetSymbol.toString()}`
        );
      }

      const containingAsset = this.realAssetMappings.get(containingAssetSymbol);

      if (!containingAsset) {
        throw new Error(
          `Error: can't get asset for symbol ${containingAssetSymbol.toString()}`
        );
      }

      const arrayProperty = containingAsset.asset[
        containingDropTarget.context.propertyName
      ] as Array<AssetWrapper<DropTargetAssetType>>;
      const asdf = arrayProperty.find((element) => {
        return getAssetSymbol(element.asset) === dropTargetSymbol;
      });

      if (!asdf) {
        throw new Error('cant calculate array insertion');
      }

      const insertionIndex = arrayProperty.indexOf(asdf);
      // Check if drop targets around placed asset need to be updated
      const leftNeighbor = arrayProperty[insertionIndex - 1];
      if (!leftNeighbor || leftNeighbor.asset.values?.length !== 0) {
        const newLeftAsset = makeDropTarget(`${containingDropTarget.id}-left`, {
          ...containingDropTarget.context
        });
        this.dropTargetAssets.set(getAssetSymbol(newLeftAsset), newLeftAsset);
        this.targetsToAssets.set(
          getAssetSymbol(newLeftAsset),
          containingAssetSymbol
        );
        arrayProperty.splice(insertionIndex, 0, {
          asset: {
            ...newLeftAsset
          },
        });
      }

      arrayProperty[insertionIndex + 1] = { asset: containingDropTarget };

      const rightNeighbor = arrayProperty[insertionIndex + 2];
      if (!rightNeighbor || rightNeighbor.asset.values?.length !== 0) {
        const newRightAsset = makeDropTarget(`${containingDropTarget.id}-right`, {
          ...containingDropTarget.context
        });
        this.dropTargetAssets.set(getAssetSymbol(newRightAsset), newRightAsset);
        this.targetsToAssets.set(
          getAssetSymbol(newRightAsset),
          containingAssetSymbol
        );
        arrayProperty.splice(insertionIndex + 2, 0, {
          asset: {
            ...newRightAsset,
          },
        });
      }
    }
  }

  getAsset(assetSymbol: symbol): {
    /** The Asset that correlates to the given ID */
    asset: Asset;
    /** The underlying XLR type for the Asset */
    type: ObjectType;
  } {
    const placedAsset = this.realAssetMappings.get(assetSymbol);
    if (!placedAsset) {
      throw new Error(
        `Cannot get asset value for unknown id: ${assetSymbol.toString()}`
      );
    }

    return { ...placedAsset };
  }

  clearAsset(assetSymbol: symbol) {
    const parentDropTargetSymbol = this.assetsToTargets.get(assetSymbol);
    if (!parentDropTargetSymbol) {
      throw new Error(`Cannot find parent drop target ${assetSymbol.toString()}`);
    }

    const parentDropTarget = this.dropTargetAssets.get(parentDropTargetSymbol);
    if (!parentDropTarget) {
      throw new Error(`Cannot get parent drop target ${assetSymbol.toString()}`);
    }

    parentDropTarget.values = parentDropTarget.values?.filter(
      (pa) => getAssetSymbol(pa.asset) !== assetSymbol
    );

    this.realAssetMappings.delete(assetSymbol);
    parentDropTarget.value = this.computeViewForDropTarget(parentDropTarget);
  }

  get view(): View {
    return this.ROOT;
  }

  get flow(): FlowWithOneView {
    const { view } = this;

    return {
      id: 'dnd-controller',
      views: [view],
      navigation: {
        BEGIN: 'FLOW_1',
        FLOW_1: {
          startState: 'VIEW_1',
          VIEW_1: {
            state_type: 'VIEW',
            ref: view.id,
            transitions: {
              '*': 'VIEW_1',
            },
          },
        },
      },
    };
  }
}
