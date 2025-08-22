import type { InterfaceDeclaration, TypeNode } from "ts-morph";
import type { PropertyInfo, ObjectProperty } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  AnalysisOptions,
  TypeAnalyzer,
} from "../analyzers/TypeAnalyzer.js";
import { UtilityTypeExpander } from "./UtilityTypeExpander.js";
import {
  extractStringLiteralUnion,
  findInterfaceFromTypeNode,
  unwrapUtilityTypes,
} from "../utils/index.js";

/**
 * Expands Pick<T, K> utility type.
 * Picks specific properties from a source type.
 */
export class PickExpander extends UtilityTypeExpander {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    super();
  }

  getTypeName(): string {
    return "Pick";
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
    if (!this.validateTypeArguments(typeArgs, 2)) {
      return null;
    }

    const sourceType = typeArgs[0]!;
    const keyType = typeArgs[1]!;

    // Get the keys to pick
    const keysToPick = extractStringLiteralUnion(keyType);
    if (keysToPick.length === 0) {
      console.warn(
        `Pick type has no extractable keys from: ${keyType.getText()}`,
      );
      return null;
    }

    // Handle nested utility types in the source
    const actualSourceType = unwrapUtilityTypes(sourceType);
    const sourceInterface = findInterfaceFromTypeNode(
      actualSourceType,
      context,
    );

    if (!sourceInterface) {
      console.warn(
        `Could not find interface for Pick source type: ${sourceType.getText()}`,
      );
      return null;
    }

    context.addDependency({
      target: sourceInterface.target,
      dependency: actualSourceType.getText().split("<")[0]!.trim(),
    });

    const allProperties = this.extractAllProperties(
      sourceInterface.declaration,
      context,
    );

    const pickedProperties = allProperties.filter((prop) =>
      keysToPick.includes(prop.name),
    );

    const typeAsString = `Pick<${sourceType.getText()}, ${keyType.getText()}>`;

    const objectProperty: ObjectProperty = {
      kind: "non-terminal",
      type: "object",
      name,
      typeAsString,
      properties: pickedProperties,
      ...(options.isArray ? { isArray: true } : {}),
      ...(options.isOptional ? { isOptional: true } : {}),
    };

    return objectProperty;
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
