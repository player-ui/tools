import { Node, TypeNode, TypeReferenceNode, ImportDeclaration } from "ts-morph";

/** Common type names for consistent usage */
export const ARRAY_TYPE_NAMES = ["Array", "ReadonlyArray"] as const;

export const PRIMITIVE_TYPES = [
  "string",
  "number",
  "boolean",
  "bigint",
  "symbol",
  "undefined",
  "null",
  "void",
] as const;

export const UTILITY_TYPES = [
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Exclude",
  "Extract",
  "NonNullable",
  "Parameters",
  "ConstructorParameters",
  "ReturnType",
  "InstanceType",
  "Record",
  "ThisType",
] as const;

/** Enhanced type guards for ts-morph nodes with better type safety. */
export class TypeGuards {
  /** Check if a type node is a type reference node. */
  static isTypeReference(typeNode: TypeNode): typeNode is TypeReferenceNode {
    return Node.isTypeReference(typeNode);
  }

  /** Safely get the type name from a type reference node. */
  static getTypeName(typeNode: TypeReferenceNode): string {
    try {
      return typeNode.getTypeName().getText();
    } catch {
      return "";
    }
  }

  /** Check if a type reference represents an array type. */
  static isArrayTypeReference(typeNode: TypeReferenceNode): boolean {
    const typeName = this.getTypeName(typeNode);
    return ARRAY_TYPE_NAMES.includes(typeName as any);
  }

  /**
   * Check if a type name looks like a generic type parameter.
   * Generic parameters typically start with uppercase and are single letters or PascalCase.
   */
  static looksLikeGenericParameter(typeName: string): boolean {
    // Single uppercase letter (T, U, V, etc.)
    if (/^[A-Z]$/.test(typeName)) {
      return true;
    }
    // PascalCase with reasonable length for generic parameters
    if (/^[A-Z][A-Za-z0-9]*$/.test(typeName) && typeName.length <= 15) {
      return true;
    }
    return false;
  }

  /** Check if an import declaration contains a specific symbol. */
  static importContainsSymbol(
    importDecl: ImportDeclaration,
    symbolName: string,
  ): boolean {
    try {
      // Check default import
      const defaultImport = importDecl.getDefaultImport();
      if (defaultImport?.getText() === symbolName) {
        return true;
      }

      // Check named imports
      const namedImports = importDecl.getNamedImports();
      return namedImports.some((namedImport) => {
        const name = namedImport.getName();
        const alias = namedImport.getAliasNode()?.getText();
        return name === symbolName || alias === symbolName;
      });
    } catch {
      return false;
    }
  }

  /** Check if a module specifier represents a relative import. */
  static isRelativeImport(moduleSpecifier: string): boolean {
    return moduleSpecifier.startsWith(".") || moduleSpecifier.startsWith("/");
  }

  /** Check if a module specifier represents a built-in or external package import. */
  static isExternalImport(moduleSpecifier: string): boolean {
    return !this.isRelativeImport(moduleSpecifier);
  }

  /** Safely extract type arguments from a type reference. */
  static getTypeArguments(typeNode: TypeReferenceNode): TypeNode[] {
    try {
      return typeNode.getTypeArguments();
    } catch {
      return [];
    }
  }

  /** Check if a type node has generic type arguments. */
  static hasTypeArguments(typeNode: TypeReferenceNode): boolean {
    return this.getTypeArguments(typeNode).length > 0;
  }

  /** Extract the base type name from a generic type (e.g., "Array" from "Array<string>"). */
  static getBaseTypeName(typeAsString: string): string {
    const genericStart = typeAsString.indexOf("<");
    return genericStart > 0
      ? typeAsString.substring(0, genericStart).trim()
      : typeAsString.trim();
  }

  /** Check if a type string represents a primitive type. */
  static isPrimitiveType(typeString: string): boolean {
    return PRIMITIVE_TYPES.includes(typeString as any);
  }

  /** Check if a type string represents a utility type. */
  static isUtilityType(typeName: string): boolean {
    return UTILITY_TYPES.includes(typeName as any);
  }
}
