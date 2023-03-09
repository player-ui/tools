import type { NamedType, TransformFunction } from '@player-tools/xlr';
import { parseTree } from 'jsonc-parser';
import typesManifest from '@player-tools/static-xlrs/static_xlrs/core/xlr/manifest';
import pluginManifest from '@player-tools/static-xlrs/static_xlrs/plugin/xlr/manifest';
import type { Filters } from '../registry';
import { XLRSDK } from '../sdk';

const EXCLUDE: Filters = { typeFilter: 'Transformed' };

describe('Loading XLRs', () => {
  it('Loading from Disk', () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core');

    expect(sdk.hasType('Asset')).toStrictEqual(true);
    expect(sdk.hasType('AssetWrapper')).toStrictEqual(true);
    expect(sdk.hasType('Binding')).toStrictEqual(true);
    expect(sdk.hasType('BindingRef')).toStrictEqual(true);
    expect(sdk.hasType('ExpressionRef')).toStrictEqual(true);
    expect(sdk.hasType('ActionAsset')).toStrictEqual(true);
    expect(sdk.hasType('InputAsset')).toStrictEqual(true);
    expect(sdk.hasType('TransformedAction')).toStrictEqual(false);
    expect(sdk.hasType('TransformedInput')).toStrictEqual(false);
  });

  it('Loading from Module', async () => {
    const sdk = new XLRSDK();
    await sdk.loadDefinitionsFromModule(pluginManifest, EXCLUDE);
    await sdk.loadDefinitionsFromModule(typesManifest);

    expect(sdk.hasType('Asset')).toStrictEqual(true);
    expect(sdk.hasType('AssetWrapper')).toStrictEqual(true);
    expect(sdk.hasType('Binding')).toStrictEqual(true);
    expect(sdk.hasType('BindingRef')).toStrictEqual(true);
    expect(sdk.hasType('ExpressionRef')).toStrictEqual(true);
    expect(sdk.hasType('ActionAsset')).toStrictEqual(true);
    expect(sdk.hasType('InputAsset')).toStrictEqual(true);
    expect(sdk.hasType('TransformedAction')).toStrictEqual(false);
    expect(sdk.hasType('TransformedInput')).toStrictEqual(false);
  });
});

describe('Object Recall', () => {
  it('Processed', () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core');

    expect(sdk.getType('InputAsset')).toMatchSnapshot();
  });

  it('Raw', () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core');

    expect(sdk.getType('InputAsset', { getRawType: true })).toMatchSnapshot();
  });
});

describe('Basic Validation', () => {
  it('Basic Validation By Name', () => {
    const mockAsset = parseTree(`
    {
      "id": 1,
      "type": "input",
      "binding": "some.data",
      "label": {
        "asset": {
          "value": "{{input.label}}"
        }
      }
    `);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core');

    expect(sdk.validateByName('InputAsset', mockAsset)).toMatchSnapshot();
  });

  it('Basic Validation By Type', () => {
    const mockAsset = parseTree(`
    {
      "id": 1,
      "type": "input",
      "binding": "some.data",
      "label": {
        "asset": {
          "value": "{{input.label}}"
        }
      }
    `);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core');
    const inputAsset = sdk.getType('InputAsset');
    expect(inputAsset).toBeDefined();
    expect(
      sdk.validateByType(inputAsset as NamedType, mockAsset)
    ).toMatchSnapshot();
  });
});

describe('Export Test', () => {
  it('Exports Typescript types', () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core', EXCLUDE);
    const results = sdk.exportRegistry();
    expect(results).toMatchSnapshot();
  });

  it('Exports Typescript Types With Filters', () => {
    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin');
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core', EXCLUDE);
    const results = sdk.exportRegistry({
      typeFilter: 'Transformed',
      pluginFilter: 'Types',
    });
    expect(results).toMatchSnapshot();
  });

  it('Exports Typescript Types With Transforms', () => {
    /**
     * Sample transform
     */
    const transformFunction: TransformFunction = (input, capability) => {
      if (capability === 'Assets') {
        const ret = { ...input };
        if (ret.type === 'object') {
          ret.properties.transformed = {
            required: false,
            node: { type: 'boolean', const: true },
          };
        }

        return ret;
      }

      return input;
    };

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/core', EXCLUDE);
    const results = sdk.exportRegistry({}, [transformFunction]);
    expect(results).toMatchSnapshot();
  });
});
