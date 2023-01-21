import type { ObjectNode } from '@player-tools/xlr';
import type {
  ReactPlayer,
  ReactPlayerPlugin,
  Asset,
  ViewController,
  Player,
} from '@player-ui/react';
import type {
  ExtensionProviderAssetIdentifier,
  TransformedDropTargetAssetType,
} from '../types';
import type { RuntimeFlowState } from './runtime-flow-state';

/** Options for controlling the drag-and-drop functionality */
export interface PlayerDndPluginOptions<
  TargetPropsType extends Asset = TransformedDropTargetAssetType
> {
  /** The Target component represents a drop-target */
  Target: {
    /** The React component to use */
    Component: React.ComponentType<TargetPropsType>;

    /** An optional override for the asset-type */
    type?: TargetPropsType['type'];
  };

  /** An optional override for the transition name when refreshing a flow */
  refreshTransition?: string;

  /**
   *
   */
  getXLRTypeForAsset: (
    identifier: ExtensionProviderAssetIdentifier
  ) => ObjectNode;

  /** A manager for the current flow state */
  state: RuntimeFlowState;
}

interface PlayerDndPluginState {
  /** Re-render the view with updates from external updates */
  refreshView: () => void;
}

/**
 * A plugin that handles drag and drop integration
 */
export class PlayerDndPlugin implements ReactPlayerPlugin {
  name = 'player-dnd-plugin';

  private state: WeakMap<Player, PlayerDndPluginState> = new WeakMap();
  private readonly options: PlayerDndPluginOptions;

  constructor(options: PlayerDndPluginOptions) {
    this.options = options;
  }

  refresh(p: Player) {
    this.state.get(p)?.refreshView();
  }

  apply(player: Player) {
    const match = { type: this.options.Target.type ?? 'drop-target' };

    player.hooks.viewController.tap(this.name, (vc) => {
      vc.transformRegistry.set(match, {
        resolve: (asset) => {
          return {
            ...asset,

            // Send back up to the runtime-state handler to compute the new view
            replaceAsset: (identifier: ExtensionProviderAssetIdentifier) => {
              console.log(`Replacing asset at: ${asset.id}`);

              this.options.state
                .replace(asset.id, {
                  identifier,
                  type: this.options.getXLRTypeForAsset(identifier),
                })
                .then(() => this.refresh(player));
            },
            appendAsset: (identifier: ExtensionProviderAssetIdentifier) => {
              console.log(`Appending to asset at: ${asset.id}`);

              this.options.state.append(asset.id, {
                identifier,
                type: this.options.getXLRTypeForAsset(identifier),
              });
              this.refresh(player);
            },
            clearAsset: () => {
              console.log(`Clearing asset at: ${asset.id}`);

              this.options.state.clear(asset.id);
              this.refresh(player);
            },
          };
        },
      });
    });

    player.hooks.resolveFlowContent.tap(this.name, () => {
      return this.options.state.flow;
    });

    player.hooks.viewController.tap(this.name, (vc: ViewController) => {
      vc.hooks.resolveView.tap(this.name, () => {
        console.log(`Current View`, this.options.state.view);
        return this.options.state.view;
      });
    });

    const state: PlayerDndPluginState = {
      refreshView: () => {
        const s = player.getState();
        if (s.status === 'in-progress') {
          s.controllers.flow.transition(
            this.options.refreshTransition ?? 'refresh'
          );
        }
      },
    };

    this.state.set(player, state);
  }

  applyReact(webPlayer: ReactPlayer) {
    const match = { type: this.options.Target.type ?? 'drop-target' };
    webPlayer.assetRegistry.set(match, this.options.Target.Component);
  }
}
