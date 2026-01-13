import type {
  NodeType,
  ObjectType,
  ArrayType,
  RefType,
  OrType,
  AndType,
  StringType,
  NumberType,
  BooleanType,
  NamedType,
  RecordType,
} from "@player-tools/xlr";

/**
 * Type guard for string type nodes
 */
export function isStringType(node: NodeType): node is StringType {
  return node.type === "string";
}

/**
 * Type guard for number type nodes
 */
export function isNumberType(node: NodeType): node is NumberType {
  return node.type === "number";
}

/**
 * Type guard for boolean type nodes
 */
export function isBooleanType(node: NodeType): node is BooleanType {
  return node.type === "boolean";
}

/**
 * Type guard for object type nodes
 */
export function isObjectType(node: NodeType): node is ObjectType {
  return node.type === "object";
}

/**
 * Type guard for array type nodes
 */
export function isArrayType(node: NodeType): node is ArrayType {
  return node.type === "array";
}

/**
 * Type guard for ref type nodes
 */
export function isRefType(node: NodeType): node is RefType {
  return node.type === "ref";
}

/**
 * Type guard for or (union) type nodes
 */
export function isOrType(node: NodeType): node is OrType {
  return node.type === "or";
}

/**
 * Type guard for and (intersection) type nodes
 */
export function isAndType(node: NodeType): node is AndType {
  return node.type === "and";
}

/**
 * Type guard for record type nodes
 */
export function isRecordType(node: NodeType): node is RecordType {
  return node.type === "record";
}

/**
 * Type guard for named types (have name and source)
 */
export function isNamedType<T extends NodeType = NodeType>(
  node: NodeType,
): node is NamedType<T> {
  return "name" in node && "source" in node && typeof node.name === "string";
}

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
 * Convert a property name to PascalCase for method names
 */
export function toPascalCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
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
 * Extract generic usage string from generic params declaration
 * Converts "T extends Foo, U = Bar" to "<T, U>"
 */
export function extractGenericUsage(genericParams: string | undefined): string {
  if (!genericParams) {
    return "";
  }

  const params = genericParams
    .split(",")
    .map((p) => p.trim().split(" ")[0])
    .join(", ");

  return `<${params}>`;
}
