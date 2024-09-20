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
  type ASTNode,
  type ViewASTNode,
  type PlayerLanguageService,
  type PlayerLanguageServicePlugin,
} from "..";
import type { ASTVisitor, ValidationContext } from "../types";

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
   * If set, anything above `maxAcceptableComplexity` but below this will be logged as a warning
   * and anything above this will be an error. If this is not set anything over `maxAcceptableComplexity`

   */
  maxWarningLevel?: number;
  /** If set, maps complexity based on asset type */
  assetComplexity?: Record<string, number>;
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
    service.hooks.validate.tap(this.name, async (ctx, validation) => {
      validation.useASTVisitor(this.createContentChecker(validation));
    });

    service.hooks.onDocumentUpdate.tap(this.name, (contxt) => {
      this.contentScore = 0;
    });

    service.hooks.onValidateEnd.tap(this.name, (diagnostics, context) => {
      let diagnostic: Diagnostic;

      if (this.contentScore > this.config.maxAcceptableComplexity) {
        if (
          this.config.maxWarningLevel &&
          this.contentScore < this.config.maxWarningLevel
        ) {
          diagnostic = {
            // message: `Warning: Content complexity is ${this.contentScore}, which is above your warning threshold of ${this.config.maxWarningLevel}`,
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
            // message: `Error: Content complexity is ${this.contentScore}, however the maximum acceptable complexity is ${this.config.maxAcceptableComplexity}`,
            message: `Error: Content complexity is ${this.contentScore}`,
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
          message: `Info: Content complexity is ${this.contentScore}`,
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
  createContentChecker = (ctx: ValidationContext): ASTVisitor => {
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
              console.log(
                "state exp:",
                numExp.valueNode.children.length,
                this.contentScore
              );
            } else {
              this.contentScore += 1;
            }
          }
        }
      },
      AssetNode: (assetNode) => {
        let scoreModifier = 1;
        // recursively check parent nodes for templates
        function checkParentTemplate(node: ASTNode) {
          if (node.parent) {
            if (
              isPropertyNode(node.parent) &&
              node.parent.keyNode.value === "template"
            ) {
              // incerases the score modifier for each template parent
              scoreModifier += 1;
              console.log(
                "found a template parent, modified score:",
                scoreModifier
              );
              return checkParentTemplate(node.parent);
            }
            return checkParentTemplate(node.parent);
          }
          return node;
        }

        checkParentTemplate(assetNode);
        this.contentScore += scoreModifier;

        console.log("assetNode:", this.contentScore);
      },
      ViewNode: (viewNode: ViewASTNode) => {
        this.contentScore += 1;

        const viewType = viewNode.viewType?.valueNode?.value;

        // Map the assetComplexity score based on the view type
        const viewComplexity = viewType
          ? this.config.assetComplexity?.[viewType]
          : undefined;

        if (viewComplexity !== undefined) {
          this.contentScore += viewComplexity;
          console.log(
            `viewNode: ${viewType}, complexity: ${viewComplexity}, contentScore: ${this.contentScore}`
          );
        } else {
          console.log(
            `viewNode: ${viewType}, no matching complexity type found, contentScore is: ${this.contentScore}`
          );
        }
      },
      StringNode: (stringNode) => {
        const stringContent = stringNode.value;
        resolveDataRefs(stringContent, {
          model: {
            get: (binding) => {
              this.contentScore += 2;
              console.log("model - get:", binding, this.contentScore);
              return binding;
            },
            set: () => {
              this.contentScore += 2;
              console.log("model - set:", this.contentScore);
              return [];
            },
            delete: () => {},
          },
          evaluate: (str) => {
            this.contentScore += 2;
            console.log("model - evaluate:", str, this.contentScore);
            return str;
          },
        });
      },
    };
  };
}