import React from 'react';
import type { AssetWrapper, View } from '@player-ui/react';
import { ConsoleLogger, WebPlayer } from '@player-ui/react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { ObjectNode } from '@player-tools/xlr';
import { PlayerDndPlugin } from './utils';
import type {
  DropTargetAssetType,
  ExtensionProvider,
  TransformedDropTargetAssetType,
} from './types';
import { isDropTargetAsset } from './types';
import { RuntimeFlowState } from './utils/runtime-flow-state';
import { DropComponent } from './utils/drop-component';

export interface DragAndDropControllerOptions {
  extensions?: Array<ExtensionProvider>;

  Component?: React.ComponentType<TransformedDropTargetAssetType>;
}

export class DragAndDropController {
  private readonly options: DragAndDropControllerOptions;
  public readonly webPlayer: WebPlayer;

  private readonly dndWebPlayerPlugin: PlayerDndPlugin;
  private readonly runtimeState: RuntimeFlowState;

  public get Canvas() {
    return this.webPlayer.Component;
  }

  public Context: React.ComponentType<React.PropsWithChildren<unknown>>;

  constructor(options?: DragAndDropControllerOptions) {
    this.options = options ?? {};

    this.runtimeState = new RuntimeFlowState();

    this.dndWebPlayerPlugin = new PlayerDndPlugin({
      state: this.runtimeState,
      Target: {
        Component: this.options.Component ?? DropComponent,
      },
      getXLRTypeForAsset: (identifier): ObjectNode => {
        const plugin = options?.extensions?.find(
          (id) => identifier.pluginName === id.manifest.pluginName
        );

        const asset = plugin?.manifest.capabilities?.Assets.find(
          (a) => a.name === identifier.name
        );

        if (asset?.type === 'object') {
          return asset as ObjectNode;
        }

        throw new Error(
          `Unable to find type information for asset identifier: ${identifier.name} in plugin ${identifier.pluginName}`
        );
      },
    });

    this.webPlayer = new WebPlayer({
      plugins: [this.dndWebPlayerPlugin],
    });

    this.webPlayer.player.logger.addHandler(new ConsoleLogger('debug'));

    this.Context = (props: React.PropsWithChildren<unknown>) => {
      return <DndProvider backend={HTML5Backend}>{props.children}</DndProvider>;
    };

    this.webPlayer.start(this.runtimeState.flow);
  }

  exportView(): View {
    const baseView = this.runtimeState.view;

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
