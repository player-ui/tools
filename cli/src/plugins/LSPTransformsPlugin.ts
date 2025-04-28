import type { PlayerLanguageService } from "@player-tools/json-language-service";
import type { TransformFunction } from "@player-tools/xlr";
import type { PlayerCLIPlugin } from "./index";

/**
 * Handles adding XLR transforms to the LSP's XLR SDK
 */
export class LSPTransformsPlugin implements PlayerCLIPlugin {
  private functionsToLoad: Record<string, TransformFunction>;

  constructor(functionsToLoad: Record<string, TransformFunction>) {
    this.functionsToLoad = functionsToLoad;
  }

  async onCreateLanguageService(
    lsp: PlayerLanguageService,
    exp: boolean,
  ): Promise<void> {
    lsp.addXLRTransforms(this.functionsToLoad);
  }
}
