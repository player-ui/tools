import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver-types";
import { resolveDataRefs } from "@player-ui/player";
import {
  getProperty,
  isPropertyNode,
  AssetASTNode,
  toRange,
} from "@player-tools/json-language-service";
import type {
  ASTNode,
  ASTVisitor,
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
  ViewASTNode,
  DocumentContext,
} from "@player-tools/json-language-service";

export interface ComplexityCheckConfig {
  /** Cutoff for content to be acceptable */
  maxAcceptableComplexity: number;
  /**
   * If set, any score above this number but below `maxAcceptableComplexity` will be logged as a warning
   */
  maxWarningLevel?: number;
  /** If set, maps additional complexity based on asset or view type */
  typeWeights?: Record<string, number>;
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
  private verboseDetails: Diagnostic[];

  constructor(config: ComplexityCheckConfig) {
    this.config = config;
    this.typeCount = {};
    this.contentScore = 0;
    this.range = { start: 0, end: 0 };
    this.verboseDetails = [];
  }

  apply(service: PlayerLanguageService): void {
    service.hooks.validate.tap(this.name, async (ctx, validation) => {
      validation.useASTVisitor(this.createContentChecker(ctx));
    });

    service.hooks.onDocumentUpdate.tap(this.name, () => {
      this.typeCount = {};
      this.contentScore = 0;
      this.verboseDetails = [];
    });

    service.hooks.onValidateEnd.tap(this.name, (diagnostics) => {
      const diagnosticRange = {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 0 },
      };

      const message = `Content complexity is ${this.contentScore}`;

      let diagnostic: Diagnostic = {
        message: `${message}`,
        severity: DiagnosticSeverity.Information,
        range: diagnosticRange,
      };

      if (this.contentScore < this.config.maxAcceptableComplexity) {
        if (
          this.config.maxWarningLevel &&
          this.contentScore > this.config.maxWarningLevel
        ) {
          diagnostic = {
            message: `${message}, Warning: ${this.config.maxWarningLevel}`,
            severity: DiagnosticSeverity.Warning,
            range: diagnosticRange,
          };
        }
      } else {
        diagnostic = {
          message: `${message}, Maximum: ${this.config.maxAcceptableComplexity}`,
          severity: DiagnosticSeverity.Error,
          range: diagnosticRange,
        };
      }

      return [diagnostic, ...diagnostics, ...this.verboseDetails];
    });
  }

  /** Create a validation visitor for dealing with transition states */
  createContentChecker = (ctx: DocumentContext): ASTVisitor => {
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

              this.verboseDetails.push({
                message: `state exp (+${numExp.valueNode.children.length}): ${this.contentScore}`,
                severity: DiagnosticSeverity.Information,
                range: toRange(ctx.document, flowState),
              });
            } else {
              this.contentScore += 1;

              this.verboseDetails.push({
                message: `state exp: ${this.contentScore}`,
                severity: DiagnosticSeverity.Information,
                range: toRange(ctx.document, flowState),
              });
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

              this.verboseDetails.push({
                message: `found a template parent (+1): ${this.contentScore}`,
                severity: DiagnosticSeverity.Information,
                range: toRange(ctx.document, assetNode),
              });

              return checkParentTemplate(node.parent);
            }
            return checkParentTemplate(node.parent);
          }
          return node;
        };

        checkParentTemplate(assetNode);
        this.contentScore += scoreModifier;

        const assetType = assetNode.assetType?.valueNode?.value;

        // Map the typeWeights score based on the asset type
        const typeWeights = assetType
          ? this.config.typeWeights?.[assetType]
          : undefined;

        // Only run if typeWeights is set in the config
        if (this.config.typeWeights) {
          if (typeWeights) {
            this.contentScore += typeWeights;
            if (assetType) {
              // if an assetType is found, add 1 point to typeCount for each occurrence
              if (this.typeCount[assetType] !== undefined) {
                this.typeCount[assetType] += 1;
              } else {
                this.typeCount[assetType] = 1;
              }
            }
            this.verboseDetails.push({
              message: `assetNode (1 +${typeWeights} for ${assetType}): ${this.contentScore}`,
              severity: DiagnosticSeverity.Information,
              range: toRange(ctx.document, assetNode),
            });
          } else {
            this.verboseDetails.push({
              message: `assetNode (+1 - ${assetType} complexity type not found): ${this.contentScore}`,
              severity: DiagnosticSeverity.Information,
              range: toRange(ctx.document, assetNode),
            });
          }
        } else
          this.verboseDetails.push({
            message: `assetNode (+1): ${this.contentScore}`,
            severity: DiagnosticSeverity.Information,
            range: toRange(ctx.document, assetNode),
          });
      },
      ViewNode: (viewNode: ViewASTNode) => {
        this.contentScore += 1;

        const viewType = viewNode.viewType?.valueNode?.value;

        // Map the typeWeights score based on the view type
        const viewComplexity = viewType
          ? this.config.typeWeights?.[viewType]
          : undefined;

        // Only run if typeWeights is set in the config
        if (this.config.typeWeights) {
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
            this.verboseDetails.push({
              message: `viewNode (1 +${viewComplexity} for ${viewType}): ${this.contentScore}`,
              severity: DiagnosticSeverity.Information,
              range: toRange(ctx.document, viewNode),
            });
          } else {
            this.verboseDetails.push({
              message: `viewNode (+1 - ${viewType} complexity type not found): ${this.contentScore}`,
              severity: DiagnosticSeverity.Information,
              range: toRange(ctx.document, viewNode),
            });
          }
        } else
          this.verboseDetails.push({
            message: `viewNode (+1): ${this.contentScore}`,
            severity: DiagnosticSeverity.Information,
            range: toRange(ctx.document, viewNode),
          });
      },
      StringNode: (stringNode) => {
        const stringContent = stringNode.value;
        const multiplier = 4;
        resolveDataRefs(stringContent, {
          model: {
            get: (binding) => {
              this.contentScore += multiplier;

              this.verboseDetails.push({
                message: `model - get: ${binding} (+${multiplier}): ${this.contentScore}`,
                severity: DiagnosticSeverity.Information,
                range: toRange(ctx.document, stringNode),
              });

              return binding;
            },
            set: (binding) => {
              this.contentScore += multiplier;

              this.verboseDetails.push({
                message: `model - set: ${binding} (+${multiplier}: ${this.contentScore}`,
                severity: DiagnosticSeverity.Information,
                range: toRange(ctx.document, stringNode),
              });

              return [];
            },
            delete: () => {},
          },
          evaluate: (str) => {
            this.contentScore += multiplier;

            this.verboseDetails.push({
              message: `model - evaluate: ${str} (+${multiplier}): ${this.contentScore}`,
              severity: DiagnosticSeverity.Information,
              range: toRange(ctx.document, stringNode),
            });

            return str;
          },
        });
      },
    };
  };
}