import ts from "typescript/lib/tsserverlibrary";
import type {
  TemplateLanguageService,
  TemplateContext,
  Logger,
} from "typescript-template-language-service-decorator";
import type { FunctionType, TSManifest, NodeType } from "@player-tools/xlr";
import { createTSDocString } from "@player-tools/xlr-utils";
import { XLRSDK } from "@player-tools/xlr-sdk";
import type { ExpressionNode } from "@player-ui/player";
import { parseExpression } from "@player-ui/player";
import {
  getTokenAtPosition,
  toTSLocation,
  convertExprToJSONNode,
} from "./utils";
import { toFunction } from "./transforms";

interface ExpressionEntry {
  /**
   * The name of the expression
   */
  name: string;
  /**
   * The description of the expression
   */
  description?: string;
  /**
   * The XLR type of the expression
   */
  type: FunctionType;
  /**
   * The XLR enabled plugin the expression was sourced from
   */
  source: TSManifest;
}

export interface ExpressionLanguageServiceConfig {
  /**
   * The list of XLR enabled plugins to load
   */
  plugins: Array<TSManifest>;
}

/**
 * Language server to check Player expression syntax and usage
 */
export class ExpressionLanguageService implements TemplateLanguageService {
  private logger?: Logger;
  private _plugins: Array<TSManifest> = [];
  private _expressions: Map<string, ExpressionEntry>;
  private xlr: XLRSDK;

  constructor(
    options?: { logger?: Logger } & Partial<ExpressionLanguageServiceConfig>
  ) {
    this.logger = options?.logger;
    this._plugins = options?.plugins ?? [];
    this.xlr = new XLRSDK();

    this._plugins.forEach((p) => {
      this.xlr.loadDefinitionsFromModule(p, undefined, [toFunction]);
    });
    this._expressions = this.reduceExpression();
  }

  setConfig(config: ExpressionLanguageServiceConfig) {
    this._plugins = config.plugins;
    this.xlr = new XLRSDK();

    this._plugins.forEach((p) => {
      this.xlr.loadDefinitionsFromModule(p, undefined, [toFunction]);
    });
    this._expressions = this.reduceExpression();
  }

  private reduceExpression(): Map<string, ExpressionEntry> {
    // Overlaps in names will be resolved by the last plugin to be loaded
    // So use a map to ensure no duplicates
    const expressions = new Map<string, ExpressionEntry>();

    this.xlr.listTypes().forEach((type) => {
      const typeInfo = this.xlr.getTypeInfo(type.name);
      const source = this._plugins.find(
        (value) => value.pluginName === typeInfo?.plugin
      );

      if (
        type.type === "function" &&
        typeInfo?.capability === "Expressions" &&
        source
      ) {
        expressions.set(type.name, {
          name: type.name,
          description: type.description,
          type: type as FunctionType,
          source,
        });
      }
    });

    return expressions;
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

      this._expressions.forEach((exp) => {
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

    if (token?.type === "Compound" && token.error) {
      // We hit the end of the expression, and it's expecting more
      // so provide all the completions
      this._expressions.forEach((exp) => {
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

    if (token?.type === "Identifier") {
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
    const expression = this._expressions.get(name);

    const completionDetails: ts.CompletionEntryDetails = {
      name,
      kind: ts.ScriptElementKind.functionElement,
      kindModifiers: ts.ScriptElementKindModifier.none,

      documentation: [
        {
          kind: "text",
          text: expression?.type.description ?? "",
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

    if (token?.type === "Identifier") {
      const expression = this._expressions.get(token.name);

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

    if (node.type === "Compound") {
      node.body.forEach((n) => {
        diags.push(...this.getDiagnosticsForNode(context, n));
      });
    }

    if (node.type === "CallExpression") {
      // Check that the expression is valid
      const exprName = node.callTarget.name;
      const expression = this._expressions.get(exprName);

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
