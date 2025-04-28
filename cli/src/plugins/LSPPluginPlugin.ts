import type {
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
} from "@player-tools/json-language-service";
import type { PlayerCLIPlugin } from "./index";

/**
 * Handles adding a LSP Plugin to the LSP
 */
export class LSPPluginPlugin implements PlayerCLIPlugin {
  private plugin:
    | PlayerLanguageServicePlugin
    | Array<PlayerLanguageServicePlugin>;

  constructor(
    plugin: PlayerLanguageServicePlugin | Array<PlayerLanguageServicePlugin>,
  ) {
    this.plugin = plugin;
  }

  async onCreateLanguageService(
    lsp: PlayerLanguageService,
    exp: boolean,
  ): Promise<void> {
    if (Array.isArray(this.plugin)) {
      this.plugin.forEach((p) => lsp.addLSPPlugin(p));
    } else {
      lsp.addLSPPlugin(this.plugin);
    }
  }
}
