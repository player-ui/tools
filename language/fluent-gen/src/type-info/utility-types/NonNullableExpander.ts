import { Node, TypeNode } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  AnalysisOptions,
  TypeAnalyzer,
} from "../analyzers/TypeAnalyzer.js";
import { UtilityTypeExpander } from "./UtilityTypeExpander.js";
import {
  getTypeReferenceName,
  findInterfaceFromTypeNode,
} from "../utils/index.js";

/**
 * Expands NonNullable<T> utility type.
 * Removes null and undefined from a union type.
 */
export class NonNullableExpander extends UtilityTypeExpander {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    super();
  }

  getTypeName(): string {
    return "NonNullable";
  }

  expand({
    name,
    typeArgs,
    context,
    options = {},
  }: {
    name: string;
    typeArgs: TypeNode[];
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    if (!this.validateTypeArguments(typeArgs, 1)) {
      return null;
    }

    const sourceType = typeArgs[0]!;

    // If the source type is a reference, track its dependency
    if (Node.isTypeReference(sourceType)) {
      const typeName = getTypeReferenceName(sourceType);

      // Try to find and track the dependency
      const referencedSymbol = findInterfaceFromTypeNode(sourceType, context);
      if (referencedSymbol) {
        context.addDependency({
          target: referencedSymbol.target,
          dependency: typeName,
        });
      }
    }

    // For NonNullable<T>, we analyze T directly
    // The NonNullable utility type removes null and undefined from union types
    // but since we're focusing on interface extraction, we can analyze the source type directly
    const result = this.typeAnalyzer.analyze({
      name,
      typeNode: sourceType,
      context,
      options: {
        ...options,
        // NonNullable doesn't change the array or optional status of the property itself
        // It only affects union types that include null or undefined
      },
    });

    return result;
  }
}
