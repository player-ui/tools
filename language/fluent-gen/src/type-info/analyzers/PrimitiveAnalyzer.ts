import { Node, TypeNode, SyntaxKind } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type { TypeAnalysisStrategy, AnalysisOptions } from "./TypeAnalyzer.js";
import { PropertyFactory } from "../factories/PropertyFactory.js";
import { safeAnalyze } from "./utils.js";

/** Analyzes primitive types (string, number, boolean) and their literal variants. */
export class PrimitiveAnalyzer implements TypeAnalysisStrategy {
  canHandle(typeNode: TypeNode): boolean {
    const typeText = typeNode.getText();

    // Handle primitive keywords
    if (
      typeText === "string" ||
      typeText === "number" ||
      typeText === "boolean"
    ) {
      return true;
    }

    if (Node.isLiteralTypeNode(typeNode)) {
      return true;
    }

    return false;
  }

  analyze({
    name,
    typeNode,
    options = {},
  }: {
    name: string;
    typeNode: TypeNode;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    const typeText = typeNode.getText();

    if (Node.isLiteralTypeNode(typeNode)) {
      return this.analyzeLiteralType(name, typeNode, options);
    }

    // Handle primitive keywords
    switch (typeText) {
      case "string":
        return PropertyFactory.createStringProperty({ name, options });
      case "number":
        return PropertyFactory.createNumberProperty({ name, options });
      case "boolean":
        return PropertyFactory.createBooleanProperty({ name, options });
      default:
        return null;
    }
  }

  /** Analyze literal type nodes (e.g., "active", 42, true). */
  private analyzeLiteralType(
    name: string,
    typeNode: TypeNode,
    options: AnalysisOptions,
  ): PropertyInfo | null {
    if (!Node.isLiteralTypeNode(typeNode)) {
      return null;
    }

    const literal = typeNode.getLiteral();
    const typeText = typeNode.getText();

    if (Node.isStringLiteral(literal)) {
      return safeAnalyze({
        analyzer: "PrimitiveAnalyzer",
        property: name,
        typeText,
        propertyFn: () =>
          PropertyFactory.createStringProperty({
            name,
            options,
            value: literal.getLiteralValue(),
          }),
        fallback: PropertyFactory.createStringProperty({ name, options }),
      });
    }

    if (Node.isNumericLiteral(literal)) {
      return safeAnalyze({
        analyzer: "PrimitiveAnalyzer",
        property: name,
        typeText,
        propertyFn: () =>
          PropertyFactory.createNumberProperty({
            name,
            options,
            value: literal.getLiteralValue(),
          }),
        fallback: PropertyFactory.createNumberProperty({ name, options }),
      });
    }

    // Handle negative numbers (prefix unary expressions)
    if (Node.isPrefixUnaryExpression(literal)) {
      const operatorToken = literal.getOperatorToken();
      const operand = literal.getOperand();
      if (
        operatorToken === SyntaxKind.MinusToken &&
        Node.isNumericLiteral(operand)
      ) {
        return safeAnalyze({
          analyzer: "PrimitiveAnalyzer",
          property: name,
          typeText,
          propertyFn: () =>
            PropertyFactory.createNumberProperty({
              name,
              options,
              value: -operand.getLiteralValue(),
            }),
          fallback: PropertyFactory.createNumberProperty({ name, options }),
        });
      }
    }

    if (Node.isFalseLiteral(literal) || Node.isTrueLiteral(literal)) {
      return PropertyFactory.createBooleanProperty({ name, options });
    }

    return null;
  }
}
