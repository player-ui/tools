import type { InterfaceDeclaration, TypeNode } from "ts-morph";
import {
  type PropertyInfo,
  type ObjectProperty,
  isObjectProperty,
} from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  AnalysisOptions,
  TypeAnalyzer,
} from "../analyzers/TypeAnalyzer.js";
import { UtilityTypeExpander } from "./UtilityTypeExpander.js";
import { findInterfaceFromTypeNode } from "../utils/index.js";

/**
 * Expands Partial<T> utility type.
 * Makes all properties optional.
 */
export class PartialExpander extends UtilityTypeExpander {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    super();
  }

  getTypeName(): string {
    return "Partial";
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
    const typeAsString = `Partial<${sourceType.getText()}>`;

    // First try to analyze the source type directly (handles nested utility types)
    const sourceAnalysis = this.typeAnalyzer.analyze({
      name: "",
      typeNode: sourceType,
      context,
      options: {
        isOptional: false,
      },
    });

    if (sourceAnalysis && isObjectProperty(sourceAnalysis)) {
      // Make all properties optional, including nested ones
      const properties = this.makePropertiesOptional(sourceAnalysis.properties);

      const objectProperty: ObjectProperty = {
        kind: "non-terminal",
        type: "object",
        name,
        typeAsString,
        properties,
        ...(options.isArray ? { isArray: true } : {}),
        ...(options.isOptional ? { isOptional: true } : {}),
      };

      return objectProperty;
    }

    // Fallback: try to find direct interface
    const sourceInterface = findInterfaceFromTypeNode(sourceType, context);
    if (!sourceInterface) {
      console.warn(
        `Could not find interface for Partial source type: ${sourceType.getText()}`,
      );
      return null;
    }

    context.addDependency({
      target: sourceInterface.target,
      dependency: sourceType.getText().split("<")[0]!.trim(),
    });

    const allProperties = this.extractAllProperties(
      sourceInterface.declaration,
      context,
    );
    const properties = this.makePropertiesOptional(allProperties);

    const objectProperty: ObjectProperty = {
      kind: "non-terminal",
      type: "object",
      name,
      typeAsString,
      properties,
      ...(options.isArray ? { isArray: true } : {}),
      ...(options.isOptional ? { isOptional: true } : {}),
    };

    return objectProperty;
  }

  /** Make all properties optional recursively. */
  private makePropertiesOptional(properties: PropertyInfo[]): PropertyInfo[] {
    return properties.map((prop) => {
      const optionalProp = { ...prop, isOptional: true };

      // If this property is an object, make its nested properties optional too
      if (isObjectProperty(optionalProp)) {
        optionalProp.properties = this.makePropertiesOptional(
          optionalProp.properties,
        );
      }

      return optionalProp;
    });
  }

  /** Extract all properties from an interface declaration. */
  private extractAllProperties(
    interfaceDecl: InterfaceDeclaration,
    context: ExtractorContext,
  ): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
    const typeName = interfaceDecl.getName();

    // Prevent circular dependencies
    if (!context.enterCircularCheck(typeName)) {
      return properties;
    }

    try {
      for (const property of interfaceDecl.getProperties()) {
        const propertyName = property.getName();
        const typeNode = property.getTypeNode();
        const isOptional = property.hasQuestionToken();

        if (typeNode) {
          const propertyInfo = this.typeAnalyzer.analyze({
            name: propertyName,
            typeNode,
            context,
            options: { isOptional },
          });

          if (propertyInfo) {
            properties.push(propertyInfo);
          }
        }
      }
    } finally {
      context.exitCircularCheck(typeName);
    }

    return properties;
  }
}
