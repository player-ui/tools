import ts from "typescript";
import type {
  NamedType,
  NamedTypeWithGenerics,
  NodeType,
  NodeTypeWithGenerics,
  PrimitiveTypes,
} from "@player-tools/xlr";

/**
 * Returns if the Object Property is optional
 */
export function isOptionalProperty(node: ts.PropertySignature): boolean {
  return node.questionToken?.kind === ts.SyntaxKind.QuestionToken;
}

/**
 * Returns if the node is an Interface or Type with Generics
 */
export function isGenericInterfaceDeclaration(
  node: ts.InterfaceDeclaration,
): boolean {
  const length = node.typeParameters?.length;
  return length ? length > 0 : false;
}

/**
 * Returns if the node is an Type Declaration with Generics
 */
export function isGenericTypeDeclaration(
  node: ts.TypeAliasDeclaration,
): boolean {
  const length = node.typeParameters?.length;
  return length ? length > 0 : false;
}

/**
 * Returns if the referenced type is a generic
 */
export function isTypeReferenceGeneric(
  node: ts.TypeReferenceNode,
  typeChecker: ts.TypeChecker,
): boolean {
  const symbol = typeChecker.getSymbolAtLocation(node.typeName);
  if (symbol && symbol.declarations) {
    return symbol.declarations[0].kind === ts.SyntaxKind.TypeParameter;
  }

  return false;
}

export type TopLevelDeclaration =
  | ts.InterfaceDeclaration
  | ts.TypeAliasDeclaration;

/**
 * Returns if the node is an interface or a type declaration
 */
export function isTopLevelDeclaration(
  node: ts.Node,
): node is TopLevelDeclaration {
  return (
    node.kind === ts.SyntaxKind.InterfaceDeclaration ||
    node.kind === ts.SyntaxKind.TypeAliasDeclaration
  );
}

export type TopLevelNode = TopLevelDeclaration | ts.VariableStatement;

/**
 * Returns if the node is an interface or a type declaration
 */
export function isTopLevelNode(node: ts.Node): node is TopLevelNode {
  return (
    node.kind === ts.SyntaxKind.InterfaceDeclaration ||
    node.kind === ts.SyntaxKind.TypeAliasDeclaration ||
    node.kind === ts.SyntaxKind.VariableStatement
  );
}

/**
 * Returns if the NodeType has generic tokens
 */
export function isGenericNodeType<T extends NodeType = NodeType>(
  nt: NodeType,
): nt is NodeTypeWithGenerics<T> {
  return (nt as NodeTypeWithGenerics).genericTokens?.length > 0;
}

/**
 * Returns if the named type has generic tokens
 */
export function isGenericNamedType<T extends NamedType = NamedType>(
  nt: NodeType,
): nt is NamedTypeWithGenerics<T> {
  return (nt as NamedTypeWithGenerics).genericTokens?.length > 0;
}

/**
 * Returns if the node is a `PrimitiveTypes`
 */
export function isPrimitiveTypeNode(node: NodeType): node is PrimitiveTypes {
  return (
    node.type === "string" ||
    node.type === "number" ||
    node.type === "boolean" ||
    node.type === "null" ||
    node.type === "any" ||
    node.type === "never" ||
    node.type === "undefined" ||
    node.type === "unknown" ||
    node.type === "void"
  );
}

/**
 * Type Guard for non-null values
 */
export function isNonNullable<T>(a: T | null | undefined): a is NonNullable<T> {
  return a !== null || a !== undefined;
}
