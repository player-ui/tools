import type { NamedType, ObjectType } from '@player-tools/xlr';
import type { XLRService } from '@player-tools/language-service';
import type { TypeMetadata } from '@player-tools/xlr-sdk';
import type {
  Asset,
  AssetWrapper,
  DataModel,
  Flow,
  View,
  Schema,
  Navigation,
} from '@player-ui/types';
import type {
  ExtensionProviderAssetIdentifier,
  FlowWithOneView,
  DropTargetAsset,
  PlacedAsset,
  DropTargetAssetContext,
} from '../types';
import { UUIDSymbol } from '../types';
import {
  makeDropTarget,
  getAssetSymbol,
  removeDndStateFromView,
} from './helpers';
import { isDropTargetAsset } from '../types';
import { DragAndDropController } from '../controller';

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
   * Function that will be called when Drag and Drop state changes
   */
  handleDndStateChange: () => void;

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
  /** The root drag and drop asset */
  private ROOT: DropTargetAsset;
  /** The schema section of the content */
  public schema?: Schema.Schema;
  /** The data section of the content */
  public data?: DataModel;
  /** The navigation section of the content */
  public navigation: Navigation;
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

  private handleDndStateChange: () => void;

  constructor(options: RuntimeFlowStateOptions) {
    this.ROOT = makeDropTarget('drag-and-drop-view');
    this.navigation = {
      BEGIN: 'FLOW_1',
      FLOW_1: {
        startState: 'VIEW_1',
        VIEW_1: {
          state_type: 'VIEW',
          ref: this.view.id,
          transitions: {
            '*': 'VIEW_1',
          },
        },
      },
    };

    this.dropTargetAssets.set(getAssetSymbol(this.ROOT), this.ROOT);
    this.resolveRequiredProperties = options.resolveRequiredProperties;
    this.resolveCollectionConversion = options.resolveCollectionConversion;
    this.handleDndStateChange = options.handleDndStateChange;
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

    this.handleDndStateChange();
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

    this.handleDndStateChange();
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

    this.handleDndStateChange();
  }

  private makeDropTargetContext(
    xlrService: XLRService,
    parent: Asset,
    propertyName: string,
    isArrayElement?: boolean
  ): DropTargetAssetContext {
    const { plugin: pluginName } = xlrService.XLRSDK.getTypeInfo(
      parent.type
    ) as TypeMetadata;
    return {
      parent: {
        pluginName,
        assetName: parent.type,
      },
      propertyName,
      isArrayElement,
    };
  }

  private createDropTarget(
    xlrService: XLRService,
    targetAsset?: Asset,
    dropTargetContext?: DropTargetAssetContext,
    parentAsset?: Asset
  ): DropTargetAsset {
    const id = targetAsset
      ? `${targetAsset.id}-dropTarget`
      : `${parentAsset?.id}-dropTarget`;
    const dropTarget = makeDropTarget(id, dropTargetContext);
    const dropTargetSymbol = getAssetSymbol(dropTarget);
    this.dropTargetAssets.set(dropTargetSymbol, dropTarget);
    if (targetAsset) {
      const targetAssetType = xlrService.XLRSDK.getType(
        targetAsset.type
      ) as NamedType<ObjectType>;
      const { plugin: pluginName } = xlrService.XLRSDK.getTypeInfo(
        targetAsset.type
      ) as TypeMetadata;
      const wrappedTargetAsset: PlacedAsset = {
        identifier: {
          pluginName,
          assetName: targetAssetType.name ?? '',
          capability: dropTargetContext ? 'Assets' : 'Views',
        },
        type: targetAssetType,
        asset: targetAsset,
      };
      const targetAssetSymbol = getAssetSymbol(targetAsset);
      dropTarget.values?.push(wrappedTargetAsset);
      this.realAssetMappings.set(targetAssetSymbol, wrappedTargetAsset);
      this.assetsToTargets.set(targetAssetSymbol, dropTargetSymbol);
    }

    if (parentAsset) {
      this.targetsToAssets.set(dropTargetSymbol, getAssetSymbol(parentAsset));
    }

    dropTarget.value = this.computeViewForDropTarget(dropTarget);

    return dropTarget;
  }

  private addDndStateToAsset(
    obj: any,
    xlrService: XLRService,
    dropTargetContext?: DropTargetAssetContext,
    parentAsset?: Asset
  ) {
    if (obj === null) {
      return obj;
    }

    const newObj = { ...obj };
    const assetType = xlrService.XLRSDK.getType(obj.type) as ObjectType;
    if (assetType) {
      newObj[UUIDSymbol] = Symbol(`${newObj.id}-${newObj.type}`);
    }

    const propsList = Object.keys(newObj);

    Object.keys(newObj).forEach((key) => {
      let isAssetWrapper = false;
      let isArrayElement = false;
      if (assetType && key in assetType.properties) {
        const { node } = assetType.properties[key];
        if (
          (node.type === 'ref' && node.ref.startsWith('AssetWrapper')) ||
          (node.type === 'array' &&
            node.elementType.type === 'ref' &&
            node.elementType.ref.startsWith('AssetWrapper'))
        ) {
          isAssetWrapper = true;
          isArrayElement = node.type === 'array';
        }
      }

      if (
        key === 'asset' &&
        dropTargetContext &&
        dropTargetContext?.parent.assetName.length > 0
      ) {
        newObj[key] = this.createDropTarget(
          xlrService,
          this.addDndStateToAsset(
            obj[key],
            xlrService,
            dropTargetContext,
            parentAsset
          ),
          dropTargetContext,
          parentAsset
        );
      } else if (typeof obj[key] === 'object') {
        const targetAsset = this.addDndStateToAsset(
          obj[key],
          xlrService,
          isAssetWrapper
            ? this.makeDropTargetContext(
                xlrService,
                newObj,
                key,
                isArrayElement
              )
            : dropTargetContext,
          isAssetWrapper ? newObj : parentAsset
        );

        if (
          targetAsset &&
          Array.isArray(targetAsset) &&
          targetAsset.length === 0
        ) {
          propsList.splice(propsList.indexOf(key), 1);
        }

        newObj[key] = targetAsset;
      } else {
        newObj[key] = obj[key];
      }
    });

    if (assetType) {
      Object.keys(assetType.properties)
        .filter((x) => !propsList.includes(x))
        .forEach((key) => {
          const { node } = assetType.properties[key];
          if (
            (node.type === 'ref' && node.ref.startsWith('AssetWrapper')) ||
            (node.type === 'array' &&
              node.elementType.type === 'ref' &&
              node.elementType.ref.startsWith('AssetWrapper'))
          ) {
            const targetAsset = {
              asset: this.createDropTarget(
                xlrService,
                undefined,
                this.makeDropTargetContext(
                  xlrService,
                  newObj,
                  key,
                  node.type === 'array'
                ),
                newObj
              ),
            };
            newObj[key] = node.type === 'array' ? [targetAsset] : targetAsset;
          }
        });
    }

    if (Array.isArray(obj)) {
      newObj.length = obj.length;
      return Array.from(newObj);
    }

    return newObj;
  }

  public importView(view: View, xlrService: XLRService) {
    this.realAssetMappings.clear();
    this.dropTargetAssets.clear();
    this.assetsToTargets.clear();
    this.targetsToAssets.clear();
    this.ROOT = this.createDropTarget(
      xlrService,
      this.addDndStateToAsset(view, xlrService)
    );
  }

  get view(): View {
    return this.ROOT;
  }

  get flow(): FlowWithOneView {
    const { view } = this;

    return {
      id: 'dnd-controller',
      views: [view],
      schema: this.schema,
      data: this.data,
      navigation: this.navigation,
    };
  }
}
