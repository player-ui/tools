import type { PlayerLanguageService } from "@player-tools/json-language-service";
import type { PlayerCLIPlugin } from "./index";
import { TSManifest } from "@player-tools/xlr";

export interface FileSystemConfig {
  /** the path to the asset library to load */
  path: string;

  /** can't load from path and package with the same config object*/
  package?: never;

  /** Provides experimental language features */
  exp?: boolean;
}

export interface ModuleConfig {
  /** the path to the asset library to load */
  package: Array<TSManifest>;

  /** can't load from path and package with the same config object */
  path?: never;

  /** Provides experimental language features */
  exp?: boolean;
}

export type LSPAssetsPluginConfig = FileSystemConfig | ModuleConfig;

export function isFileSystemConfig(
  conf: LSPAssetsPluginConfig
): conf is FileSystemConfig {
  return (
    (conf as FileSystemConfig).path !== undefined &&
    !(conf as ModuleConfig).package
  );
}

export function isModuleConfig(
  conf: LSPAssetsPluginConfig
): conf is ModuleConfig {
  return (
    !(conf as FileSystemConfig).path &&
    (conf as ModuleConfig).package !== undefined
  );
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

  async loadAssetDefinition(
    config: LSPAssetsPluginConfig,
    lsp: PlayerLanguageService
  ) {
    if (isFileSystemConfig(config)) {
      await lsp.setAssetTypes([config.path]);
    } else if (isModuleConfig(config)) {
      await lsp.setAssetTypesFromModule(config.package);
    } else {
      throw Error(`Invalid config shape ${JSON.stringify(config)}`);
    }
  }

  async onCreateLanguageService(
    lsp: PlayerLanguageService,
    exp: boolean
  ): Promise<void> {
    if (Array.isArray(this.config)) {
      await Promise.allSettled(
        this.config.map(async (c) => await this.loadAssetDefinition(c, lsp))
      );
    } else {
      await this.loadAssetDefinition(this.config, lsp);
    }
  }
}
