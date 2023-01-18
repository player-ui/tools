import { waitFor } from '@testing-library/react';
import type { Asset, InProgressState } from '@player-ui/react';
import pluginManifest from '@player-tools/static-xlrs/static_xlrs/plugin/xlr/manifest';
import typesManifest from '@player-tools/static-xlrs/static_xlrs/core/xlr/manifest';
import type { ObjectType } from '@player-tools/xlr';
import { DragAndDropController } from '../controller';
import type { ExtensionProvider } from '../types';

const referenceAssetExtension: ExtensionProvider = {
  plugin: class test {
    name = 'test';
  },
  manifest: pluginManifest as any,
};

describe('drag-and-drop', () => {
  it('Fills in placeholder assets when dropped', async () => {
    const dndController = new DragAndDropController({
      types: typesManifest,
      extensions: [referenceAssetExtension],
      resolveRequiredProperties: async (
        asset: Asset<string>,
        type: ObjectType
      ) => {
        return asset;
      },
    });

    const { player } = dndController.webPlayer;
    /**
     *
     */
    const getView = () =>
      (player.getState() as InProgressState).controllers?.view.currentView
        ?.lastUpdate;

    expect(getView()?.id).toBe('drag-and-drop-view');

    getView()?.replaceAsset({
      pluginName: 'BaseAssetsPlugin',
      name: 'InfoAsset',
    });

    await waitFor(() => {
      expect(getView()?.value?.asset.type).toBe('info');
    });

    getView()?.value.asset.title.asset.replaceAsset({
      pluginName: 'BaseAssetsPlugin',
      name: 'TextAsset',
    });

    await waitFor(() => {
      expect(getView()?.value?.asset.title.asset.value.asset.type).toBe('text');
    });

    expect(dndController.exportView()).toStrictEqual({
      id: 'drag-and-drop-view-test-1',
      type: 'info',
      title: {
        asset: {
          id: 'drag-and-drop-view-title-test-1',
          type: 'text',
        },
      },
    });
  });
});
