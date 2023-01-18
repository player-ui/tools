import React from 'react';
import type { Asset, AssetWrapper, View } from '@player-ui/react';
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
  TransformedDropTargetAssetType,
} from './types';
import { isDropTargetAsset } from './types';
import { RuntimeFlowState } from './utils/runtime-flow-state';
import { DropComponent } from './utils/drop-component';

export interface DragAndDropControllerOptions {
  /**
   *
   */
  extensions?: Array<ExtensionProvider>;

  /**
   *
   */
  types: TSManifest;

  /**
   *
   */
  Component?: React.ComponentType<TransformedDropTargetAssetType>;

  /**
   * Function to call when a placed asset has required properties that need to be resolved before actually placing it.
   */
  resolveRequiredProperties: (asset: Asset, type: ObjectType) => Promise<Asset>;
}

/**
 *
 */
export class DragAndDropController {
  private readonly options: DragAndDropControllerOptions;
  public readonly webPlayer: WebPlayer;

  private readonly dndWebPlayerPlugin: PlayerDndPlugin;
  private readonly runtimeState: RuntimeFlowState;
  private readonly PlayerXLRService: XLRService;

  public Context: React.ComponentType<React.PropsWithChildren<unknown>>;

  public get Canvas() {
    return this.webPlayer.Component;
  }

  constructor(options: DragAndDropControllerOptions) {
    this.options = options ?? {};

    this.runtimeState = new RuntimeFlowState({
      resolveRequiredProperties: options.resolveRequiredProperties,
    });

    this.PlayerXLRService = new XLRService();
    this.PlayerXLRService.XLRSDK.loadDefinitionsFromModule(options.types);
    options?.extensions?.forEach((extension) => {
      this.PlayerXLRService.XLRSDK.loadDefinitionsFromModule(
        extension.manifest
      );
    });

    this.dndWebPlayerPlugin = new PlayerDndPlugin({
      state: this.runtimeState,
      Target: {
        Component: this.options.Component ?? DropComponent,
      },
      getXLRTypeForAsset: (identifier): ObjectType => {
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

  public getAsset(assetID: string) {
    return this.runtimeState.get(assetID);
  }

  public updateAsset(id: string, newObject: Asset) {
    this.runtimeState.updateAsset(id, newObject);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
  }

  public removeAsset(id: string) {
    this.runtimeState.clear(id);
    this.dndWebPlayerPlugin.refresh(this.webPlayer.player);
  }

  public exportView(): View {
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
}
