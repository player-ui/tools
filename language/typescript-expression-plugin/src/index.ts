import type * as ts from 'typescript/lib/tsserverlibrary';
import { decorateWithTemplateLanguageService } from 'typescript-template-language-service-decorator';
import { ExpressionLanguageService } from './service';
import { LSPLogger } from './logger';

export = (mod: { typescript: typeof ts }) => {
  return {
    create(info: ts.server.PluginCreateInfo): ts.LanguageService {
      const logger = new LSPLogger(info);

      const templateService = new ExpressionLanguageService({ logger });

      return decorateWithTemplateLanguageService(
        mod.typescript,
        info.languageService,
        info.project,
        templateService,
        { tags: ['e', 'expr'], enableForStringWithSubstitutions: true },
        { logger }
      );
    },
  };
};
