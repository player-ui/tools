import type { Filters } from '@player-tools/xlr-sdk';
import type { PlayerLanguageServicePlugin } from '.';
import { AssetWrapperArrayPlugin } from './plugins/asset-wrapper-array-plugin';
import { SchemaInfoPlugin } from './plugins/binding-schema-plugin';
import { XLRPlugin } from './plugins/xlr-plugin';
import { DuplicateIDPlugin } from './plugins/duplicate-id-plugin';
import { LegacyActionPlugin } from './plugins/legacy-action-plugin';
import { LegacyTemplatePlugin } from './plugins/legacy-template-plugin';
import { MissingAssetWrapperPlugin } from './plugins/missing-asset-wrapper-plugin';
import { NavStatePlugin } from './plugins/nav-state-plugin';
import { ViewNodePlugin } from './plugins/view-node-plugin';
import {
  applyAssetWrapperOrSwitch,
  applyCommonProps,
  applyTemplateProperty,
  applyValueRefs,
} from './xlr/transforms';

export const PLUGINS: Array<PlayerLanguageServicePlugin> = [
  new DuplicateIDPlugin(),
  new ViewNodePlugin(),
  new SchemaInfoPlugin(),
  new LegacyTemplatePlugin(),
  new LegacyActionPlugin(),
  new AssetWrapperArrayPlugin(),
  new NavStatePlugin(),
  new MissingAssetWrapperPlugin(),
  new XLRPlugin(),
];

export const DEFAULT_FILTERS: Filters = {
  typeFilter: 'Transformed',
};

export const TRANSFORM_FUNCTIONS = [
  applyAssetWrapperOrSwitch,
  applyValueRefs,
  applyCommonProps,
  applyTemplateProperty,
];
