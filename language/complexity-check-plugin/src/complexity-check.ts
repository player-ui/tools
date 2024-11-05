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
} from "@player-tools/json-language-service";
import type {
  ASTNode,
  ASTVisitor,
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
  ViewASTNode,
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
}

/**
 * Estimates complexity of content
 */
export class ComplexityCheck implements PlayerLanguageServicePlugin {
  name = "complexity-check";

  private config: ComplexityCheckConfig;
  private typeCount: Record<string, number>;
  private contentScore: number;
  private range: {
    start: number;
    end: number;
  };
  private hintsArray: string[];

  constructor(config: ComplexityCheckConfig) {
    this.config = config;
    this.typeCount = {};
    this.contentScore = 0;
    this.range = { start: 0, end: 0 };
    this.hintsArray = [];
  }

  apply(service: PlayerLanguageService): void {
    service.hooks.validate.tap(this.name, async (_ctx, validation) => {
      validation.useASTVisitor(this.createContentChecker());
    });

    service.hooks.onDocumentUpdate.tap(this.name, () => {
      this.typeCount = {};
      this.contentScore = 0;
      this.hintsArray = [];
    });

    service.hooks.onValidateEnd.tap(this.name, (diagnostics, context) => {
      Object.entries(this.typeCount).forEach(([type, count]) => {
        this.hintsArray.push(`${type}: ${count}`);
      });

      console.log(this, context);

      const diagnosticRange = makeRange(
        this.range.start,
        this.range.end,
        context.documentContext.document
      );

      let message = `Content complexity is ${this.contentScore}`;

      let diagnostic: Diagnostic = {
        message: `Info: ${message}`,
        severity: DiagnosticSeverity.Information,
        range: diagnosticRange,
      };

      if (diagnostic.severity === DiagnosticSeverity.Hint) {
        message += `\nScore breakdown:\n${this.hintsArray.join("\n")}`;
      }

      if (this.contentScore < this.config.maxAcceptableComplexity) {
        if (
          this.config.maxWarningLevel &&
          this.contentScore > this.config.maxWarningLevel
        ) {
          diagnostic = {
            message: `Warning: ${message}`,
            severity: DiagnosticSeverity.Warning,
            range: diagnosticRange,
          };
        }
      } else {
        diagnostic = {
          message: `Error: ${message}`,
          severity: DiagnosticSeverity.Error,
          range: diagnosticRange,
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

              this.hintsArray.push(
                `state exp (x${numExp.valueNode.children.length}): ${this.contentScore}`
              );
            } else {
              this.contentScore += 1;

              this.hintsArray.push(`state exp: ${this.contentScore}`);
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

              this.hintsArray.push(`found a template parent (+1)`);

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
            if (assetType) {
              // if an assetType is found, add 1 point to typeCount for each occurrence
              if (this.typeCount[assetType] !== undefined) {
                this.typeCount[assetType] += 1;
              } else {
                this.typeCount[assetType] = 1;
              }
            }

            this.hintsArray.push(
              `assetNode (+${assetComplexity} for ${assetType}): ${this.contentScore}`
            );
          } else {
            this.hintsArray.push(
              `assetNode (${assetType} complexity type not found): ${this.contentScore}`
            );
          }
        } else this.hintsArray.push(`assetNode: ${this.contentScore}`);
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

            if (viewType) {
              // if a viewType is found, add 1 point to typeCount for each occurrence
              if (this.typeCount[viewType] !== undefined) {
                this.typeCount[viewType] += 1;
              } else {
                this.typeCount[viewType] = 1;
              }
            }

            this.hintsArray.push(
              `viewNode (+${viewComplexity} for ${viewType}): ${this.contentScore}`
            );
          } else {
            this.hintsArray.push(
              `viewNode (${viewType} complexity type not found): ${this.contentScore}`
            );
          }
        } else this.hintsArray.push(`viewNode: ${this.contentScore}`);
      },
      StringNode: (stringNode) => {
        const stringContent = stringNode.value;
        resolveDataRefs(stringContent, {
          model: {
            get: (binding) => {
              this.contentScore += 4;

              this.hintsArray.push(
                `model (get: ${binding}): ${this.contentScore}`
              );

              return binding;
            },
            set: (binding) => {
              this.contentScore += 4;

              this.hintsArray.push(
                `model (set: ${binding}): ${this.contentScore}`
              );

              return [];
            },
            delete: () => {},
          },
          evaluate: (str) => {
            this.contentScore += 4;

            this.hintsArray.push(
              `model (evaluate: ${str}): ${this.contentScore}`
            );

            return str;
          },
        });
      },
    };
  };
}