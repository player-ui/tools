import type webpack from 'webpack';
import match from 'micromatch';
import globby from 'globby';
import path from 'path';
import { ModifySourcePlugin } from 'modify-source-webpack-plugin';
import type { NamedType, ObjectType } from '@player-tools/xlr';
import { XLRSDK } from '@player-tools/xlr-sdk';
import { covertXLRtoAssetDoc } from './converter';

export * from './converter';

/** adds the asset info to a module */
function addAssetDocExport(
  source: string,
  xlrNode: NamedType<ObjectType>
): string {
  const assetDoc = covertXLRtoAssetDoc(xlrNode);
  const exp = [
    source,
    `export const __asset__docs = ${JSON.stringify(assetDoc)}`,
  ].join('\n');
  return exp;
}

/** Function to create a match for a glob */
const matchGlob = (globs: string[]) => (filename: string) =>
  Boolean(filename && globs.find((g) => match([filename], g).length));

export interface AssetDocgenOptions {
  /** list of assets to include */
  include?: Array<string>;

  /** list of assets exclude */
  exclude?: Array<string>;
}

/** A webpack plugin to add asset docs to the output */
export default class AssetDocgenPlugin {
  private options: AssetDocgenOptions;

  constructor(options?: AssetDocgenOptions) {
    this.options = options ?? {};
  }

  apply(compiler: webpack.Compiler) {
    const { exclude = [], include = ['**/**.ts'] } = this.options;

    const isExcluded = matchGlob(exclude);
    const isIncluded = matchGlob(include);
    const sdk = new XLRSDK();

    // Glob all XLRs manifests available in repo
    const manifests = globby.sync(['**/dist/xlr/manifest.json']);
    // load manifests into sdk
    manifests.forEach((manifest) => {
      const packageName = manifest.split('/dist/')[0];
      sdk.loadDefinitionsFromDisk(path.join('.', packageName, 'dist'));
    });
    const assetSources = sdk.listTypes().map((asset) => {
      return [
        asset.name,
        asset.source.replace('dist', 'src').replace('types.d.ts', 'types.ts'),
      ];
    });
    const modSourcePlugin = new ModifySourcePlugin({
      rules: [
        {
          test: (mod) => {
            return isIncluded(mod.userRequest) && !isExcluded(mod.userRequest);
          },
          modify: (source, filePath) => {
            // eslint-disable-next-line no-restricted-syntax
            for (const [assetName, assetSource] of assetSources) {
              if (filePath === assetSource) {
                const xlr = sdk.getType(assetName) as NamedType<ObjectType>;
                if (xlr) {
                  return addAssetDocExport(source, xlr);
                }
              }
            }

            return source;
          },
        },
      ],
    });

    modSourcePlugin.apply(compiler);
  }
}
