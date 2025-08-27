import {
  Node,
  TypeNode,
  InterfaceDeclaration,
  TypeAliasDeclaration,
  SyntaxKind,
} from "ts-morph";
import {
  type PropertyInfo,
  type UnionProperty,
  type ObjectProperty,
  isObjectProperty,
} from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  TypeAnalysisStrategy,
  AnalysisOptions,
  TypeAnalyzer,
} from "./TypeAnalyzer.js";
import { SymbolResolver } from "../resolvers/SymbolResolver.js";

/** Analyzes union types (e.g., string | number | 'literal'). */
export class UnionAnalyzer implements TypeAnalysisStrategy {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {}

  canHandle(typeNode: TypeNode): boolean {
    return Node.isUnionTypeNode(typeNode);
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
    if (!Node.isUnionTypeNode(typeNode)) {
      return null;
    }

    const unionTypes = typeNode.getTypeNodes();

    // Check if this is a string literal union (e.g., "primary" | "secondary" | "tertiary")
    const isStringLiteralUnion = unionTypes.every(
      (unionType) =>
        Node.isLiteralTypeNode(unionType) &&
        unionType.getLiteral().getKind() === SyntaxKind.StringLiteral,
    );

    if (isStringLiteralUnion) {
      // For string literal unions, create a single string property
      return {
        type: "string",
        kind: "terminal",
        name,
        typeAsString: typeNode.getText(),
        ...(options.isArray ? { isArray: true } : {}),
        ...(options.isOptional ? { isOptional: true } : {}),
      };
    }

    const elements: PropertyInfo[] = [];

    // Analyze each union member
    for (const unionType of unionTypes) {
      const element = this.typeAnalyzer.analyze({
        name: "", // Union elements don't have names
        typeNode: unionType,
        context,
        options: {
          ...options,
          // Union elements inherit array status but not names
          isArray: false, // The union itself might be an array, not the elements
          // Pass through generic context
          ...(options.genericContext && {
            genericContext: options.genericContext,
          }),
        },
      });

      if (element) {
        // Remove the name from union elements since they don't have individual names
        const elementWithEmptyName = { ...element, name: "" };

        // If this union element is an object with empty properties, try to expand it
        if (isObjectProperty(element) && element.properties.length === 0) {
          const expandedElement = this.expandUnionElement({
            element,
            typeNode: unionType,
            context,
          });
          elements.push(
            expandedElement
              ? { ...expandedElement, name: "" }
              : elementWithEmptyName,
          );
        } else {
          elements.push(elementWithEmptyName);
        }
      }
    }

    // If no elements were successfully analyzed, return null
    if (elements.length === 0) {
      return null;
    }

    const unionProperty: UnionProperty = {
      kind: "non-terminal",
      type: "union",
      typeAsString: typeNode.getText(),
      name,
      ...(options.isArray ? { isArray: true } : {}),
      ...(options.isOptional ? { isOptional: true } : {}),
      elements,
    };

    return unionProperty;
  }

  /**
   * Expand a union element that is an object with empty properties.
   * Similar to ReferenceAnalyzer's expandObjectProperty but for union elements.
   */
  private expandUnionElement({
    element,
    typeNode,
    context,
  }: {
    element: ObjectProperty;
    typeNode: TypeNode;
    context: ExtractorContext;
  }): ObjectProperty | null {
    const typeChecker = context.getProject().getTypeChecker();
    const type = typeChecker.getTypeAtLocation(typeNode);
    const symbol = type?.getSymbol();

    if (!symbol) {
      return null;
    }

    const declaration = symbol.getDeclarations()?.[0];
    if (!declaration) {
      return null;
    }

    // Handle type aliases
    if (Node.isTypeAliasDeclaration(declaration)) {
      return this.expandTypeAliasForUnion(
        declaration,
        element,
        context,
        new SymbolResolver(context),
      );
    }

    // Handle interfaces
    if (Node.isInterfaceDeclaration(declaration)) {
      const expandedProperties = this.extractInterfacePropertiesForUnion(
        declaration,
        context,
      );
      return {
        ...element,
        properties: expandedProperties,
      };
    }

    return null;
  }

  /** Expand a type alias for union element. */
  private expandTypeAliasForUnion(
    declaration: TypeAliasDeclaration,
    element: ObjectProperty,
    context: ExtractorContext,
    symbolResolver: SymbolResolver,
  ): ObjectProperty | null {
    // Check if it's a primitive type alias
    if (symbolResolver.isPrimitiveTypeAlias(declaration)) {
      const primitiveType =
        symbolResolver.getPrimitiveFromTypeAlias(declaration);
      if (primitiveType) {
        return {
          ...element,
          properties: [
            {
              kind: "terminal",
              type: primitiveType,
              name: "value",
              typeAsString: primitiveType,
            } as PropertyInfo,
          ],
        };
      }
    }

    // For complex type aliases, analyze the underlying type
    const typeNode = declaration.getTypeNode();
    if (typeNode) {
      const analyzedProperty = this.typeAnalyzer.analyze({
        name: element.name,
        typeNode,
        context,
        options: {
          isOptional: element.isOptional ?? false,
          isArray: element.isArray ?? false,
        },
      });

      if (analyzedProperty && isObjectProperty(analyzedProperty)) {
        return analyzedProperty;
      }
    }

    return null;
  }

  /** Extract properties from interface for union element. */
  private extractInterfacePropertiesForUnion(
    interfaceDecl: InterfaceDeclaration,
    context: ExtractorContext,
  ): PropertyInfo[] {
    const typeName = interfaceDecl.getName();

    // Prevent circular dependencies
    if (!context.enterCircularCheck(typeName)) {
      return [];
    }

    try {
      const properties: PropertyInfo[] = [];

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

      return properties;
    } finally {
      context.exitCircularCheck(typeName);
    }
  }
}
