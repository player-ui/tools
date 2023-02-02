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
    expect(dndView.value.identifier.name).toStrictEqual('CollectionAsset');
    expect(dndView.value.identifier.capability).toStrictEqual('Views');
    expect(dndView.value.type.name).toStrictEqual('CollectionAsset');
    expect(dndView.value.asset.id).toStrictEqual(
      'drag-and-drop-view-collection-1'
    );
    expect(dndView.value.asset.type).toStrictEqual('collection');
    expect(dndView.value.asset.label.asset.type).toStrictEqual('drop-target');
    expect(dndView.value.asset.label.asset.context.parent.name).toStrictEqual(
      'collection'
    );
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
  });
});
