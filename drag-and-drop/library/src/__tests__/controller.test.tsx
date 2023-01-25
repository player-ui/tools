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
      resolveCollectionConversion: async (assets, XLRSDK) => {
        return {
          asset: {
            id: 'generated-collection',
            type: 'collection',
            values: assets.map((asset) => asset.asset),
          },
          type: {
            name: 'CollectionAsset',
            type: 'object',
            source: '',
            properties: {
              label: {
                required: false,
                node: {
                  type: 'ref',
                  ref: 'AssetWrapper',
                  title: 'CollectionAsset.label',
                  description: 'An optional label to title the collection',
                },
              },
              values: {
                required: false,
                node: {
                  type: 'array',
                  elementType: {
                    type: 'ref',
                    ref: 'AssetWrapper',
                  },
                  title: 'CollectionAsset.values',
                  description: 'The string value to show',
                },
              },
            },
            additionalProperties: false,
            title: 'CollectionAsset',
            extends: {
              type: 'ref',
              ref: "Asset<'collection'>",
              genericArguments: [
                {
                  type: 'string',
                  const: 'collection',
                },
              ],
            },
          },
        };
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

    getView()?.placeAsset({
      pluginName: 'BaseAssetsPlugin',
      name: 'InfoAsset',
    });

    await waitFor(() => {
      expect(getView()?.value?.asset.type).toBe('info');
    });

    getView()?.value.asset.title.asset.placeAsset({
      pluginName: 'BaseAssetsPlugin',
      name: 'TextAsset',
    });

    await waitFor(() => {
      expect(getView()?.value?.asset.title.asset.value.asset.type).toBe('text');
    });

    expect(dndController.exportContent()).toMatchInlineSnapshot(`
      Object {
        "actions": Array [],
        "id": "drag-and-drop-view-info",
        "title": Object {
          "asset": Object {
            "id": "drag-and-drop-view-title-text",
            "type": "text",
          },
        },
        "type": "info",
      }
    `);
  });
});
