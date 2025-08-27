import {
  Node,
  TypeNode,
  TypeReferenceNode,
  InterfaceDeclaration,
  TypeAliasDeclaration,
} from "ts-morph";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import { ARRAY_TYPE_NAMES, UTILITY_TYPES } from "./TypeGuards.js";

/**
 * Extract string literal values from a union type or single literal.
 */
export function extractStringLiteralUnion(typeNode: TypeNode): string[] {
  const literals: string[] = [];

  if (Node.isUnionTypeNode(typeNode)) {
    for (const unionType of typeNode.getTypeNodes()) {
      if (Node.isLiteralTypeNode(unionType)) {
        const literal = unionType.getLiteral();
        if (Node.isStringLiteral(literal)) {
          literals.push(literal.getLiteralValue());
        }
      }
    }
  } else if (Node.isLiteralTypeNode(typeNode)) {
    const literal = typeNode.getLiteral();
    if (Node.isStringLiteral(literal)) {
      literals.push(literal.getLiteralValue());
    }
  }

  return literals;
}

/**
 * Find an interface declaration from a type node.
 */
export function findInterfaceFromTypeNode(
  typeNode: TypeNode,
  context: ExtractorContext,
): {
  declaration: InterfaceDeclaration;
  target:
    | { kind: "local"; filePath: string; name: string }
    | { kind: "module"; name: string };
} | null {
  if (!Node.isTypeReference(typeNode)) {
    return null;
  }

  const typeName = getTypeReferenceName(typeNode);
  const project = context.getProject();
  const sourceFile = context.getSourceFile();

  // Check current file first
  const localInterface = sourceFile
    .getInterfaces()
    .find((iface) => iface.getName() === typeName);
  if (localInterface) {
    return {
      declaration: localInterface,
      target: {
        kind: "local",
        filePath: sourceFile.getFilePath(),
        name: typeName,
      },
    };
  }

  // Search all project files
  for (const file of project.getSourceFiles()) {
    const interfaceDecl = file
      .getInterfaces()
      .find((iface) => iface.getName() === typeName);
    if (interfaceDecl) {
      return {
        declaration: interfaceDecl,
        target: { kind: "local", filePath: file.getFilePath(), name: typeName },
      };
    }
  }

  return null;
}

/**
 * Safely get the type name from a type reference node.
 */
export function getTypeReferenceName(typeNode: TypeReferenceNode): string {
  try {
    return typeNode.getTypeName().getText();
  } catch {
    return "";
  }
}

/**
 * Extract type arguments from a type reference node.
 */
export function parseTypeArguments(typeNode: TypeReferenceNode): TypeNode[] {
  try {
    return typeNode.getTypeArguments();
  } catch {
    return [];
  }
}

/**
 * Get generic type parameter names from a declaration.
 */
export function getGenericTypeParameters(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
): string[] {
  try {
    return declaration.getTypeParameters().map((param: any) => param.getName());
  } catch {
    return [];
  }
}

/**
 * Get the constraint or default type for a generic type parameter.
 * For example, in `T extends Asset = Asset`, returns the constraint `Asset`.
 */
export function getTypeParameterConstraintOrDefault(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
  parameterName: string,
): TypeNode | null {
  try {
    const typeParameters = declaration.getTypeParameters();
    const param = typeParameters.find(
      (p: any) => p.getName() === parameterName,
    );

    if (!param) return null;

    // Try default first, then constraint
    return param.getDefault() || param.getConstraint() || null;
  } catch {
    return null;
  }
}

/**
 * Handle nested utility type wrappers like Required<NonNullable<T>>.
 */
export function unwrapUtilityTypes(
  typeNode: TypeNode,
  wrapperTypes: string[] = [...UTILITY_TYPES],
): TypeNode {
  let currentType = typeNode;

  while (Node.isTypeReference(currentType)) {
    const typeName = getTypeReferenceName(currentType);

    if (wrapperTypes.includes(typeName)) {
      const typeArgs = currentType.getTypeArguments();
      if (typeArgs.length === 1) {
        currentType = typeArgs[0]!;
        continue;
      }
    }
    break;
  }

  return currentType;
}

/**
 * Check if a type node represents an array type (either T[] or Array<T>).
 */
export function isArrayType(typeNode: TypeNode): boolean {
  if (Node.isArrayTypeNode(typeNode)) {
    return true;
  }

  if (Node.isTypeReference(typeNode)) {
    const typeName = getTypeReferenceName(typeNode);
    return ARRAY_TYPE_NAMES.includes(typeName as any);
  }

  return false;
}

/**
 * Resolve generic parameters to their default types for interfaces without explicit type arguments.
 * Returns a map of generic parameter names to their default TypeNode values.
 */
export function resolveGenericParametersToDefaults(
  declaration: InterfaceDeclaration | TypeAliasDeclaration,
): Map<string, TypeNode> {
  const substitutions = new Map<string, TypeNode>();

  try {
    const typeParameters = declaration.getTypeParameters();

    for (const param of typeParameters) {
      const paramName = param.getName();

      // Try to get the default value first, then fall back to constraint
      const defaultType = param.getDefault() || param.getConstraint();

      if (defaultType) {
        substitutions.set(paramName, defaultType);
      }
    }
  } catch (error) {
    // If anything fails, return empty map to avoid breaking analysis
    console.warn(`Error resolving generic parameter defaults:`, error);
    return new Map();
  }

  return substitutions;
}

/**
 * Get the element type from an array type.
 */
export function getArrayElementType(typeNode: TypeNode): TypeNode | null {
  if (Node.isArrayTypeNode(typeNode)) {
    return typeNode.getElementTypeNode();
  }

  if (Node.isTypeReference(typeNode)) {
    const typeName = getTypeReferenceName(typeNode);
    if (ARRAY_TYPE_NAMES.includes(typeName as any)) {
      const typeArgs = typeNode.getTypeArguments();
      return typeArgs.length > 0 ? typeArgs[0]! : null;
    }
  }

  return null;
}
