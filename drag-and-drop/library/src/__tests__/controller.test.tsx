import { waitFor } from '@testing-library/react';
import type { Asset, AssetWrapper, InProgressState } from '@player-ui/react';
import pluginManifest from '@player-tools/static-xlrs/static_xlrs/plugin/xlr/manifest';
import typesManifest from '@player-tools/static-xlrs/static_xlrs/core/xlr/manifest';
import type { ObjectType } from '@player-tools/xlr';
import { DragAndDropController } from '../controller';
import type {
  DropTargetAsset,
  DropTargetAssetContext,
  ExtensionProvider,
} from '../types';
import { getAssetSymbol } from '../utils/helpers';

const referenceAssetExtension: ExtensionProvider = {
  plugin: class test {
    name = 'test';
  },
  manifest: pluginManifest as any,
};

describe('drag-and-drop', () => {
  it('Fills in placeholder assets when dropped', async () => {
    const dndController = new DragAndDropController({
      playerTypes: typesManifest,
      extensions: [referenceAssetExtension],
      resolveRequiredProperties: async (
        asset: Asset<string>,
        type: ObjectType
      ) => {
        return asset;
      },
      resolveCollectionConversion: (assets, XLRSDK) => {
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
      assetName: 'InfoAsset',
    });

    await waitFor(() => {
      expect(getView()?.value?.asset.type).toBe('info');
    });

    getView()?.value.asset.title.asset.placeAsset({
      pluginName: 'BaseAssetsPlugin',
      assetName: 'TextAsset',
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

  it('Import existing content into drag and drop', async () => {
    // arrange
    const content = {
      id: 'drag-and-drop-view-collection-1',
      type: 'collection',
      label: {
        asset: {
          id: 'drag-and-drop-view-label-info-1',
          type: 'info',
          title: {
            asset: {
              id: 'drag-and-drop-view-label-title-test-1',
              type: 'text',
              value: 'title',
            },
          },
          subTitle: {
            asset: {
              id: 'drag-and-drop-view-label-subTitle-test-1',
              type: 'text',
              value: 'subtitle',
            },
          },
          primaryInfo: {
            asset: {
              id: 'drag-and-drop-view-label-primaryInfo-test-1',
              type: 'text',
              value: 'info',
            },
          },
        },
      },
      values: [
        {
          asset: {
            id: 'drag-and-drop-view-collection-text-1',
            type: 'text',
            value: 'text 1',
          },
        },
        {
          asset: {
            id: 'drag-and-drop-view-field-1',
            type: 'input',
            binding: 'field1',
            note: {
              asset: {
                id: 'drag-and-drop-view-input-note-test-1',
                type: 'text',
                value: 'input note',
              },
            },
          },
        },
        {
          asset: {
            id: 'drag-and-drop-view-action-1',
            type: 'action',
            exp: 'a > b',
          },
        },
      ],
    };
    const dndController = new DragAndDropController({
      playerTypes: typesManifest,
      extensions: [referenceAssetExtension],
      resolveRequiredProperties: jest.fn(),
      resolveCollectionConversion: jest.fn(),
    });
    const { player } = dndController.webPlayer;

    // act
    dndController.importView(content);
    /**
     *
     */
    const getView = () =>
      (player.getState() as InProgressState).controllers?.view.currentView
        ?.lastUpdate;

    // assert
    const dndView = getView() || {};
    expect(dndView.type).toStrictEqual('drop-target');
    expect(dndView.value.identifier.pluginName).toStrictEqual(
      'BaseAssetsPlugin'
    );
    expect(dndView.value.identifier.assetName).toStrictEqual('CollectionAsset');
    expect(dndView.value.identifier.capability).toStrictEqual('Views');
    expect(dndView.value.type.name).toStrictEqual('CollectionAsset');
    expect(dndView.value.asset.id).toStrictEqual(
      'drag-and-drop-view-collection-1'
    );
    expect(dndView.value.asset.type).toStrictEqual('collection');
    expect(dndView.value.asset.label.asset.type).toStrictEqual('drop-target');
    expect(
      dndView.value.asset.label.asset.context.parent.assetName
    ).toStrictEqual('collection');
    expect(dndView.value.asset.label.asset.context.propertyName).toStrictEqual(
      'label'
    );
    const { primaryInfo } = dndView.value.asset.label.asset.value.asset;
    expect(primaryInfo.asset.type).toStrictEqual('drop-target');
    expect(primaryInfo.asset.value.asset.value).toStrictEqual('info');
    const { values } = dndView.value.asset;
    expect(values).toHaveLength(3);
    const { note } = values[1].asset.value.asset;
    expect(note.asset.type).toStrictEqual('drop-target');
    expect(note.asset.value.asset.value).toStrictEqual('input note');
    const state = dndController.exportState() as DropTargetAsset;
    const label = state.value?.asset.label as AssetWrapper;
    expect(label.asset.type).toStrictEqual('drop-target');
    const labelContext = label.asset.context as DropTargetAssetContext;
    expect(labelContext.isArrayElement).toStrictEqual(false);
    expect(labelContext.propertyName).toStrictEqual('label');
    expect(labelContext.parent.assetName).toStrictEqual('collection');
    const collectionAssetWrapper = state.value as AssetWrapper;
    const collection = dndController.getAsset(
      getAssetSymbol(collectionAssetWrapper.asset)
    );
    expect(collection).not.toBeNull();
    expect(collection.type.name).toStrictEqual('CollectionAsset');
  });
});
