import type { Asset, AssetWrapper } from "@player-ui/types";

export interface InfoAsset extends Asset<"info"> {
  /** The string value to show */
  title?: AssetWrapper;

  /** subtitle */
  subTitle?: AssetWrapper;

  /** Primary place for info  */
  primaryInfo?: AssetWrapper;

  /** List of actions to show at the bottom of the page */
  actions?: Array<AssetWrapper>;
}
