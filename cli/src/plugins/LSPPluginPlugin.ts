import type {
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
} from '@player-tools/json-language-service';
import type { PlayerCLIPlugin } from './index';

/**
 * Handles adding a LSP Plugin to the LSP
 */
export class LSPPluginPlugin implements PlayerCLIPlugin {
  private plugin: PlayerLanguageServicePlugin;

  constructor(plugin: PlayerLanguageServicePlugin) {
    this.plugin = plugin;
  }

  async onCreateLanguageService(lsp: PlayerLanguageService, exp: boolean) {
    lsp.addLSPPlugin(this.plugin);
  }
}
