import type {
  Range as JSONRange,
  FormattingOptions as JSONFormattingOptions,
} from 'jsonc-parser';
import { format as formatJSON } from 'jsonc-parser';
import type { TextDocument } from 'vscode-languageserver-textdocument';
import {
  AsyncParallelHook,
  SyncBailHook,
  SyncHook,
  SyncWaterfallHook,
} from 'tapable-ts';
import type {
  CodeAction,
  CodeActionContext,
  CompletionItem,
  Diagnostic,
  FormattingOptions,
  Hover,
  Position,
  Location,
} from 'vscode-languageserver-types';
import {
  CompletionList,
  Range,
  TextEdit,
  CodeActionKind,
} from 'vscode-languageserver-types';

import type { TransformFunction } from '@player-tools/xlr';
import type {
  DocumentContext,
  ValidationContext,
  CompletionContext,
  EnhancedDocumentContextWithPosition,
  Violation,
  ASTVisitor,
} from './types';
import { DEFAULT_FILTERS, PLUGINS, TRANSFORM_FUNCTIONS } from './constants';

import type { ASTNode, PlayerContent } from './parser';
import { parse, toRange, toTextEdit, walk } from './parser';

import { containsRange, isKnownRootType, typeToVisitorMap } from './utils';
import { XLRService } from './xlr';

export * from './utils';
export * from './constants';
export * from './types';
export * from './parser';
export * from './xlr/index';

export interface PlayerLanguageServicePlugin {
  /** The name of the plugin */
  name: string;

  /** the handle to get the LSP */
  apply(languageService: PlayerLanguageService): void;
}

/** The thing that handles most of the LSP work */
export class PlayerLanguageService {
  public readonly XLRService: XLRService;

  private parseCache = new Map<
    string,
    {
      /** the version of the document */
      version: number;

      /** The parsed document */
      parsed: PlayerContent;
    }
  >();

  private fixableViolationsForDocument = new Map<
    string,
    Map<Diagnostic, Violation>
  >();

  public readonly hooks = {
    onDocumentUpdate: new SyncHook<[DocumentContext]>(),

    validate: new AsyncParallelHook<
      [DocumentContext, ValidationContext],
      void
    >(),

    onValidateEnd: new SyncWaterfallHook<
      [
        Diagnostic[],
        {
          /** The context of the document */
          documentContext: DocumentContext;
          /** A callback for adding a new fixable rule */
          addFixableViolation: (diag: Diagnostic, violation: Violation) => void;
        }
      ]
    >(),

    complete: new AsyncParallelHook<
      [EnhancedDocumentContextWithPosition, CompletionContext],
      void
    >(),

    hover: new SyncBailHook<
      [EnhancedDocumentContextWithPosition],
      Hover | undefined
    >(),

    definition: new SyncBailHook<
      [EnhancedDocumentContextWithPosition],
      Location | undefined
    >(),
  };

  constructor(config?: {
    /** A list of plugins to include */
    plugins?: Array<PlayerLanguageServicePlugin>;
  }) {
    // load base definitions?
    this.XLRService = new XLRService();

    PLUGINS.forEach((p) => p.apply(this));
    config?.plugins?.forEach((p) => p.apply(this));
  }

  private parseTextDocument(document: TextDocument): PlayerContent {
    if (!this.parseCache.has(document.uri)) {
      const parsed = parse(document);
      this.parseCache.set(document.uri, { version: document.version, parsed });
      return parsed;
    }

    const cached = this.parseCache.get(document.uri);

    if (!cached || cached.version < document.version) {
      this.parseCache.delete(document.uri);
      return this.parseTextDocument(document);
    }

    return cached.parsed;
  }

  private async updateSource(document: TextDocument): Promise<DocumentContext> {
    const parsed = this.parseTextDocument(document);
    const documentContext: DocumentContext = {
      log: {
        debug: console.log,
        info: console.log,
        warn: console.warn,
        error: console.error,
      },
      document,
      PlayerContent: parsed,
    };

    const ctx = {
      ...documentContext,
    };

    this.hooks.onDocumentUpdate.call(ctx);
    return ctx;
  }

  private async getJSONPositionInfo(
    ctx: DocumentContext,
    position: Position
  ): Promise<{
    /** the node at the given node */
    node?: ASTNode;
  }> {
    const { document, PlayerContent } = ctx;
    const node = PlayerContent.getNodeFromOffset(document.offsetAt(position));

    return {
      node,
    };
  }

  private async updateSourceWithPosition(
    document: TextDocument,
    position: Position
  ): Promise<EnhancedDocumentContextWithPosition | undefined> {
    const ctx = await this.updateSource(document);

    const { node } = await this.getJSONPositionInfo(ctx, position);

    const XLRInfo = this.XLRService.getTypeInfoAtPosition(node);
    if (!node || !XLRInfo) {
      return undefined;
    }

    return {
      ...ctx,
      node,
      position,
      XLR: XLRInfo,
    };
  }

  public onClose(document: TextDocument) {
    this.fixableViolationsForDocument.delete(document.uri);
    this.parseCache.delete(document.uri);
  }

  async formatTextDocument(
    document: TextDocument,
    options: FormattingOptions,
    range?: Range
  ): Promise<Array<TextEdit> | undefined> {
    const formattingOptions: JSONFormattingOptions = {
      tabSize: options.tabSize,
      insertSpaces: options.insertSpaces,
    };

    let formatRange: JSONRange | undefined;

    if (range) {
      const startOffset = document.offsetAt(range.start);
      formatRange = {
        offset: startOffset,
        length: document.offsetAt(range.end) - startOffset,
      };
    }

    return formatJSON(document.getText(), formatRange, formattingOptions).map(
      (edit) => {
        return TextEdit.replace(
          Range.create(
            document.positionAt(edit.offset),
            document.positionAt(edit.offset + edit.length)
          ),
          edit.content
        );
      }
    );
  }

  async validateTextDocument(
    document: TextDocument
  ): Promise<Array<Diagnostic> | undefined> {
    const ctx = await this.updateSource(document);
    this.fixableViolationsForDocument.delete(document.uri);

    if (!isKnownRootType(ctx.PlayerContent)) {
      return;
    }

    const diagnostics = [...ctx.PlayerContent.syntaxErrors];
    const astVisitors: Array<ASTVisitor> = [];

    /** Add a matching violation fix to the original diagnostic */
    const addFixableViolation = (
      diagnostic: Diagnostic,
      violation: Violation
    ) => {
      if (!this.fixableViolationsForDocument.has(document.uri)) {
        this.fixableViolationsForDocument.set(document.uri, new Map());
      }

      const fixableDiags = this.fixableViolationsForDocument.get(document.uri);

      fixableDiags?.set(diagnostic, violation);
    };

    if (ctx.PlayerContent.root) {
      const validationContext: ValidationContext = {
        addViolation: (violation) => {
          const { message, node, severity, fix } = violation;

          const range: Range = toRange(document, node);

          const diagnostic: Diagnostic = {
            message,
            severity,
            range,
          };

          if (fix) {
            addFixableViolation(diagnostic, violation);
          }

          diagnostics.push(diagnostic);
        },
        useASTVisitor: (visitor) => {
          astVisitors.push(visitor);
        },
        addDiagnostic(d) {
          diagnostics.push(d);
        },
      };

      await this.hooks.validate.call(ctx, validationContext);

      // Walk the tree using any of the registered visitors
      // This is for perf so we only walk the tree once

      await walk(ctx.PlayerContent.root, async (node) => {
        const visitorProp = typeToVisitorMap[node.type];

        astVisitors.forEach(async (visitor) => {
          try {
            await visitor[visitorProp]?.(node as any);
          } catch (e: any) {
            ctx.log?.error(
              `Error running rules for ${visitorProp}: ${e.message}, Stack ${e.stack}`
            );
          }
        });

        return false;
      });
    }

    return this.hooks.onValidateEnd.call(diagnostics, {
      documentContext: ctx,
      addFixableViolation,
    });
  }

  async getCompletionsAtPosition(
    document: TextDocument,
    position: Position
  ): Promise<CompletionList> {
    const ctxWithPos = await this.updateSourceWithPosition(document, position);

    if (!ctxWithPos) {
      return CompletionList.create();
    }

    const completionItems: Array<CompletionItem> = [];

    const completionContext: CompletionContext = {
      addCompletionItem: (i) => {
        completionItems.push(i);
      },
    };
    await this.hooks.complete.call(ctxWithPos, completionContext);

    return CompletionList.create(completionItems);
  }

  async resolveCompletionItem(
    completionItem: CompletionItem
  ): Promise<CompletionItem> {
    return completionItem;
  }

  async getHoverInfoAtPosition(
    document: TextDocument,
    position: Position
  ): Promise<Hover | undefined | null> {
    const context = await this.updateSourceWithPosition(document, position);

    if (!context) {
      return undefined;
    }

    return this.hooks.hover.call(context);
  }

  async getCodeActionsInRange(
    document: TextDocument,
    context: CodeActionContext
  ): Promise<CodeAction[]> {
    const diagsForDocument = this.fixableViolationsForDocument.get(
      document.uri
    );

    if (
      !diagsForDocument ||
      diagsForDocument.size === 0 ||
      context.diagnostics.length === 0
    ) {
      return [];
    }

    const actions: CodeAction[] = [];
    // Get all overlapping rules

    diagsForDocument.forEach((violation, diagnostic) => {
      const matching = context.diagnostics.find((diag) =>
        containsRange(diagnostic.range, diag.range)
      );
      const fixedAction = violation.fix?.();

      if (!matching || !fixedAction) {
        return;
      }

      actions.push({
        title: fixedAction.name,
        kind: CodeActionKind.QuickFix,
        edit: {
          changes: {
            [document.uri]: [toTextEdit(document, fixedAction.edit)],
          },
        },
      });
    });

    return actions;
  }

  public async getDefinitionAtPosition(
    document: TextDocument,
    position: Position
  ): Promise<Location | undefined | null> {
    const context = await this.updateSourceWithPosition(document, position);

    if (!context) {
      return undefined;
    }

    return this.hooks.definition.call(context);
  }

  public addXLRTransforms(transforms: Record<string, TransformFunction>): void {
    Object.entries(transforms).forEach(([name, fn]) =>
      this.XLRService.XLRSDK.addTransformFunction(name, fn)
    );
  }

  public addLSPPlugin(plugin: PlayerLanguageServicePlugin) {
    plugin.apply(this);
  }

  async setAssetTypes(typeFiles: Array<string>) {
    // await this.typescriptService.setAssetTypes(typeFiles);
    typeFiles.forEach((file) => {
      // Find a better way of loading default types
      if (file.includes('types')) {
        this.XLRService.XLRSDK.loadDefinitionsFromDisk(file, {});
      } else {
        this.XLRService.XLRSDK.loadDefinitionsFromDisk(
          file,
          DEFAULT_FILTERS,
          TRANSFORM_FUNCTIONS
        );
      }
    });
  }
}
