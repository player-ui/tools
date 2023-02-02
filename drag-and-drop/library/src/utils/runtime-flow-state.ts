import type { NamedType, ObjectType } from '@player-tools/xlr';
import type { Asset, AssetWrapper, Flow, View } from '@player-ui/types';
import type {
  ExtensionProviderAssetIdentifier,
  FlowWithOneView,
  DropTargetAsset,
  PlacedAsset,
} from '../types';
import { UUIDSymbol } from '../types';
import { makeDropTarget, getAssetSymbol } from './helpers';
import { isDropTargetAsset } from '../types';

/** The type for exporting and restoring the flow state */
export interface ExportedRuntimeFlowState {
  /**
   * The root node of the drag and drop view
   */
  root: DropTargetAsset;
}

export interface RuntimeFlowStateOptions {
  /**
   * Function to call when a placed asset has required properties that need to be resolved before actually placing it.
   */
  resolveRequiredProperties: (
    /** The basic Asset that could be generated */
    asset: Asset,
    /** The XLR Type for the Asset being generated */
    type: NamedType<ObjectType>
  ) => Promise<Asset>;

  /**
   * Function that will be called when multiple assets are dropped onto the same target and a collection needs to be created
   */
  resolveCollectionConversion: (assets: Array<AssetWrapper>) => {
    /** The generated collection asset with the provided `assets` array as children */
    asset: Asset;
    /** The corresponding type for the generated collection asset */
    type: NamedType<ObjectType>;
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
  private ROOT: DropTargetAsset;
  /** Symbol to Real Asset */
  private realAssetMappings: Map<symbol, PlacedAsset> = new Map();
  /** Symbol to Drop Target Asset */
  private dropTargetAssets: Map<symbol, DropTargetAsset> = new Map();
  /** Asset Symbol to Drop Target Symbol */
  private assetsToTargets: Map<symbol, symbol> = new Map();
  /** Drop Target Symbol to Asset Symbol */
  private targetsToAssets: Map<symbol, symbol> = new Map();

  private resolveRequiredProperties: (
    asset: Asset,
    type: NamedType<ObjectType>
  ) => Promise<Asset>;

  private resolveCollectionConversion: (assets: Array<AssetWrapper>) => {
    /** The generated collection asset with the provided `assets` array as children */
    asset: Asset;
    /** The corresponding type for the generated collection asset */
    type: NamedType<ObjectType>;
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

  private getContainingDropTarget(assetSymbol: symbol): DropTargetAsset {
    const containingDropTargetSymbol = this.assetsToTargets.get(assetSymbol);
    if (!containingDropTargetSymbol) {
      throw new Error(
        `Cannot get parent drop target symbol of ${assetSymbol.toString()}`
      );
    }

    const containingDropTarget = this.dropTargetAssets.get(
      containingDropTargetSymbol
    );

    if (!containingDropTarget) {
      throw new Error(
        `Cannot get drop target for symbol ${containingDropTargetSymbol.toString()}`
      );
    }

    return containingDropTarget;
  }

  private findAssetInDropTarget(
    assetSymbol: symbol,
    dropTarget: DropTargetAsset
  ): number {
    const index = dropTarget.values?.findIndex((value) => {
      return getAssetSymbol(value.asset) === assetSymbol;
    });

    if (index === undefined || index === -1) {
      throw new Error(
        `Unable to find asset ${assetSymbol.toString()} in drop target ${
          dropTarget.id
        }`
      );
    }

    return index;
  }

  private computeViewForDropTarget(
    dropTarget: DropTargetAsset
  ): DropTargetAsset['value'] | undefined {
    if (!dropTarget.values || dropTarget.values.length === 0) {
      return undefined;
    }

    if (dropTarget.values.length === 1) {
      return dropTarget.values[0];
    }

    const realDropTargetSymbol = getAssetSymbol(dropTarget);
    const assetsWithPlaceholders = dropTarget.values.reduce<AssetWrapper[]>(
      (coll, placedAsset, index) => {
        const prefixAsset = makeDropTarget(
          `${dropTarget.id}-${index * 2 - 1}`,
          dropTarget.context
            ? {
                ...dropTarget.context,
                isArrayElement: true,
              }
            : undefined
        );

        if (index > 0) {
          this.dropTargetAssets.set(getAssetSymbol(prefixAsset), prefixAsset);
        }

        const mockDropTarget = makeDropTarget(
          `${dropTarget.id}-${index * 2}`,
          dropTarget.context
            ? {
                ...dropTarget.context,
                isArrayElement: true,
                isMockTarget: true,
              }
            : undefined
        );

        mockDropTarget[UUIDSymbol] = realDropTargetSymbol;

        mockDropTarget.value = {
          ...placedAsset,
          asset: {
            ...placedAsset.asset,
            id: `${dropTarget.id}-${index * 2}`,
          },
        };

        return [
          ...coll,
          ...(index > 0 ? [{ asset: prefixAsset }] : []),
          { asset: mockDropTarget },
        ];
      },
      []
    );

    return this.resolveCollectionConversion(assetsWithPlaceholders);
  }

  private updateArrayInParent(
    containingDropTarget: DropTargetAsset,
    dropTargetSymbol: symbol
  ) {
    if (
      containingDropTarget.context?.isArrayElement &&
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
      ] as Array<AssetWrapper<DropTargetAsset>>;
      const dropTargetIndex = arrayProperty.find((element) => {
        return getAssetSymbol(element.asset) === dropTargetSymbol;
      });

      if (!dropTargetIndex) {
        throw new Error('cant calculate array insertion');
      }

      const insertionIndex = arrayProperty.indexOf(dropTargetIndex);
      // Check if drop targets around placed asset need to be updated
      const leftNeighbor = arrayProperty[insertionIndex - 1];
      if (!leftNeighbor || leftNeighbor.asset.values?.length !== 0) {
        const newLeftAsset = makeDropTarget(`${containingDropTarget.id}-left`, {
          ...containingDropTarget.context,
        });
        this.dropTargetAssets.set(getAssetSymbol(newLeftAsset), newLeftAsset);
        this.targetsToAssets.set(
          getAssetSymbol(newLeftAsset),
          containingAssetSymbol
        );
        arrayProperty.splice(insertionIndex, 0, {
          asset: {
            ...newLeftAsset,
          },
        });
      }

      arrayProperty[insertionIndex + 1] = { asset: containingDropTarget };

      const rightNeighbor = arrayProperty[insertionIndex + 2];
      if (!rightNeighbor || rightNeighbor.asset.values?.length !== 0) {
        const newRightAsset = makeDropTarget(
          `${containingDropTarget.id}-right`,
          {
            ...containingDropTarget.context,
          }
        );
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

  private async createNewAsset(
    idPrefix: string,
    xlrType: NamedType<ObjectType>
  ): Promise<Asset> {
    const typeProp =
      xlrType.properties.type.node.type === 'string'
        ? xlrType.properties.type.node.const
        : undefined;

    if (typeProp === undefined) {
      throw new Error(
        `'type' property of type ${xlrType.name} is not a constant. Are you sure this is a valid Asset?`
      );
    }

    let asset: Asset = {
      id: `${idPrefix}-${typeProp}`,
      type: typeProp,
      [UUIDSymbol]: Symbol(`${idPrefix}-${typeProp}`),
    };

    let hasRequiredProperties = false;

    Object.entries(xlrType.properties).forEach(([key, prop]) => {
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
            pluginName: 'player-dnd-plugin',
            assetName: typeProp,
          },
          isArrayElement: isArray,
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
      asset = await this.resolveRequiredProperties(asset, xlrType);
    }

    return asset;
  }

  public updateAsset(assetSymbol: symbol, newAsset: Asset) {
    let placedAsset = this.realAssetMappings.get(assetSymbol);

    if (!placedAsset) {
      throw new Error(
        `Cannot set asset value for unknown id: ${assetSymbol.toString()}`
      );
    }

    if (!placedAsset.asset) {
      throw new Error(
        `Cannot update an asset that doesn't have an existing asset`
      );
    }

    placedAsset = {
      ...placedAsset,
      asset: {
        ...placedAsset.asset,
        ...newAsset,
      },
    };

    const containingDropTarget = this.getContainingDropTarget(assetSymbol);

    if (!containingDropTarget.values) {
      throw new Error(
        `Mapped drop target ${containingDropTarget.id} as no assets`
      );
    }

    this.realAssetMappings.set(assetSymbol, placedAsset);

    const updateIndex = this.findAssetInDropTarget(
      assetSymbol,
      containingDropTarget
    );

    containingDropTarget.values[updateIndex] = placedAsset;

    containingDropTarget.value =
      this.computeViewForDropTarget(containingDropTarget);
  }

  public async placeAsset(
    /** The symbol for the drop target to place the asset in */
    dropTargetSymbol: symbol,
    /** XLR Info about the asset being placed */
    replacement: {
      /** The identifier for where the populated asset is from */
      identifier: ExtensionProviderAssetIdentifier;

      /** The current descriptor for the value stored at this asset */
      type: NamedType<ObjectType>;
    },
    action: 'replace' | 'append' | 'prepend',
    /** The symbol for the asset to replace if the new asset is being dropped into a generated collection */
    assetSymbol?: symbol
  ): Promise<void> {
    const dropTarget = this.dropTargetAssets.get(dropTargetSymbol);
    if (!dropTarget) {
      throw new Error(
        `Cannot set asset value for unknown drop target: ${dropTargetSymbol.toString()}`
      );
    }

    if (!isDropTargetAsset(dropTarget)) {
      throw new Error(`Cannot drop asset onto non drop target asset`);
    }

    const newAsset = await this.createNewAsset(dropTarget.id, replacement.type);

    const newWrappedAsset = {
      asset: newAsset,
      ...replacement,
    };

    this.realAssetMappings.set(getAssetSymbol(newAsset), newWrappedAsset);

    if (action === 'replace') {
      if (assetSymbol && dropTarget.values) {
        const updateIndex = this.findAssetInDropTarget(assetSymbol, dropTarget);

        dropTarget.values[updateIndex] = newWrappedAsset;
      } else {
        dropTarget.values = [newWrappedAsset];
      }
    } else if (action === 'append') {
      dropTarget.values = [...(dropTarget.values ?? []), newWrappedAsset];
    } else if (action === 'prepend') {
      dropTarget.values = [newWrappedAsset, ...(dropTarget.values ?? [])];
    }

    dropTarget.value = this.computeViewForDropTarget(dropTarget);

    const newAssetSymbol = getAssetSymbol(newAsset);
    this.assetsToTargets.set(newAssetSymbol, dropTargetSymbol);

    // Resolve Arrays in parent
    this.updateArrayInParent(dropTarget, dropTargetSymbol);
  }

  public getAsset(assetSymbol: symbol): {
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

  public clearAsset(assetSymbol: symbol) {
    const parentDropTarget = this.getContainingDropTarget(assetSymbol);

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
