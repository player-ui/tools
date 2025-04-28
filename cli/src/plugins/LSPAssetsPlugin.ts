import type { PlayerLanguageService } from "@player-tools/json-language-service";
import type { PlayerCLIPlugin } from "./index";
import { TSManifest } from "@player-tools/xlr";

/** Loads XLRs into the LSP via the manifest.js file */
export interface LSPAssetsPluginModuleConfig {
  type: "module";

  /** Result of module import/require of xlr manifest.js file */
  manifest: TSManifest;
}

/** Loads XLRs to the LSP by specifying a filesystem location */
export interface LSPAssetsPluginManifestConfig {
  type: "manifest";

  /** Path to dist folder for XLR enabled plugins */
  path: string;
}

/**
 * Legacy type for providing XLR manifest paths that assumes its a manifest
 * @deprecated
 * */
export interface LSPAssetsPluginLegacyConfig {
  type?: undefined;
  path: string;
}

export type LSPAssetPluginConfigTypes =
  | LSPAssetsPluginModuleConfig
  | LSPAssetsPluginManifestConfig
  | LSPAssetsPluginLegacyConfig;

export type LSPAssetsPluginConfig = LSPAssetPluginConfigTypes & {
  /** Provides experimental language features */
  exp?: boolean;
};

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

  async onCreateLanguageService(
    lsp: PlayerLanguageService,
    exp: boolean,
  ): Promise<void> {
    if (Array.isArray(this.config)) {
      await Promise.all(
        this.config.map((c) => {
          this.loadConfig(c, lsp);
        }),
      );
    } else {
      await this.loadConfig(this.config, lsp);
    }
  }

  async loadConfig(
    config: LSPAssetPluginConfigTypes,
    lsp: PlayerLanguageService,
  ): Promise<void> {
    if (config.type === "manifest" || config.type === undefined) {
      await lsp.setAssetTypes([config.path]);
    } else if (config.type === "module") {
      await lsp.setAssetTypesFromModule([config.manifest]);
    } else {
      throw Error(`Unknown config type: ${(config as any).type}`);
    }
  }
}
