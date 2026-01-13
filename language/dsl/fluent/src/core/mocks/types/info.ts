import type { Asset, AssetWrapper } from "@player-ui/types";

export interface InfoAsset extends Asset<"info"> {
  primaryInfo: Array<AssetWrapper<Asset>>;
  title?: AssetWrapper<Asset>;
  subtitle?: AssetWrapper<Asset>;
}
