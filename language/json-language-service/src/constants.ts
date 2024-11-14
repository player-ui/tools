import type { Filters } from "@player-tools/xlr-sdk";
import { TransformFunction } from "@player-tools/xlr";

import type { PlayerLanguageServicePlugin } from ".";
import { AssetWrapperArrayPlugin } from "./plugins/asset-wrapper-array-plugin";
import { SchemaInfoPlugin } from "./plugins/binding-schema-plugin";
import { XLRPlugin } from "./plugins/xlr-plugin";
import { DuplicateIDPlugin } from "./plugins/duplicate-id-plugin";
import { MissingAssetWrapperPlugin } from "./plugins/missing-asset-wrapper-plugin";
import { NavStatePlugin } from "./plugins/nav-state-plugin";
import { ViewNodePlugin } from "./plugins/view-node-plugin";
import {
  applyAssetWrapperOrSwitch,
  applyCommonProps,
  applyTemplateProperty,
  applyValueRefs,
} from "./xlr/transforms";

export const PLUGINS: Array<PlayerLanguageServicePlugin> = [
  new DuplicateIDPlugin(),
  new ViewNodePlugin(),
  new SchemaInfoPlugin(),
  new AssetWrapperArrayPlugin(),
  new NavStatePlugin(),
  new MissingAssetWrapperPlugin(),
  new XLRPlugin(),
];

export const DEFAULT_FILTERS: Filters = {
  typeFilter: "Transformed",
};

export const TRANSFORM_FUNCTIONS: Array<TransformFunction> = [
  applyAssetWrapperOrSwitch,
  applyValueRefs,
  applyCommonProps,
  applyTemplateProperty,
];
