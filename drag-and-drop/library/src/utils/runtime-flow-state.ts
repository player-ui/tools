import type { ObjectType } from '@player-tools/xlr';
import type { XLRService } from '@player-tools/language-service';
import type { TypeMetadata } from '@player-tools/xlr-sdk';
import type { Asset, View } from '@player-ui/types';
import type {
  ExtensionProviderAssetIdentifier,
  FlowWithOneView,
  DropTargetAssetType,
} from '../types';
import { DragAndDropAssetType } from '../types';

/** The type for exporting and restoring the flow state */
export interface ExportedRuntimeFlowState {
  /**
   *
   */
  root: DropTargetAssetType;
}

export interface RuntimeFlowStateOptions {
  /**
   *
   */
  restoreFrom?: {
    /**
     *
     */
    state: ExportedRuntimeFlowState;
  };

  /**
   * Function to call when a placed asset has required properties that need to be resolved before actually placing it.
   */
  resolveRequiredProperties: (asset: Asset, type: ObjectType) => Promise<Asset>;
}

/** The context for the drop target */
interface DropTargetContextType {
  /** The name of the property that this asset fulfills */
  propName: string;

  /** The parent asset type */
  parentAssetType: string;
}

/**
 *
 */
export class RuntimeFlowState {
  private ROOT: DropTargetAssetType;
  private assetMappings: Record<string, DropTargetAssetType> = {};
  private resolveRequiredProperties: (
    asset: Asset,
    type: ObjectType
  ) => Promise<Asset>;

  constructor(options: RuntimeFlowStateOptions) {
    this.ROOT = {
      __type: DragAndDropAssetType,
      id: 'drag-and-drop-view',
      type: 'drop-target',
    };
    this.assetMappings[this.ROOT.id] = this.ROOT;

    this.resolveRequiredProperties = options?.resolveRequiredProperties;
  }

  export(): ExportedRuntimeFlowState {
    return {
      root: this.ROOT,
    };
  }

  updateAsset(id: string, newAsset: Asset) {
    const asset = this.assetMappings[id];
    if (!asset) {
      throw new Error(`Cannot set asset value for unknown id: ${id}`);
    }

    if (!asset.value) {
      throw new Error(`Cannot set properties on asset without a value`);
    }

    asset.value.asset = newAsset;
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
      id: `${idPrefix}-test-1`,
      type: typeProp,
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
        prop.node.type === 'ref' &&
        prop.node.ref.startsWith('AssetWrapper')
      ) {
        const generatedAsset: DropTargetAssetType = {
          __type: DragAndDropAssetType,
          id: `${idPrefix}-${key}`,
          type: 'drop-target',
          context: {
            propertyName: key,
            parent: {
              pluginName: 'test',
              name: typeProp,
            },
          },
        };

        this.assetMappings[generatedAsset.id] = generatedAsset;
        asset[key] = { asset: generatedAsset };
      }
    });

    if (hasRequiredProperties) {
      asset = await this.resolveRequiredProperties(asset, type);
    }

    return asset;
  }

  async replace(
    id: string,
    replacement: {
      /** The identifier for where the populated asset is from */
      identifier: ExtensionProviderAssetIdentifier;

      /** The current descriptor for the value stored at this asset */
      type: ObjectType;
    }
  ): Promise<void> {
    const asset = this.assetMappings[id];
    if (!asset) {
      throw new Error(`Cannot set asset value for unknown id: ${id}`);
    }

    const newAsset = await this.createNewAsset(id, replacement.type);

    asset.value = {
      ...replacement,
      asset: newAsset,
    };
  }

  get(id: string): {
    /** The Asset that correlates to the given ID */
    asset: Asset;
    /** The underlying XLR type for the Asset */
    type: ObjectType;
  } {
    const asset = this.assetMappings[id];

    if (!asset || !asset.value) {
      throw new Error(`Cannot get asset value for unknown id: ${id}`);
    }

    return { asset: asset.value.asset, type: asset.value.type };
  }

  append(
    id: string,
    replacement: {
      /** The identifier for where the populated asset is from */
      identifier: ExtensionProviderAssetIdentifier;

      /** The current descriptor for the value stored at this asset */
      type: ObjectType;
    }
  ) {}

  clear(id: string) {
    const asset = this.assetMappings[id];
    if (!asset) {
      throw new Error(`Cannot clear asset. Not found: ${id}`);
    }

    asset.value = undefined;
  }

  createDropTarget(
    xlrService: XLRService,
    targetAsset: Asset,
    dropTargetContext: DropTargetContextType
  ): DropTargetAssetType {
    const targetAssetType = xlrService.XLRSDK.getType(
      targetAsset.type
    ) as ObjectType;
    const { plugin } = xlrService.XLRSDK.getTypeInfo(
      targetAsset.type
    ) as TypeMetadata;
    const dropTarget: DropTargetAssetType = {
      id: `${targetAsset.id}-dropTarget`,
      __type: DragAndDropAssetType,
      type: 'drop-target',
      value: {
        identifier: {
          pluginName: plugin,
          name: targetAssetType.name ?? '',
          capability:
            dropTargetContext.parentAssetType.length === 0 ? 'Views' : 'Assets',
        },
        type: targetAssetType,
        asset: targetAsset,
      },
    };

    if (
      dropTargetContext.parentAssetType.length > 0 &&
      dropTargetContext.propName.length > 0
    ) {
      dropTarget.context = {
        propertyName: dropTargetContext.propName,
        parent: {
          pluginName: plugin,
          name: dropTargetContext.parentAssetType,
        },
      };
    }

    this.assetMappings[dropTarget.id] = dropTarget;
    return dropTarget;
  }

  addDndStateToAsset(
    obj: any,
    xlrService: XLRService,
    dropTargetContext: DropTargetContextType
  ) {
    if (obj === null) {
      return obj;
    }

    const newObj = { ...obj };
    const assetType = xlrService.XLRSDK.getType(obj.type) as ObjectType;
    Object.keys(newObj).forEach((key) => {
      let isAssetWrapper = false;
      if (assetType && key in assetType.properties) {
        const { node } = assetType.properties[key];
        if (
          (node.type === 'ref' && node.ref.startsWith('AssetWrapper')) ||
          (node.type === 'array' &&
            node.elementType.type === 'ref' &&
            node.elementType.ref.startsWith('AssetWrapper'))
        ) {
          isAssetWrapper = true;
        }
      }

      if (
        key === 'asset' &&
        dropTargetContext.propName.length > 0 &&
        dropTargetContext.parentAssetType.length > 0
      ) {
        newObj[key] = this.createDropTarget(
          xlrService,
          this.addDndStateToAsset(obj[key], xlrService, dropTargetContext),
          dropTargetContext
        );
      } else if (typeof obj[key] === 'object') {
        newObj[key] = this.addDndStateToAsset(
          obj[key],
          xlrService,
          isAssetWrapper
            ? { propName: key, parentAssetType: obj.type }
            : dropTargetContext
        );
      } else {
        newObj[key] = obj[key];
      }
    });
    if (Array.isArray(obj)) {
      newObj.length = obj.length;
      return Array.from(newObj);
    }

    return newObj;
  }

  importView(view: View, xlrService: XLRService) {
    const dropTargetContext: DropTargetContextType = {
      propName: '',
      parentAssetType: '',
    };
    this.assetMappings = {};
    this.ROOT = this.createDropTarget(
      xlrService,
      this.addDndStateToAsset(view, xlrService, dropTargetContext),
      dropTargetContext
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
