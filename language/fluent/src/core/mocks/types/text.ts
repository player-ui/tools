import type { Asset } from "@player-ui/types";

export interface TextAsset extends Asset<"text"> {
  value: string;
}
