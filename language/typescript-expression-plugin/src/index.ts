import ts from "typescript/lib/tsserverlibrary";
import { decorateWithTemplateLanguageService } from "typescript-template-language-service-decorator";
import { ExpressionLanguageService } from "./service";
import { LSPLogger } from "./logger";

interface InitParams {
  typescript: typeof ts;
}
class Plugin implements ts.server.PluginModule {
  private readonly initOptions: InitParams;
  private logger?: LSPLogger;
  private templateService?: ExpressionLanguageService;

  constructor(initOptions: InitParams) {
    this.initOptions = initOptions;
  }

  create(info: ts.server.PluginCreateInfo): ts.LanguageService {
    const logger = new LSPLogger(info);
    this.logger = logger;

    const templateService = new ExpressionLanguageService({ logger });
    this.templateService = templateService;

    return decorateWithTemplateLanguageService(
      this.initOptions.typescript,
      info.languageService,
      info.project,
      templateService,
      {
        tags: ["e", "expr", "expression"],
        enableForStringWithSubstitutions: true,
      },
      { logger },
    );
  }

  onConfigurationChanged(config: any) {
    this.templateService?.setConfig(config);
  }
}

function init(mod: InitParams): ts.server.PluginModule {
  return new Plugin(mod);
}

export default init;
// export = init;
