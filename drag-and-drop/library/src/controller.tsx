import React from 'react';
import type { Asset, AssetWrapper, ReactPlayer, View } from '@player-ui/react';
import type { DataModel, Navigation, Schema } from '@player-ui/player';
import { ConsoleLogger, WebPlayer } from '@player-ui/react';
import { Subscribe } from '@player-ui/react-subscribe';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { NamedType, ObjectType, TSManifest } from '@player-tools/xlr';
import {
  TRANSFORM_FUNCTIONS,
  XLRService,
} from '@player-tools/json-language-service';
import type { TypeMetadata } from '@player-tools/xlr-sdk';
import type { XLRSDK } from '@player-tools/xlr-sdk';
import { PlayerDndPlugin } from './utils';
import type {
  PluginProvider,
  ExtensionProviderAssetIdentifier,
  TransformedDropTargetAssetType,
} from './types';
import { RuntimeFlowState } from './utils/runtime-flow-state';
import { DropComponent } from './utils/drop-component';
import { removeDndStateFromView } from './utils/helpers';

export interface DragAndDropControllerOptions {
  /** Player plugins for adding assets and functionality */
  plugins?: Array<PluginProvider>;

  /** Manifest for extensions that have drag and drop assets */
  manifests?: Array<TSManifest>;

  /** Manifest for the base Player types package  to use */
  playerTypes: TSManifest;

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
  resolveCollectionConversion: (
    /** The Assets to include in the collection */
    assets: Array<AssetWrapper>,
    /** An instance of the XLRSDK to perform any required type lookups */
    XLRSDK: XLRSDK
  ) => {
    /** The generated collection asset with the provided `assets` array as children */
    asset: Asset;
    /** The corresponding type for the generated collection asset */
    type: NamedType<ObjectType>;
  };

  /** A custom component to use for rendering droppable Assets */
  Component?: React.ComponentType<TransformedDropTargetAssetType>;
}

/**
 * The DragAndDropController is the main entry point for the Drag and Drop library.
 */
export class DragAndDropController {
  private readonly options: DragAndDropControllerOptions;
  public readonly webPlayer: ReactPlayer;
  public readonly stateUpdateSubscription =
    new Subscribe<DragAndDropController>();

  private readonly dndWebPlayerPlugin: PlayerDndPlugin;
  private readonly runtimeState: RuntimeFlowState;
  private readonly XLRSDK: XLRSDK;

  public Context: React.ComponentType<React.PropsWithChildren<unknown>>;

  public get Canvas() {
    return this.webPlayer.Component;
  }

  public getPlayerNavigationSection(): Navigation {
    return this.runtimeState.navigation;
  }

  public setPlayerNavigationSection(navigation: Navigation) {
    this.runtimeState.navigation = navigation;
  }

  public getPlayerSchemaSection() {
    return this.runtimeState.schema;
  }

  public setPlayerSchemaSection(schema: Schema.Schema) {
    this.runtimeState.schema = schema;
  }

  public getPlayerDataSection() {
    return this.runtimeState.data;
  }

  public setPlayerDataSection(data: DataModel) {
    this.runtimeState.data = data;
  }

  constructor(options: DragAndDropControllerOptions) {
    this.options = options ?? {};

    this.XLRSDK = new XLRService().XLRSDK;
    this.XLRSDK.loadDefinitionsFromModule(options.playerTypes);
    options?.manifests?.forEach((manifest) => {
      this.XLRSDK.loadDefinitionsFromModule(manifest, {}, TRANSFORM_FUNCTIONS);
    });

    this.runtimeState = new RuntimeFlowState({
      resolveRequiredProperties: options.resolveRequiredProperties,
      resolveCollectionConversion: (assets: Array<AssetWrapper>) => {
        const { asset, type } = options.resolveCollectionConversion(
          assets,
          this.XLRSDK
        );

        const typeInfo = this.XLRSDK.getTypeInfo(type.name);
        if (!typeInfo) {
          throw new Error(
            `SDK Error: Unable to get type info for collection type ${type.name}`
          );
        }

        return {
          asset,
          identifier: {
            assetName: type.name,
            pluginName: typeInfo.plugin,
            capability: typeInfo.capability,
          },
        };
      },
      handleDndStateChange: () => {
        this.stateUpdateSubscription.publish(this);
      },
    });

    this.dndWebPlayerPlugin = new PlayerDndPlugin({
      state: this.runtimeState,
      Target: {
        Component: this.options.Component ?? DropComponent,
      },
      getXLRTypeForAsset: (identifier) => {
        const asset = this.XLRSDK.getType(identifier.assetName);
        if (!asset) {
          throw new Error(
            `SDK Error: Unable to get asset ${identifier.assetName}`
          );
        }

        if (asset.type !== 'object') {
          throw new Error(
            `SDK Error: Type ${identifier.assetName} doesn't appear to be an Asset`
          );
        }

        return asset;
      },
    });

    this.webPlayer = new WebPlayer({
      plugins: [
        this.dndWebPlayerPlugin,
        ...(options?.plugins?.map((Plugin) => new Plugin()) ?? []),
      ],
    });

    this.webPlayer.player.logger.addHandler(new ConsoleLogger('debug'));

    this.Context = (props: React.PropsWithChildren<unknown>) => {
      return <DndProvider backend={HTML5Backend}>{props.children}</DndProvider>;
    };

    this.webPlayer.start(this.runtimeState.flow);
  }

  /**
   * Gets info on all XLRs that have been registered to the SDK
   * This won't return anything that is registered as a Type or has "Transformed" in its named
   */
  public getAvailableAssets(): Array<ExtensionProviderAssetIdentifier> {
    const assets = this.XLRSDK.listTypes({
      capabilityFilter: 'Types',
      typeFilter: 'Transformed',
    });
    return assets.map((asset) => {
      const assetName = asset.name;
      const typeInfo = this.XLRSDK.getTypeInfo(assetName) as TypeMetadata;
      return {
        pluginName: typeInfo.plugin,
        assetName,
        capability: typeInfo.capability,
      };
    });
  }

  /**
   * Returns the XLR for an Asset/View
   *
   * @param assetName - Player 'type' string for the Asset/View to retrieve
   */
  public getAssetDetails(assetName: string): NamedType<ObjectType> {
    return this.XLRSDK.getType(assetName) as NamedType<ObjectType>;
  }

  /**
   * Returns the underlying Asset and XLR type for a dropped Asset in the tree
   *
   * @param assetSymbol - UUID Symbol attached to the Asset
   */
  public getAsset(assetSymbol: symbol): {
    /** The Asset that correlates to the given ID */
    asset: Asset;
    /** The underlying XLR type for the Asset */
    type: ObjectType;
  } {
    const placedAsset = this.runtimeState.getAsset(assetSymbol);
    const type = this.XLRSDK.getType(placedAsset?.identifier.assetName);
    if (!type) {
      throw new Error(
        `Unable to find type for asset ${placedAsset?.identifier.assetName}`
      );
    }

    return {
      asset: placedAsset.asset,
      type: type as ObjectType,
    };
  }

  /**
   * Updates a dropped asset with the provided properties
   * **It is not recommended to update any AssetWrapper or Array<AssetWrapper> properties**
   *
   * @param assetSymbol - UUID Symbol attached to the Asset
   * @param newObject - The updates to apply to the dropped asset
   */
  public updateAsset(assetSymbol: symbol, newObject: Asset) {
    this.runtimeState.updateAsset(assetSymbol, newObject);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
    this.stateUpdateSubscription.publish(this);
  }

  public async placeAsset(
    dropTargetSymbol: symbol,
    identifier: ExtensionProviderAssetIdentifier,
    type: NamedType<ObjectType>,
    action: 'replace' | 'append' | 'prepend' = 'replace'
  ) {
    await this.runtimeState.placeAsset(
      dropTargetSymbol,
      { identifier, type },
      action
    );
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
    this.stateUpdateSubscription.publish(this);
  }

  /**
   * Removes an Asset from the View
   *
   * @param assetSymbol - UUID Symbol attached to the Asset
   */
  public removeAsset(assetSymbol: symbol) {
    this.runtimeState.clearAsset(assetSymbol);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
    this.stateUpdateSubscription.publish(this);
  }

  /**
   * Exports the content that was built in the editor without any drag and drop specific assets.
   * This content will be able to run in a player configured with the same plugins loaded into the editor
   * */
  public exportContent(): View {
    return removeDndStateFromView(this.runtimeState.view);
  }

  /**
   * Imports existing content and populates the state of drag and drop
   *
   * @param view - player content
   */
  public importView(view: View) {
    this.runtimeState.importView(view, this.XLRSDK);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
  }

  /**
   * Exports the full state of the drag and drop editor that can be used to resume editing later
   */
  public exportState(): View {
    return this.runtimeState.view;
  }
}
