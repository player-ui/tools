import type { PlayerLanguageService } from "@player-tools/json-language-service";
import type { DSLCompiler } from "@player-tools/dsl";
import type { ExportTypes } from "@player-tools/xlr-sdk";
import type { TransformFunction } from "@player-tools/xlr";
import type { CompilationContext } from "../utils/compilation-context";

export * from "./LSPAssetsPlugin";
export * from "./LSPPluginPlugin";
export * from "./LSPTransformsPlugin";

export interface PlayerCLIPlugin {
  /**
   * Handler when an LSP instance is created
   * Use this to add custom rule-sets, load asset types, etc
   */
  onCreateLanguageService?: (
    lsp: PlayerLanguageService,
    exp: boolean,
  ) => void | Promise<void>;

  /**
   * Handler when a DSL compiler is created
   * Use this to change how content is generated
   */
  onCreateDSLCompiler?: (compiler: DSLCompiler) => void | Promise<void>;

  /**
   * Handler for when context is being converted from XLRs to a language specific representation
   * Append the transforms to apply to the passed in array based on the provided format
   */
  onConvertXLR?: (
    format: ExportTypes,
    transforms: Array<TransformFunction>,
  ) => void | Promise<void>;

  /**
   * Handler to expose hooks that influence how content is compiled
   */
  createCompilerContext?: (context: CompilationContext) => void | Promise<void>;
}

export type PlayerCLIClass = {
  new (): PlayerCLIPlugin;
};
