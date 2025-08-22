import { Node, type TypeNode } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type { AnalysisOptions } from "../analyzers/TypeAnalyzer.js";

/**
 * Base class for utility type expanders.
 * Each utility type (Pick, Omit, etc.) should extend this class.
 */
export abstract class UtilityTypeExpander {
  /** Get the name of the utility type this expander handles. */
  abstract getTypeName(): string;

  /** Expand the utility type with the given type arguments. */
  abstract expand(args: {
    name: string;
    typeArgs: TypeNode[];
    context: ExtractorContext;
    options?: AnalysisOptions;
  }): PropertyInfo | null;

  /** Validate that the correct number of type arguments were provided. */
  protected validateTypeArguments(
    typeArgs: TypeNode[],
    expectedCount: number,
  ): boolean {
    if (typeArgs.length !== expectedCount) {
      console.warn(
        `${this.getTypeName()} expects ${expectedCount} type arguments, got ${typeArgs.length}`,
      );
      return false;
    }
    return true;
  }

  /**
   * Extract string literal values from a union type or single literal.
   * Used for extracting keys in Pick<T, K> and Omit<T, K>.
   */
  protected extractStringLiteralUnion(typeNode: TypeNode): string[] {
    const literals: string[] = [];

    if (Node.isUnionTypeNode(typeNode)) {
      for (const unionType of typeNode.getTypeNodes()) {
        if (Node.isLiteralTypeNode(unionType)) {
          const literal = unionType.getLiteral();
          if (Node.isStringLiteral(literal)) {
            literals.push(literal.getLiteralValue());
          }
        }
      }
    } else if (Node.isLiteralTypeNode(typeNode)) {
      const literal = typeNode.getLiteral();
      if (Node.isStringLiteral(literal)) {
        literals.push(literal.getLiteralValue());
      }
    }

    return literals;
  }
}
