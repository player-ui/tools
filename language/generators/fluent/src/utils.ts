import type {
  NodeType,
  ObjectType,
  ArrayType,
  StringType,
  NumberType,
  BooleanType,
} from "@player-tools/xlr";

import {
  isStringType,
  isNumberType,
  isBooleanType,
  isObjectType,
  isArrayType,
  isRefType,
  isOrType,
  isAndType,
  isRecordType,
  isNamedType,
} from "@player-tools/xlr-utils";

// Re-export type guards from xlr-utils for consumers
export {
  isStringType,
  isNumberType,
  isBooleanType,
  isObjectType,
  isArrayType,
  isRefType,
  isOrType,
  isAndType,
  isRecordType,
  isNamedType,
};

/**
 * Check if a primitive type has a const value (literal type)
 */
export function isPrimitiveConst(
  node: NodeType,
): node is (StringType | NumberType | BooleanType) & { const: unknown } {
  return (
    (isStringType(node) || isNumberType(node) || isBooleanType(node)) &&
    "const" in node &&
    node.const !== undefined
  );
}

/**
 * Check if a ref type is an AssetWrapper
 */
export function isAssetWrapperRef(node: NodeType): boolean {
  return isRefType(node) && node.ref.startsWith("AssetWrapper");
}

/**
 * Check if a ref type is an Expression
 */
export function isExpressionRef(node: NodeType): boolean {
  return isRefType(node) && node.ref === "Expression";
}

/**
 * Check if a ref type is a Binding
 */
export function isBindingRef(node: NodeType): boolean {
  return isRefType(node) && node.ref === "Binding";
}

/**
 * Sanitize a property name by removing surrounding quotes.
 * TypeScript allows quoted property names like "mime-type" which may
 * end up in XLR with quotes preserved.
 *
 * @example
 * sanitizePropertyName("'mime-type'")  // "mime-type"
 * sanitizePropertyName('"content-type"') // "content-type"
 * sanitizePropertyName("normalProp")   // "normalProp"
 */
export function sanitizePropertyName(name: string): string {
  return name.replace(/^['"]|['"]$/g, "");
}

/**
 * Convert a property name to PascalCase for method names.
 * Handles camelCase, kebab-case, snake_case inputs, and quoted property names.
 *
 * @example
 * toPascalCase("myProperty")  // "MyProperty"
 * toPascalCase("my-property") // "MyProperty"
 * toPascalCase("my_property") // "MyProperty"
 * toPascalCase("'mime-type'") // "MimeType"
 */
export function toPascalCase(str: string): string {
  // First sanitize any quotes that may have been preserved from TypeScript source
  const sanitized = sanitizePropertyName(str);

  return sanitized
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/**
 * Convert a type name to a factory function name (camelCase)
 */
export function toFactoryName(typeName: string): string {
  // Remove "Asset" suffix if present
  const name = typeName.replace(/Asset$/, "");
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/**
 * Convert a type name to a builder class name
 */
export function toBuilderClassName(typeName: string): string {
  return `${typeName}Builder`;
}

/**
 * Check if an object type is complex enough to warrant its own builder class
 */
export function isComplexObjectType(obj: ObjectType): boolean {
  const props = Object.values(obj.properties);

  // Has AssetWrapper properties
  const hasSlots = props.some((p) => isAssetWrapperRef(p.node));
  if (hasSlots) return true;

  // Has many properties
  if (props.length > 3) return true;

  // Has nested objects
  const hasNestedObjects = props.some(
    (p) => isObjectType(p.node) && !isPrimitiveConst(p.node),
  );
  if (hasNestedObjects) return true;

  return false;
}

/**
 * Get the asset type string from extends ref
 */
export function getAssetTypeFromExtends(obj: ObjectType): string | undefined {
  if (!obj.extends) return undefined;

  const ref = obj.extends;
  if (ref.genericArguments && ref.genericArguments.length > 0) {
    const typeArg = ref.genericArguments[0];
    if (isStringType(typeArg) && typeArg.const) {
      return typeArg.const;
    }
  }
  return undefined;
}

/**
 * Information about a property for code generation
 */
export interface PropertyInfo {
  name: string;
  node: NodeType;
  required: boolean;
  isSlot: boolean;
  isArraySlot: boolean;
  isArray: boolean;
}

/**
 * Extract property information from an ObjectType
 */
export function getPropertiesInfo(obj: ObjectType): PropertyInfo[] {
  return Object.entries(obj.properties).map(([name, prop]) => {
    const isSlot = isAssetWrapperRef(prop.node);
    const isArray = isArrayType(prop.node);
    const isArraySlot =
      isArray && isAssetWrapperRef((prop.node as ArrayType).elementType);

    return {
      name,
      node: prop.node,
      required: prop.required,
      isSlot,
      isArraySlot,
      isArray,
    };
  });
}

/**
 * Check if a type contains an array type (directly or within a union/intersection)
 * This handles cases like `Array<T> | T` where the property can be either
 */
export function containsArrayType(node: NodeType): boolean {
  if (isArrayType(node)) {
    return true;
  }

  if (isOrType(node)) {
    return node.or.some(containsArrayType);
  }

  if (isAndType(node)) {
    return node.and.some(containsArrayType);
  }

  return false;
}

/**
 * Split a string by commas, but only at the top level (ignoring commas inside angle brackets).
 * This is needed for parsing generic parameter lists like "T extends Foo<A, B>, U = Bar<C, D>"
 *
 * @example
 * splitAtTopLevelCommas("T extends Foo, U = Bar") // ["T extends Foo", "U = Bar"]
 * splitAtTopLevelCommas("T extends Foo<A, B>, U") // ["T extends Foo<A, B>", "U"]
 */
export function splitAtTopLevelCommas(str: string): string[] {
  const result: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of str) {
    if (char === "<") {
      depth++;
      current += char;
    } else if (char === ">") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    result.push(current.trim());
  }

  return result;
}

/**
 * Extract generic usage string from generic params declaration
 * Converts "T extends Foo, U = Bar" to "<T, U>"
 * Handles nested generics like "T extends Foo<A, B>, U = Bar<C, D>" correctly
 */
export function extractGenericUsage(genericParams: string | undefined): string {
  if (!genericParams) {
    return "";
  }

  const params = splitAtTopLevelCommas(genericParams)
    .map((p) => p.trim().split(" ")[0])
    .join(", ");

  return `<${params}>`;
}
