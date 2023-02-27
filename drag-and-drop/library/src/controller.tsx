import React from 'react';
import type {
  Asset,
  AssetWrapper,
  ReactPlayer,
  View,
  ReactPlayerPlugin,
} from '@player-ui/react';
import { ConsoleLogger, WebPlayer } from '@player-ui/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { NamedType, ObjectType, TSManifest } from '@player-tools/xlr';
import { XLRService } from '@player-tools/language-service';
import type { TypeMetadata } from '@player-tools/xlr-sdk';
import { PlayerDndPlugin } from './utils';
import type {
  ExtensionProvider,
  ExtensionProviderAssetIdentifier,
  TransformedDropTargetAssetType,
} from './types';
import { RuntimeFlowState } from './utils/runtime-flow-state';
import { DropComponent } from './utils/drop-component';
import { removeDndStateFromView } from './utils/helpers';

export interface DragAndDropControllerOptions {
  /** The list of XLR enabled extensions to load as available resources */
  extensions?: Array<ExtensionProvider>;
  /** Player plugins that aren't necessarily assets to be dragged and dropped. */
  plugins?: Array<ReactPlayerPlugin>;

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
    XLRSDK: XLRService
  ) => {
    /** The generated collection asset with the provided `assets` array as children */
    asset: Asset;
    /** The corresponding type for the generated collection asset */
    type: NamedType<ObjectType>;
  };

  /**
   * Function that will be called when Drag and Drop state changes
   */
  handleDndStateChange: (
    /** The player content without any drag and drop specific assets */
    content: View
  ) => void;

  /** A custom component to use for rendering droppable Assets */
  Component?: React.ComponentType<TransformedDropTargetAssetType>;
}

/**
 *
 */
export class DragAndDropController {
  private readonly options: DragAndDropControllerOptions;
  public readonly webPlayer: ReactPlayer;

  private readonly dndWebPlayerPlugin: PlayerDndPlugin;
  private readonly runtimeState: RuntimeFlowState;
  private readonly PlayerXLRService: XLRService;

  public Context: React.ComponentType<React.PropsWithChildren<unknown>>;

  public get Canvas() {
    return this.webPlayer.Component;
  }

  constructor(options: DragAndDropControllerOptions) {
    this.options = options ?? {};

    this.PlayerXLRService = new XLRService();
    this.PlayerXLRService.XLRSDK.loadDefinitionsFromModule(options.playerTypes);
    options?.extensions?.forEach((extension) => {
      this.PlayerXLRService.XLRSDK.loadDefinitionsFromModule(
        extension.manifest
      );
    });

    this.runtimeState = new RuntimeFlowState({
      resolveRequiredProperties: options.resolveRequiredProperties,
      resolveCollectionConversion: (assets: Array<AssetWrapper>) => {
        return options.resolveCollectionConversion(
          assets,
          this.PlayerXLRService
        );
      },
      handleDndStateChange: options.handleDndStateChange,
    });

    this.dndWebPlayerPlugin = new PlayerDndPlugin({
      state: this.runtimeState,
      Target: {
        Component: this.options.Component ?? DropComponent,
      },
      getXLRTypeForAsset: (identifier) => {
        const asset = this.PlayerXLRService.XLRSDK.getType(
          identifier.assetName
        );
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
        // eslint-disable-next-line new-cap
        ...(options?.extensions ?? []).map((e) => new e.plugin()),
        ...(options?.plugins ?? []),
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
    const assets = this.PlayerXLRService.XLRSDK.listTypes({
      capabilityFilter: 'Types',
      typeFilter: 'Transformed',
    });
    return assets.map((asset) => {
      const assetName = asset.name;
      const typeInfo = this.PlayerXLRService.XLRSDK.getTypeInfo(
        assetName
      ) as TypeMetadata;
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
    return this.PlayerXLRService.XLRSDK.getType(
      assetName
    ) as NamedType<ObjectType>;
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
    return this.runtimeState.getAsset(assetSymbol);
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
  }

  /**
   * Removes an Asset from the View
   *
   * @param assetSymbol - UUID Symbol attached to the Asset
   */
  public removeAsset(assetSymbol: symbol) {
    this.runtimeState.clearAsset(assetSymbol);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
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
    this.runtimeState.importView(view, this.PlayerXLRService);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
  }

  /**
   * Exports the full state of the drag and drop editor that can be used to resume editing later
   */
  public exportState(): View {
    return this.runtimeState.view;
  }
}
