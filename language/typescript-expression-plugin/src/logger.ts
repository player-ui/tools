import type { Logger } from "typescript-template-language-service-decorator";
import ts from "typescript/lib/tsserverlibrary";

export class LSPLogger implements Logger {
  private readonly info: ts.server.PluginCreateInfo;

  constructor(info: ts.server.PluginCreateInfo) {
    this.info = info;
  }

  log(msg: string) {
    this.info.project.projectService.logger.info(`[player-expr-lsp] ${msg}`);
  }
}
