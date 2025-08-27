import type { InterfaceDeclaration, TypeNode } from "ts-morph";
import { Node } from "ts-morph";
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
import { extractJSDocFromNode } from "../utils/jsdoc.js";

/**
 * Expands Omit<T, K> utility type.
 * Omits specific properties from a source type.
 */
export class OmitExpander extends UtilityTypeExpander {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    super();
  }

  getTypeName(): string {
    return "Omit";
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

    // Get the keys to omit
    const keysToOmit = extractStringLiteralUnion(keyType);

    // Handle nested utility types in the source
    const actualSourceType = unwrapUtilityTypes(sourceType);
    const sourceInterface = findInterfaceFromTypeNode(
      actualSourceType,
      context,
    );

    if (!sourceInterface) {
      console.warn(
        `Could not find interface for Omit source type: ${sourceType.getText()}`,
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

    // Filter out the omitted properties
    const remainingProperties = allProperties.filter(
      (prop) => !keysToOmit.includes(prop.name),
    );

    // Check if the source interface has index signatures
    const hasIndexSignature = this.hasIndexSignature(
      sourceInterface.declaration,
    );

    const typeAsString = `Omit<${sourceType.getText()}, ${keyType.getText()}>`;

    const objectProperty: ObjectProperty = {
      type: "object",
      kind: "non-terminal",
      name,
      typeAsString,
      properties: remainingProperties,
      ...(hasIndexSignature ? { acceptsUnknownProperties: true } : {}),
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
            // Extract JSDoc documentation for this property
            const documentation = extractJSDocFromNode(property);
            if (documentation) {
              propertyInfo.documentation = documentation;
            }
            properties.push(propertyInfo);
          }
        }
      }
    } finally {
      context.exitCircularCheck(typeName);
    }

    return properties;
  }

  /** Check if an interface has index signatures. */
  private hasIndexSignature(interfaceDecl: InterfaceDeclaration): boolean {
    const members = interfaceDecl.getMembers();
    return members.some((m) => Node.isIndexSignatureDeclaration(m));
  }
}
