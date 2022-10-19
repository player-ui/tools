import { waitFor } from '@testing-library/react';
import type { InProgressState } from '@player-ui/react';
import manifest from '@player-tools/static-xlrs/static_xlrs/plugin/xlr/manifest';
import { DragAndDropController } from '../controller';
import type { ExtensionProvider } from '../types';

const referenceAssetExtension: ExtensionProvider = {
  plugin: class test {
    name = 'test';
  },
  manifest: manifest as any,
};

describe('drag-and-drop', () => {
  it('Fills in placeholder assets when dropped', async () => {
    const dndController = new DragAndDropController({
      extensions: [referenceAssetExtension],
    });

    const { player } = dndController.webPlayer;
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
          id: 'drag-and-drop-view-test-title-test-1',
          type: 'text',
        },
      },
    });
  });
});
