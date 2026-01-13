import type { Asset, AssetWrapper } from "@player-ui/types";

export interface InputAsset extends Asset<"input"> {
  binding: string;
  label: AssetWrapper<Asset>;
  placeholder?: string;
}
