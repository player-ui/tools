import { Node, TypeNode, TypeAliasDeclaration, SyntaxKind } from "ts-morph";
import type { TypeMetadata } from "../../types.js";

export class TypeAnalyzer {
  private static readonly UTILITY_TYPES = new Set([
    "Pick",
    "Omit",
    "Partial",
    "Required",
    "NonNullable",
    "Readonly",
    "Record",
    "Exclude",
    "Extract",
    "ReturnType",
  ]);

  /** Extract the base type name using ts-morph type guards */
  static getBaseTypeName(typeNode: TypeNode): string {
    if (Node.isTypeReference(typeNode)) {
      const typeName = typeNode.getTypeName();
      if (Node.isIdentifier(typeName)) {
        return typeName.getText();
      } else if (Node.isQualifiedName(typeName)) {
        return typeName.getRight().getText();
      }
    }

    if (Node.isTypeQuery(typeNode)) {
      const exprName = typeNode.getExprName();
      return Node.isIdentifier(exprName)
        ? exprName.getText()
        : exprName.getText();
    }

    // For primitive types and other simple cases
    return typeNode.getText().split("<")[0] || typeNode.getText();
  }

  /** Extract generic type arguments using ts-morph methods */
  static extractGenericArguments(typeNode: TypeNode): string[] {
    if (Node.isTypeReference(typeNode)) {
      return typeNode.getTypeArguments().map((arg) => arg.getText());
    }
    return [];
  }

  /** Check if a type node has generic parameters */
  static isGenericType(typeNode: TypeNode): boolean {
    return (
      Node.isTypeReference(typeNode) && typeNode.getTypeArguments().length > 0
    );
  }

  /** Get generic arguments from a type node */
  static getGenericArgumentsFromNode(typeNode: TypeNode): string[] {
    return this.extractGenericArguments(typeNode);
  }

  /** Check if a type is a utility type using ts-morph */
  static isUtilityType(typeNode: TypeNode): boolean {
    const baseType = this.getBaseTypeName(typeNode);
    return this.UTILITY_TYPES.has(baseType);
  }

  static isKeyword(node: Node): boolean {
    const checkers = [
      Node.isAnyKeyword,
      Node.isUndefinedKeyword,
      Node.isInferKeyword,
      Node.isNeverKeyword,
      Node.isNumberKeyword,
      Node.isObjectKeyword,
      Node.isStringKeyword,
      Node.isSymbolKeyword,
      Node.isBooleanKeyword,
    ];
    return checkers.some((checker) => checker(node));
  }

  /** Check if a type is primitive using ts-morph type guards */
  static isPrimitiveType(typeNode: TypeNode): boolean {
    if (this.isKeyword(typeNode)) {
      const kind = typeNode.getKind();
      return [
        SyntaxKind.StringKeyword,
        SyntaxKind.NumberKeyword,
        SyntaxKind.BooleanKeyword,
        SyntaxKind.SymbolKeyword,
        SyntaxKind.BigIntKeyword,
        SyntaxKind.AnyKeyword,
        SyntaxKind.UnknownKeyword,
        SyntaxKind.VoidKeyword,
        SyntaxKind.NeverKeyword,
        SyntaxKind.UndefinedKeyword,
      ].includes(kind);
    }

    // Check for literal types
    if (Node.isLiteralTypeNode(typeNode)) {
      return true;
    }

    // Check for null type
    if (typeNode.getKind() === SyntaxKind.NullKeyword) {
      return true;
    }

    return false;
  }

  /** Get comprehensive metadata about a type */
  static getTypeMetadata(typeNode: TypeNode): TypeMetadata {
    const metadata: TypeMetadata = {};

    if (this.isUtilityType(typeNode)) {
      metadata.isUtilityType = true;
    }

    metadata.baseType = this.getBaseTypeName(typeNode);

    if (this.isGenericType(typeNode)) {
      metadata.isGeneric = true;
      metadata.genericArgs = this.getGenericArgumentsFromNode(typeNode);
    }

    return metadata;
  }

  /** Check if a type alias resolves to a primitive type */
  static isPrimitiveTypeAlias(declaration: TypeAliasDeclaration): boolean {
    const typeNode = declaration.getTypeNode();
    if (!typeNode) return false;

    return this.isPrimitiveType(typeNode);
  }

  /** Get the primitive type from a type alias using ts-morph type guards */
  static getPrimitiveFromTypeAlias(
    declaration: TypeAliasDeclaration,
  ): "string" | "number" | "boolean" | null {
    if (!this.isPrimitiveTypeAlias(declaration)) return null;

    const typeNode = declaration.getTypeNode();
    if (!typeNode) return null;

    if (this.isKeyword(typeNode)) {
      const kind = typeNode.getKind();
      switch (kind) {
        case SyntaxKind.StringKeyword:
          return "string";
        case SyntaxKind.NumberKeyword:
          return "number";
        case SyntaxKind.BooleanKeyword:
          return "boolean";
        default:
          return null;
      }
    }

    // Handle literal types
    if (Node.isLiteralTypeNode(typeNode)) {
      const literal = typeNode.getLiteral();

      if (Node.isStringLiteral(literal)) {
        return "string";
      }

      if (Node.isNumericLiteral(literal) || Node.isBigIntLiteral(literal)) {
        return "number";
      }

      // Check for boolean literals using syntax kind
      const kind = literal.getKind();
      if (kind === SyntaxKind.TrueKeyword || kind === SyntaxKind.FalseKeyword) {
        return "boolean";
      }
    }

    return null;
  }
}
