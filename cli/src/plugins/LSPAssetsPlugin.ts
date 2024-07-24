import type { PlayerLanguageService } from "@player-tools/json-language-service";
import type { PlayerCLIPlugin } from "./index";

export interface LSPAssetsPluginConfig {
  /** the path to the asset library to load */
  path: string;

  /** Provides experimental language features */
  exp?: boolean;
}

/**
 * Handles setting the assets when loading the LSP
 *
 * {
 *   "plugins": [
 *     [
 *       "@cli/lsp-assets-plugin",
 *       {
 *         "path": "<url> or <path>"
 *       }
 *     ]
 *   ]
 * }
 *
 */
export class LSPAssetsPlugin implements PlayerCLIPlugin {
  private config: LSPAssetsPluginConfig | Array<LSPAssetsPluginConfig>;

  constructor(config: LSPAssetsPluginConfig | Array<LSPAssetsPluginConfig>) {
    this.config = config;
  }

  async onCreateLanguageService(lsp: PlayerLanguageService, exp: boolean): Promise<void> {
    if (Array.isArray(this.config)) {
      await lsp.setAssetTypes(this.config.map((c) => c.path));
    } else {
      await lsp.setAssetTypes([this.config.path]);
    }
  }
}
