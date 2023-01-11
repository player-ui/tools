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
import { XLRSDK } from '@player-tools/xlr-sdk';
import type { ExpressionNode } from '@player-ui/player';
import { parseExpression } from '@player-ui/player';
import {
  getTokenAtPosition,
  toTSLocation,
  convertExprToJSONNode,
} from './utils';

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

// TODO: This should move into the xlr/cli package so expressions are converted to functions at build time
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
      ).map((elementType, index) => {
        return {
          name:
            elementType.name ??
            elementType.type.name ??
            elementType.type.title ??
            `arg_${index}`,

          type: {
            name:
              elementType.name ??
              elementType.type.name ??
              elementType.type.title ??
              `arg_${index}`,
            ...elementType.type,
          },
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
  private xlr: XLRSDK;

  constructor(
    options?: { logger?: Logger } & Partial<ExpressionLanguageServiceConfig>
  ) {
    this.logger = options?.logger;
    this._plugins = options?.plugins ?? [];
    this._expressions = reduceExpression(this._plugins);
    this.xlr = new XLRSDK();

    this._plugins.forEach((p) => {
      this.xlr.loadDefinitionsFromModule(p);
    });
  }

  setConfig(config: ExpressionLanguageServiceConfig) {
    this._plugins = config.plugins;
    this._expressions = reduceExpression(this._plugins);
    this.xlr = new XLRSDK();

    this._plugins.forEach((p) => {
      this.xlr.loadDefinitionsFromModule(p);
    });
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

    return completionDetails;
  }

  getQuickInfoAtPosition(
    context: TemplateContext,
    position: ts.LineAndCharacter
  ): ts.QuickInfo | undefined {
    const parsed = parseExpression(context.text, { strict: false });
    const token = getTokenAtPosition(parsed, position);

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
          textSpan: toTSLocation(token),
        };
      }
    }

    return undefined;
  }

  private checkNode(
    context: TemplateContext,
    node: ExpressionNode,
    xlrType: NodeType
  ): ts.Diagnostic[] {
    const diagnostics: ts.Diagnostic[] = [];
    const asJsonNodeValue = convertExprToJSONNode(node);

    if (asJsonNodeValue) {
      const xlrDiags = this.xlr.validateByType(xlrType, asJsonNodeValue);

      xlrDiags.forEach((d) => {
        diagnostics.push({
          file: context.node.getSourceFile(),
          ...toTSLocation(node),
          messageText: d.message,
          category: ts.DiagnosticCategory.Error,
          code: 1,
        });
      });
    }

    return diagnostics;
  }

  private getDiagnosticsForNode(
    context: TemplateContext,
    node: ExpressionNode
  ): ts.Diagnostic[] {
    const diags: ts.Diagnostic[] = [];

    if (node.type === 'Compound') {
      node.body.forEach((n) => {
        diags.push(...this.getDiagnosticsForNode(context, n));
      });
    }

    if (node.type === 'CallExpression') {
      // Check that the expression is valid
      const exprName = node.callTarget.name;
      const expression = this._expressions.entries.get(exprName);

      node.args.forEach((n) => {
        diags.push(...this.getDiagnosticsForNode(context, n));
      });

      if (expression) {
        // Double check the arguments match what we expect
        const expectedArgs = expression.type.parameters;
        const actualArgs = node.args;

        actualArgs.forEach((actualArg, index) => {
          const expectedArg = expectedArgs[index];

          if (expectedArg) {
            // Check that the type satisfies the expected type
            diags.push(...this.checkNode(context, actualArg, expectedArg.type));
          }
        });

        if (expectedArgs.length > actualArgs.length) {
          const requiredArgs = expectedArgs.filter((a) => !a.optional);
          if (actualArgs.length < requiredArgs.length) {
            diags.push({
              category: ts.DiagnosticCategory.Error,
              code: 1,
              file: context.node.getSourceFile(),
              ...toTSLocation(node.callTarget),
              messageText: `Expected ${requiredArgs.length} argument(s), got ${actualArgs.length}`,
            });
          }
        }
      } else {
        diags.push({
          category: ts.DiagnosticCategory.Error,
          code: 1,
          file: context.node.getSourceFile(),
          ...toTSLocation(node.callTarget),
          messageText: `Unknown expression ${exprName}`,
        });
      }
    }

    return diags;
  }

  getSemanticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    // Shortcut any type-checking if we don't have any info about what expressions are registered
    if (this._plugins.length === 0) {
      return [];
    }

    const parsed = parseExpression(context.text.trim(), { strict: false });
    return this.getDiagnosticsForNode(context, parsed);
  }

  getSyntacticDiagnostics(context: TemplateContext): ts.Diagnostic[] {
    const parsed = parseExpression(context.text.trim(), { strict: false });

    if (parsed.error) {
      return [
        {
          category: ts.DiagnosticCategory.Error,
          code: 1,
          file: context.node.getSourceFile(),
          ...toTSLocation(parsed),
          messageText: parsed.error.message,
        },
      ];
    }

    return [];
  }
}
