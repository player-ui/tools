import * as ts from 'typescript/lib/tsserverlibrary';
import type {
  TemplateLanguageService,
  TemplateContext,
  Logger,
} from 'typescript-template-language-service-decorator';
import type {
  FunctionType,
  TSManifest,
  FunctionTypeParameters,
  NodeType,
} from '@player-tools/xlr';
import { createTSDocString } from '@player-tools/xlr-utils';
import { parseExpression } from '@player-ui/player';
import { getTokenAtPosition } from './utils';

interface ExpEntry {
  name: string;
  description: string;
  type: FunctionType;
  source: TSManifest;
}

interface ExpressionList {
  entries: Map<string, ExpEntry>;
}

export interface ExpressionLanguageServiceConfig {
  plugins: Array<TSManifest>;
}

function reduceExpression(plugins: Array<TSManifest>): ExpressionList {
  // Overlaps in names will be resolved by the last plugin to be loaded
  // So use a map to ensure no duplicates
  const expressions = new Map<string, ExpEntry>();

  plugins.forEach((plugin) => {
    const { capabilities } = plugin;
    const registeredExpressions = capabilities?.Expressions ?? [];

    registeredExpressions.forEach((exp) => {
      if (exp.type !== 'ref' || !exp.genericArguments) {
        return;
      }

      const expName = exp.name;
      const [args, returnType] = exp.genericArguments;

      const parameters: Array<FunctionTypeParameters> = (
        args.type === 'tuple' ? args.elementTypes : []
      ).map((elementType) => {
        return {
          name:
            elementType.name ??
            elementType.type.name ??
            elementType.type.title ??
            '',
          type: elementType.type,
          optional:
            elementType.optional === true ? elementType.optional : undefined,
        };
      });

      const entry: ExpEntry = {
        name: expName,
        description: exp.description ?? '',
        source: plugin,
        type: {
          ...exp,
          type: 'function',
          parameters,
          returnType,
        },
      };

      expressions.set(expName, entry);
    });
  });

  const expList: ExpressionList = {
    entries: expressions,
  };

  return expList;
}

export class ExpressionLanguageService implements TemplateLanguageService {
  private logger?: Logger;
  private _plugins: Array<TSManifest> = [];
  private _expressions: ExpressionList;

  constructor(
    options?: { logger?: Logger } & Partial<ExpressionLanguageServiceConfig>
  ) {
    this.logger = options?.logger;
    this._plugins = options?.plugins ?? [];
    this._expressions = reduceExpression(this._plugins);
  }

  setConfig(config: ExpressionLanguageServiceConfig) {
    this._plugins = config.plugins;
    this._expressions = reduceExpression(this._plugins);
  }

  getCompletionsAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter
  ): ts.CompletionInfo {
    const completionInfo: ts.CompletionInfo = {
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: true,
      entries: [],
    };

    if (context.text.length === 0) {
      // This happens for the start of an expression (e``)
      // Provide all the completions in this case

      this._expressions.entries.forEach((exp) => {
        completionInfo.entries.push({
          name: exp.name,
          kind: ts.ScriptElementKind.functionElement,
          sortText: exp.name,
          isRecommended: true,
          insertText: `${exp.name}()`,
        });
      });

      return completionInfo;
    }

    const line = context.text.split(/\n/g)[position.line];
    const parsed = parseExpression(line, { strict: false });
    const token = getTokenAtPosition(parsed, position);

    this.logger?.log(`Token ${token?.type} ${token?.error?.message}`);

    if (token?.type === 'Compound' && token.error) {
      // We hit the end of the expression, and it's expecting more
      // so provide all the completions
      this._expressions.entries.forEach((exp) => {
        completionInfo.entries.push({
          name: exp.name,
          kind: ts.ScriptElementKind.functionElement,
          sortText: exp.name,
          isRecommended: true,
          insertText: `${exp.name}()`,
        });
      });

      return completionInfo;
    }

    if (token?.type === 'Identifier') {
      // get the relevant start of the identifier
      const start = token.location?.start ?? { character: 0 };
      const wordFromStart = line.slice(start.character, position.character);
      const allCompletions = Array.from(
        this._expressions.entries.keys()
      ).filter((key) => key.startsWith(wordFromStart));

      allCompletions.forEach((c) => {
        completionInfo.entries.push({
          name: c,
          kind: ts.ScriptElementKind.functionElement,
          sortText: c,
          isRecommended: true,
          insertText: `${c}()`,
        });
      });
    }

    return completionInfo;
  }

  getCompletionEntryDetails(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    name: string
  ): ts.CompletionEntryDetails {
    const expression = this._expressions.entries.get(name);

    const completionDetails: ts.CompletionEntryDetails = {
      name,
      kind: ts.ScriptElementKind.functionElement,
      kindModifiers: ts.ScriptElementKindModifier.none,

      documentation: [
        {
          kind: 'text',
          text: expression?.type.description ?? '',
        },
      ],
      displayParts: expression ? createTSDocString(expression.type) : [],
    };

    this.logger?.log(`getCompletionEntryDetails: ${name}`);
    this.logger?.log(JSON.stringify(completionDetails));

    return completionDetails;
  }

  getQuickInfoAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter
  ): ts.QuickInfo | undefined {
    this.logger?.log(`getQuickInfoAtPosition: ${context.text}`);

    const parsed = parseExpression(context.text, { strict: false });
    const token = getTokenAtPosition(parsed, position);

    this.logger?.log(`token: ${token?.type}`);

    if (token?.type === 'Identifier') {
      const expression = this._expressions.entries.get(token.name);

      if (expression) {
        const completionDetails = this.getCompletionEntryDetails(
          context,
          position,
          expression.name
        );

        return {
          ...completionDetails,
          textSpan: {
            start: token.location?.start.character ?? 0,
            length:
              (token.location?.end.character ?? 0) -
              (token.location?.start.character ?? 0),
          },
        };
      }
    }

    return undefined;
  }
}
