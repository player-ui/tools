import type { TextDocument } from 'vscode-languageserver-textdocument';
import type {
  Position,
  DiagnosticSeverity,
  Diagnostic,
  CompletionItem,
} from 'vscode-languageserver-types';
import type {
  ASTNode,
  PlayerContent,
  StringASTNode,
  NumberASTNode,
  ArrayASTNode,
  BooleanASTNode,
  PropertyASTNode,
  ObjectASTNode,
  ViewASTNode,
  ContentASTNode,
  NullASTNode,
  AssetASTNode,
  FlowStateASTNode,
  NavigationASTNode,
  FlowASTNode,
  NodeEdit,
  EmptyASTNode,
} from './parser';
import type { XLRContext } from './xlr';

export type LogFn = (msg: string) => void;
export const LOG_TYPES = ['debug', 'info', 'warn', 'error'] as const;
export type LogType = (typeof LOG_TYPES)[number];
export type Logger = Record<LogType, LogFn>;

export interface DocumentContext {
  /** A logger to log messages */
  log: Logger;

  /** the underlying text document */
  document: TextDocument;

  /** the json parsed text document */
  PlayerContent: PlayerContent;
}

export interface DocumentContextWithPosition extends DocumentContext {
  /** the position we care about */
  position: Position;

  /** the node at that position */
  node: ASTNode;
}

export interface EnhancedDocumentContextWithPosition
  extends DocumentContextWithPosition {
  /** the XLRs context */
  XLR?: XLRContext;
}

export type ASTVisitorFn<T extends ASTNode> = (node: T) => void;

export interface ASTVisitor {
  /** a string node visitor */
  StringNode?: ASTVisitorFn<StringASTNode>;
  /** a number node visitor */
  NumberNode?: ASTVisitorFn<NumberASTNode>;
  /** an boolean node visitor */
  BooleanNode?: ASTVisitorFn<BooleanASTNode>;
  /** an array node visitor */
  ArrayNode?: ASTVisitorFn<ArrayASTNode>;
  /** a null node visitor */
  NullNode?: ASTVisitorFn<NullASTNode>;
  /** an empty node visitor */
  EmptyNode?: ASTVisitorFn<EmptyASTNode>;
  /** a property node visitor */
  PropertyNode?: ASTVisitorFn<PropertyASTNode>;
  /** an object node visitor */
  ObjectNode?: ASTVisitorFn<ObjectASTNode>;
  /** an asset node visitor */
  AssetNode?: ASTVisitorFn<AssetASTNode>;
  /** a view node visitor */
  ViewNode?: ASTVisitorFn<ViewASTNode>;
  /** a flow node visitor */
  ContentNode?: ASTVisitorFn<ContentASTNode>;
  /** a navigation node visitor */
  NavigationNode?: ASTVisitorFn<NavigationASTNode>;
  /** a flow node visitor */
  FlowNode?: ASTVisitorFn<FlowASTNode>;
  /** a flow state node visitor */
  FlowStateNode?: ASTVisitorFn<FlowStateASTNode>;
}

export interface Violation {
  /** the node the violation is for */
  node: ASTNode;

  /** the message to show */
  message: string;

  /** how much do we care? */
  severity: DiagnosticSeverity;

  /** A function that can make this good */
  fix?: () => {
    /** the edit to apply */
    edit: NodeEdit;

    /** A name for your fix */
    name: string;
  };
}

export interface ValidationContext {
  addViolation(violation: Violation): void;
  addDiagnostic(diagnostic: Diagnostic): void;
  useASTVisitor(visitor: ASTVisitor): void;
}

export interface CompletionContext {
  addCompletionItem(item: CompletionItem): void;
}
