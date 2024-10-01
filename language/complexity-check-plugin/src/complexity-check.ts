import {
  Diagnostic,
  DiagnosticSeverity,
  Range,
  TextDocument,
} from "vscode-languageserver-types";
import { resolveDataRefs } from "@player-ui/player";
import {
  getProperty,
  isPropertyNode,
  AssetASTNode,
  type ASTNode,
  type ViewASTNode,
  type PlayerLanguageService,
  type PlayerLanguageServicePlugin,
  type ASTVisitor,
} from "@player-tools/json-language-service";

const makeRange = (
  start: number,
  end: number,
  document: TextDocument
): Range => {
  return {
    start: document.positionAt(start),
    end: document.positionAt(end),
  };
};

export interface ComplexityCheckConfig {
  /** Cutoff for content to be acceptable */
  maxAcceptableComplexity: number;
  /**
   * If set, any score above this number but below `maxAcceptableComplexity` will be logged as a warning
   */
  maxWarningLevel?: number;
  /** If set, maps complexity based on asset or view type */
  assetComplexity?: Record<string, number>;
  /** A way to pass in configurable options */
  options?: {
    /** Read out all logging messages */
    verbose?: boolean;
  };
}

/**
 * Estimates complexity of content
 */
export class ComplexityCheck implements PlayerLanguageServicePlugin {
  name = "complexity-check";

  private config: ComplexityCheckConfig;
  private contentScore: number;
  private range: {
    start: number;
    end: number;
  };

  constructor(config: ComplexityCheckConfig) {
    this.config = config;
    this.contentScore = 0;
    this.range = { start: 0, end: 0 };
  }

  apply(service: PlayerLanguageService): void {
    service.hooks.validate.tap(this.name, async (_ctx, validation) => {
      validation.useASTVisitor(this.createContentChecker());
    });

    service.hooks.onDocumentUpdate.tap(this.name, () => {
      this.contentScore = 0;
    });

    service.hooks.onValidateEnd.tap(this.name, (diagnostics, context) => {
      let diagnostic: Diagnostic;

      if (this.contentScore < this.config.maxAcceptableComplexity) {
        if (
          this.config.maxWarningLevel &&
          this.contentScore > this.config.maxWarningLevel
        ) {
          diagnostic = {
            message: `Warning: Content complexity is ${this.contentScore}`,
            severity: DiagnosticSeverity.Warning,
            range: makeRange(
              this.range.start,
              this.range.end,
              context.documentContext.document
            ),
          };
        } else {
          diagnostic = {
            message: `Info: Content complexity is ${this.contentScore}`,
            severity: DiagnosticSeverity.Error,
            range: makeRange(
              this.range.start,
              this.range.end,
              context.documentContext.document
            ),
          };
        }
      } else {
        diagnostic = {
          message: `Error: Content complexity is ${this.contentScore}`,
          severity: DiagnosticSeverity.Information,
          range: makeRange(
            this.range.start,
            this.range.end,
            context.documentContext.document
          ),
        };
      }
      return [...diagnostics, diagnostic];
    });
  }

  /** Create a validation visitor for dealing with transition states */
  createContentChecker = (): ASTVisitor => {
    return {
      FlowNode: (flowNode) => {
        this.range = {
          start: flowNode.jsonNode.offset,
          end: flowNode.jsonNode.offset + flowNode.jsonNode.length,
        };
      },

      FlowStateNode: (flowState) => {
        // add complexity per expression in a state
        if (flowState.stateType) {
          if (flowState.stateType.valueNode?.value === "ACTION") {
            const numExp = getProperty(flowState, "exp");
            if (numExp?.valueNode?.type === "array") {
              this.contentScore += numExp.valueNode.children.length;
              if (this.config.options?.verbose) {
                console.log(
                  `state exp (x${numExp.valueNode.children.length}): ${this.contentScore}`
                );
              }
            } else {
              this.contentScore += 1;
              if (this.config.options?.verbose) {
                console.log(`state exp: ${this.contentScore}`);
              }
            }
          }
        }
      },
      AssetNode: (assetNode: AssetASTNode) => {
        let scoreModifier = 1;
        // recursively check parent nodes for templates
        const checkParentTemplate = (node: ASTNode) => {
          if (node.parent) {
            if (
              isPropertyNode(node.parent) &&
              node.parent.keyNode.value === "template"
            ) {
              // incerases the score modifier for each template parent
              scoreModifier += 1;

              if (this.config.options?.verbose) {
                console.log(`found a template parent (+1)`);
              }
              return checkParentTemplate(node.parent);
            }
            return checkParentTemplate(node.parent);
          }
          return node;
        };

        checkParentTemplate(assetNode);
        this.contentScore += scoreModifier;

        const assetType = assetNode.assetType?.valueNode?.value;

        // Map the assetComplexity score based on the asset type
        const assetComplexity = assetType
          ? this.config.assetComplexity?.[assetType]
          : undefined;

        // Only run if assetComplexity is set in the config
        if (this.config.assetComplexity) {
          if (assetComplexity) {
            this.contentScore += assetComplexity;
            if (this.config.options?.verbose) {
              console.log(
                `assetNode (+${assetComplexity} for ${assetType}): ${this.contentScore}`
              );
            }
          } else {
            if (this.config.options?.verbose) {
              console.log(
                `assetNode (${assetType} complexity type not found): ${this.contentScore}`
              );
            }
          }
        } else if (this.config.options?.verbose) {
          console.log("assetNode:", this.contentScore);
        }
      },
      ViewNode: (viewNode: ViewASTNode) => {
        this.contentScore += 1;

        const viewType = viewNode.viewType?.valueNode?.value;

        // Map the assetComplexity score based on the view type
        const viewComplexity = viewType
          ? this.config.assetComplexity?.[viewType]
          : undefined;

        // Only run if assetComplexity is set in the config
        if (this.config.assetComplexity) {
          if (viewComplexity) {
            this.contentScore += viewComplexity;
            if (this.config.options?.verbose) {
              console.log(
                `viewNode (+${viewComplexity} for ${viewType}): ${this.contentScore}`
              );
            }
          } else {
            if (this.config.options?.verbose) {
              console.log(
                `viewNode (${viewType} complexity type not found): ${this.contentScore}`
              );
            }
          }
        } else if (this.config.options?.verbose) {
          console.log("viewNode:", this.contentScore);
        }
      },
      StringNode: (stringNode) => {
        const stringContent = stringNode.value;
        resolveDataRefs(stringContent, {
          model: {
            get: (binding) => {
              this.contentScore += 2;
              if (this.config.options?.verbose) {
                console.log(`model (get: ${binding}): ${this.contentScore}`);
              }
              return binding;
            },
            set: (binding) => {
              this.contentScore += 2;
              if (this.config.options?.verbose) {
                console.log(`model (set: ${binding}): ${this.contentScore}`);
              }
              return [];
            },
            delete: () => {},
          },
          evaluate: (str) => {
            this.contentScore += 2;
            if (this.config.options?.verbose) {
              console.log(`model (evaluate: ${str}): ${this.contentScore}`);
            }
            return str;
          },
        });
      },
    };
  };
}
