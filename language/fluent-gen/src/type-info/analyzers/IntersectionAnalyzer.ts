import { Node, TypeNode } from "ts-morph";
import {
  type PropertyInfo,
  type ObjectProperty,
  isObjectProperty,
} from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  TypeAnalysisStrategy,
  AnalysisOptions,
  TypeAnalyzer,
} from "./TypeAnalyzer.js";

/**
 * Analyzes intersection types (e.g., A & B & C).
 * Intersection types combine all properties from each type.
 */
export class IntersectionAnalyzer implements TypeAnalysisStrategy {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {}

  canHandle(typeNode: TypeNode): boolean {
    return Node.isIntersectionTypeNode(typeNode);
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
    if (!Node.isIntersectionTypeNode(typeNode)) {
      return null;
    }

    const typeAsString = typeNode.getText();
    const intersectionTypes = typeNode.getTypeNodes();
    const allProperties: PropertyInfo[] = [];
    let acceptsUnknownProperties = false;

    for (const intersectionType of intersectionTypes) {
      const analyzedType = this.typeAnalyzer.analyze({
        name: "", // Use empty name for intersection elements
        typeNode: intersectionType,
        context,
        options: {
          ...options,
          ...(options.genericContext
            ? { genericContext: options.genericContext }
            : {}),
          isOptional: false,
        },
      });

      if (analyzedType && isObjectProperty(analyzedType)) {
        // Merge properties from this intersection element
        allProperties.push(...analyzedType.properties);

        // If any intersection element accepts unknown properties, the result does too
        if (analyzedType.acceptsUnknownProperties) {
          acceptsUnknownProperties = true;
        }
      } else if (analyzedType) {
        // Create a synthetic property for non-object types in intersection
        allProperties.push(analyzedType);
      }
    }

    const uniqueProperties = this.deduplicateProperties(allProperties);

    const objectProperty: ObjectProperty = {
      type: "object",
      kind: "non-terminal",
      name,
      typeAsString,
      properties: uniqueProperties,
      ...(acceptsUnknownProperties ? { acceptsUnknownProperties: true } : {}),
      ...(options.isArray ? { isArray: true } : {}),
      ...(options.isOptional ? { isOptional: true } : {}),
    };

    return objectProperty;
  }

  /**
   * Remove duplicate properties by name, keeping the last occurrence.
   * This handles cases where intersection types override properties.
   */
  private deduplicateProperties(properties: PropertyInfo[]): PropertyInfo[] {
    const propertyMap = new Map<string, PropertyInfo>();

    for (const property of properties) {
      propertyMap.set(property.name, property);
    }

    return Array.from(propertyMap.values());
  }
}
