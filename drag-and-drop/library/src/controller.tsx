import React from 'react';
import type { Asset, AssetWrapper, ReactPlayer, View } from '@player-ui/react';
import { ConsoleLogger, WebPlayer } from '@player-ui/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { NamedType, ObjectType, TSManifest } from '@player-tools/xlr';
import { XLRService } from '@player-tools/language-service';
import type { TypeMetadata } from '@player-tools/xlr-sdk';
import { PlayerDndPlugin } from './utils';
import type {
  DropTargetAssetType,
  ExtensionProvider,
  ExtensionProviderAssetIdentifier,
  PlacedAsset,
  TransformedDropTargetAssetType,
} from './types';
import { isDropTargetAsset } from './types';
import { RuntimeFlowState } from './utils/runtime-flow-state';
import { DropComponent } from './utils/drop-component';

export interface DragAndDropControllerOptions {
  /** The list of XLR enabled extensions to load as available resources */
  extensions?: Array<ExtensionProvider>;

  /** Manifest for the base Player types package  to use */
  types: TSManifest;

  /**
   * Function to call when a placed asset has required properties that need to be resolved before actually placing it.
   */
  resolveRequiredProperties: (asset: Asset, type: ObjectType) => Promise<Asset>;

  /**
   * Function that will be called when multiple assets are dropped onto the same target and a collection needs to be created
   */
  resolveCollectionConversion: (
    assets: Array<PlacedAsset>,
    XLRSDK: XLRService
  ) => Promise<{
    /** The generated collection asset with the provided `assets` array as children */
    asset: Asset;
    /** The corresponding type for the generated collection asset */
    type: ObjectType;
  }>;

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
    this.PlayerXLRService.XLRSDK.loadDefinitionsFromModule(options.types);
    options?.extensions?.forEach((extension) => {
      this.PlayerXLRService.XLRSDK.loadDefinitionsFromModule(
        extension.manifest
      );
    });

    this.runtimeState = new RuntimeFlowState({
      resolveRequiredProperties: options.resolveRequiredProperties,
      resolveCollectionConversion: (assets: Array<PlacedAsset>) => {
        return options.resolveCollectionConversion(
          assets,
          this.PlayerXLRService
        );
      },
    });

    this.dndWebPlayerPlugin = new PlayerDndPlugin({
      state: this.runtimeState,
      Target: {
        Component: this.options.Component ?? DropComponent,
      },
      getXLRTypeForAsset: (identifier) => {
        return this.PlayerXLRService.XLRSDK.getType(
          identifier.name
        ) as NamedType<ObjectType>;
      },
    });

    this.webPlayer = new WebPlayer({
      plugins: [
        this.dndWebPlayerPlugin,
        // eslint-disable-next-line new-cap
        ...(options?.extensions ?? []).map((e) => new e.plugin()),
      ],
    });

    this.webPlayer.player.logger.addHandler(new ConsoleLogger('debug'));

    this.Context = (props: React.PropsWithChildren<unknown>) => {
      return <DndProvider backend={HTML5Backend}>{props.children}</DndProvider>;
    };

    this.webPlayer.start(this.runtimeState.flow);
  }

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
        name: assetName,
        capability: typeInfo.capability,
      };
    });
  }

  public getAssetDetails(assetName: string): NamedType<ObjectType> {
    return this.PlayerXLRService.XLRSDK.getType(
      assetName
    ) as NamedType<ObjectType>;
  }

  public getAsset(assetID: symbol) {
    return this.runtimeState.getAsset(assetID);
  }

  public updateAsset(id: symbol, newObject: Asset) {
    this.runtimeState.updateAsset(id, newObject);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
  }

  public removeAsset(id: symbol) {
    this.runtimeState.clearAsset(id);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
  }

  /**
   * Exports the content that was built in the editor without any drag and drop specific assets.
   * This content will be able to run in a player configured with the same plugins loaded into the editor
   * */
  public exportContent(): View {
    const baseView = this.runtimeState.view;

    /**
     *
     */
    const removeDndStateFromView = (obj: unknown): any => {
      if (obj === baseView && isDropTargetAsset(obj)) {
        if (obj.value?.asset) {
          return removeDndStateFromView(obj.value.asset);
        }

        return undefined;
      }

      if (Array.isArray(obj)) {
        return obj
          .map((objectMember) => removeDndStateFromView(objectMember))
          .filter((n) => n !== null && n !== undefined);
      }

      if (typeof obj === 'object' && obj !== null) {
        if ('asset' in obj) {
          const asWrapper: AssetWrapper<DropTargetAssetType> = obj as any;
          if ('asset' in obj && isDropTargetAsset(asWrapper.asset)) {
            if (asWrapper.asset.value) {
              const nestedValue = removeDndStateFromView(
                asWrapper.asset.value.asset
              );

              // eslint-disable-next-line max-depth
              if (nestedValue) {
                return {
                  asset: nestedValue,
                };
              }
            }

            return undefined;
          }
        }

        return Object.fromEntries(
          Object.entries(obj).map(([key, value]) => [
            key,
            removeDndStateFromView(value),
          ])
        );
      }

      return obj;
    };

    // remove any undefined values from the view
    // we only want JSON compliant values
    return JSON.parse(JSON.stringify(removeDndStateFromView(baseView)));
  }

  /**
   * Exports the full state of the drag and drop editor that can be used to resume editing later
   */
  public exportState(): View {
    return this.runtimeState.view;
  }
}
