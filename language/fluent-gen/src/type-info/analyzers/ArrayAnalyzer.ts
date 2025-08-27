import { Node, TypeNode, TypeReferenceNode } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  TypeAnalysisStrategy,
  AnalysisOptions,
  TypeAnalyzer,
} from "./TypeAnalyzer.js";

/** Analyzes array types including both T[] and Array<T> syntax. */
export class ArrayAnalyzer implements TypeAnalysisStrategy {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {}

  canHandle(typeNode: TypeNode): boolean {
    // Handle T[] syntax
    if (Node.isArrayTypeNode(typeNode)) {
      return true;
    }

    // Handle Array<T> and ReadonlyArray<T> syntax
    if (Node.isTypeReference(typeNode)) {
      const typeName = this.getTypeReferenceName(typeNode);
      return typeName === "Array" || typeName === "ReadonlyArray";
    }

    return false;
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
    let elementTypeNode: TypeNode;

    // Handle T[] syntax
    if (Node.isArrayTypeNode(typeNode)) {
      elementTypeNode = typeNode.getElementTypeNode();
    }
    // Handle Array<T> and ReadonlyArray<T> syntax
    else if (Node.isTypeReference(typeNode)) {
      const typeName = this.getTypeReferenceName(typeNode);
      if (typeName === "Array" || typeName === "ReadonlyArray") {
        const typeArgs = typeNode.getTypeArguments();
        if (typeArgs.length === 0) {
          // Array without type arguments - fallback to unknown[]
          return {
            kind: "terminal",
            type: "unknown",
            isArray: true,
            name,
            ...(options.isOptional ? { isOptional: true } : {}),
            typeAsString: "unknown[]",
          };
        }
        elementTypeNode = typeArgs[0]!;
      } else {
        return null;
      }
    } else {
      return null;
    }

    // Analyze the element type with isArray flag
    const elementProperty = this.typeAnalyzer.analyze({
      name,
      typeNode: elementTypeNode,
      context,
      options: {
        ...options,
        isArray: true,
      },
    });

    return elementProperty;
  }

  /** Get the type name from a type reference node. */
  private getTypeReferenceName(typeNode: TypeReferenceNode): string {
    try {
      return typeNode.getTypeName().getText();
    } catch (error) {
      console.warn(`[ArrayAnalyzer] Failed to get type reference name:`, error);
      return "";
    }
  }
}
