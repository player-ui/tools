import type { TransformFunction } from '@player-tools/xlr';
import { parseTree } from 'jsonc-parser';
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
    await sdk.loadDefinitionsFromModule(
      '../../../common/static_xlrs/plugin',
      EXCLUDE
    );
    await sdk.loadDefinitionsFromModule('../../../common/static_xlrs/core');

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

describe('Basic Validation', () => {
  it('Working Test', () => {
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

    expect(sdk.validate('InputAsset', mockAsset)).toMatchSnapshot();
  });
});

describe('Export Test', () => {
  it('Exports Typescript types', () => {
    const importMap = new Map([
      [
        '@player-ui/types',
        ['Expression', 'Asset', 'Binding', 'AssetWrapper', 'Schema.DataType'],
      ],
    ]);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    const results = sdk.exportRegistry('TypeScript', importMap);
    expect(results[0][0]).toBe('out.d.ts');
    expect(results[0][1]).toMatchSnapshot();
  });

  it('Exports Typescript Types With Filters', () => {
    const importMap = new Map([
      [
        '@player-ui/types',
        ['Expression', 'Asset', 'Binding', 'AssetWrapper', 'Schema.DataType'],
      ],
    ]);

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    const results = sdk.exportRegistry('TypeScript', importMap, {
      typeFilter: 'Transformed',
    });
    expect(results[0][0]).toBe('out.d.ts');
    expect(results[0][1]).toMatchSnapshot();
  });

  it('Exports Typescript Types With Transforms', () => {
    const importMap = new Map([
      [
        '@player-ui/types',
        ['Expression', 'Asset', 'Binding', 'AssetWrapper', 'Schema.DataType'],
      ],
    ]);

    /**
     *
     */
    const transformFunction: TransformFunction = (input) => {
      if (input.type === 'object') {
        // eslint-disable-next-line no-param-reassign
        input.properties.transformed = {
          required: false,
          node: { type: 'boolean', const: true },
        };
      }
    };

    const sdk = new XLRSDK();
    sdk.loadDefinitionsFromDisk('./common/static_xlrs/plugin', EXCLUDE);
    const results = sdk.exportRegistry('TypeScript', importMap, {}, [
      transformFunction,
    ]);
    expect(results[0][0]).toBe('out.d.ts');
    expect(results[0][1]).toMatchSnapshot();
  });
});
