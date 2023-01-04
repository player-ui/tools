import * as ts from 'typescript/lib/tsserverlibrary';
import type {
  TemplateLanguageService,
  TemplateContext,
  Logger,
} from 'typescript-template-language-service-decorator';
import { parseExpression } from '@player-ui/player';
import { getTokenAtPosition } from './utils';

// TODO: replace this with the XLR definitions and types
interface ExprDetails {
  name: string;
  description: string;
  args: Array<{
    name: string;
    type: string;
  }>;
}

export class ExpressionLanguageService implements TemplateLanguageService {
  private logger?: Logger;
  private _expressions = new Map<string, ExprDetails>();

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;

    this.setExpressions(
      new Map([
        [
          'test',
          {
            name: 'test',
            description: 'test expression',
            args: [],
          },
        ],
        [
          'foo',
          {
            name: 'foo',
            description: 'Test foo expression',
            args: [
              {
                name: 'path',
                type: 'string',
              },
            ],
          },
        ],
      ])
    );
  }

  setExpressions(expressionData: Map<string, ExprDetails>) {
    this._expressions = expressionData;
  }

  getCompletionsAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter
  ): ts.CompletionInfo {
    const line = context.text.split(/\n/g)[position.line];
    this.logger?.log(
      `[expression-LSP] getCompletionsAtPosition: ${line} -- ${context.rawText} -- ${context.text}`
    );

    const parsed = parseExpression(line, { strict: false });
    const token = getTokenAtPosition(parsed, position);

    const completionInfo: ts.CompletionInfo = {
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      entries: [],
    };

    if (token?.type === 'Identifier') {
      // get the relevant start of the identifier
      const start = token.location?.start ?? { character: 0 };
      const wordFromStart = line.slice(start.character, position.character);
      const allCompletions = Array.from(this._expressions.keys()).filter(
        (key) => key.startsWith(wordFromStart)
      );

      allCompletions.forEach((c) => {
        completionInfo.entries.push({
          name: c,
          kind: ts.ScriptElementKind.functionElement,
          sortText: c,
          isRecommended: true,
        });
      });
    }

    return completionInfo;
  }

  getQuickInfoAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter
  ): ts.QuickInfo | undefined {
    this.logger?.log(`getCompletionsAtPosition: ${context.text}`);

    const parsed = parseExpression(context.text, { strict: false });
    const token = getTokenAtPosition(parsed, position);

    if (token?.type === 'Identifier') {
      const expression = this._expressions.get(token.name);
      if (expression) {
        return {
          textSpan: {
            start: token.location?.start.character ?? 0,
            length: token.location?.end.character ?? 0,
          },
          kindModifiers: ts.ScriptElementKindModifier.none,
          kind: ts.ScriptElementKind.functionElement,
          documentation: [
            {
              kind: 'text',
              text: expression.description,
            },
          ],
        };
      }
    }

    return undefined;
  }

  getCompletionEntryDetails(
    context: TemplateContext,
    position: ts.LineAndCharacter,
    name: string
  ): ts.CompletionEntryDetails {
    const expression = this._expressions.get(name);

    const prefix = [
      {
        text: ', ',
        kind: ts.ScriptElementKind.unknown,
      },
    ];

    const completionDetails: ts.CompletionEntryDetails = {
      name,
      kind: ts.ScriptElementKind.functionElement,
      kindModifiers: ts.ScriptElementKindModifier.none,
      documentation: [
        {
          kind: 'text',
          text: expression?.description ?? 'Some description',
        },
      ],
      displayParts: [
        {
          text: name,
          kind: ts.ScriptElementKind.functionElement,
        },
        {
          text: '(',
          kind: ts.ScriptElementKind.unknown,
        },

        ...(expression?.args.flatMap((arg, index) => [
          ...(index === 0 ? [] : prefix),
          {
            text: arg.name,
            kind: ts.ScriptElementKind.parameterElement,
          },
          {
            text: ': ',
            kind: ts.ScriptElementKind.unknown,
          },
          {
            text: arg.type,
            kind: ts.ScriptElementKind.typeParameterElement,
          },
        ]) ?? []),
        {
          text: ')',
          kind: ts.ScriptElementKind.unknown,
        },
      ],
    };

    return completionDetails;
  }
}
