import type { PlayerLanguageService } from '@player-tools/json-language-service';
import type { TransformFunction } from '@player-tools/xlr';
import type { PlayerCLIPlugin } from './index';

export interface Config {
  /** the path to the asset library to load */
  path: string;

  /** Provides experimental language features */
  exp?: boolean;
}

/**
 * Handles adding XLR transforms to the LSP's XLR SDK
 */
export class LSPAssetsPlugin implements PlayerCLIPlugin {
  private functionsToLoad: Record<string, TransformFunction>;

  constructor(functionsToLoad: Record<string, TransformFunction>) {
    this.functionsToLoad = functionsToLoad;
  }

  async onCreateLanguageService(lsp: PlayerLanguageService, exp: boolean) {
    lsp.addXLRTransforms(this.functionsToLoad);
  }
}
