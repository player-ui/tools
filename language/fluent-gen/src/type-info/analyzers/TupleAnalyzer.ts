import { Node, TypeNode } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  TypeAnalysisStrategy,
  AnalysisOptions,
  TypeAnalyzer,
} from "./TypeAnalyzer.js";
import { logAnalysisWarning } from "./utils.js";
import { PropertyFactory } from "../factories/PropertyFactory.js";

/** Analyzes tuple types (e.g., [string, number, boolean]). */
export class TupleAnalyzer implements TypeAnalysisStrategy {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {}

  canHandle(typeNode: TypeNode): boolean {
    return Node.isTupleTypeNode(typeNode);
  }

  analyze({
    name,
    typeNode,
    context,
    options = {},
  }: {
    name: string;
    typeNode: TypeNode;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    if (!Node.isTupleTypeNode(typeNode)) {
      return null;
    }

    try {
      const elements = typeNode.getElements();
      const properties: PropertyInfo[] = [];

      // Analyze each tuple element
      elements.forEach((elementType, index) => {
        const elementProperty = this.typeAnalyzer.analyze({
          name: `${index}`, // Use index as property name
          typeNode: elementType,
          context,
          options: {
            ...options,
            isArray: false, // Reset array flag for tuple elements
          },
        });

        if (elementProperty) {
          properties.push(elementProperty);
        }
      });

      // Create an object property representing the tuple
      return PropertyFactory.createObjectProperty({
        name,
        typeAsString: typeNode.getText(),
        properties,
        options,
      });
    } catch (error) {
      logAnalysisWarning(
        "TupleAnalyzer",
        `Failed to analyze tuple type: ${error}`,
        { typeText: typeNode.getText() },
      );
      return null;
    }
  }
}
