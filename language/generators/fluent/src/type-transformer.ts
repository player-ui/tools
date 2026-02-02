import type { NodeType, ObjectType, RefType } from "@player-tools/xlr";
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
  isTupleType,
  isPrimitiveConst,
  isBuiltinType,
  extractBaseName,
  parseNamespacedType,
} from "./utils";

/**
 * Interface for tracking Asset import needs and namespace mappings.
 */
export interface TypeTransformContext {
  /** Set to true when Asset type needs to be imported */
  setNeedsAssetImport(value: boolean): void;
  /** Get the current Asset import need state */
  getNeedsAssetImport(): boolean;
  /** Track a referenced type for import */
  trackReferencedType(typeName: string): void;
  /** Track a namespace import */
  trackNamespaceImport(namespaceName: string): void;
  /** Get the namespace member map for type resolution */
  getNamespaceMemberMap(): Map<string, string>;
  /** Get the generic parameter symbols */
  getGenericParamSymbols(): Set<string>;
  /** Get the AssetWrapper ancestor's RefType for a type extending AssetWrapper (via registry) */
  getAssetWrapperExtendsRef(typeName: string): RefType | undefined;
}

/**
 * Transforms XLR types to TypeScript type strings.
 */
export class TypeTransformer {
  private readonly context: TypeTransformContext;

  constructor(context: TypeTransformContext) {
    this.context = context;
  }

  /**
   * Determines if a type name should be tracked for import.
   * A type should be tracked if it's not a generic parameter and not a builtin type.
   * Note: PLAYER_BUILTINS (Asset, AssetWrapper, Binding, Expression) are filtered
   * by isBuiltinType(), so no explicit Asset check is needed here.
   */
  private shouldTrackTypeForImport(typeName: string): boolean {
    return (
      !this.context.getGenericParamSymbols().has(typeName) &&
      !isBuiltinType(typeName)
    );
  }

  /**
   * Transform an XLR type to a TypeScript type string.
   * This is the core recursive transformation that adds TaggedTemplateValue support.
   */
  transformType(node: NodeType, forParameter = false): string {
    // Primitive types get TaggedTemplateValue support
    if (isStringType(node)) {
      if (isPrimitiveConst(node)) {
        return `"${node.const}"`;
      }
      return forParameter ? "string | TaggedTemplateValue<string>" : "string";
    }

    if (isNumberType(node)) {
      if (isPrimitiveConst(node)) {
        return `${node.const}`;
      }
      return forParameter ? "number | TaggedTemplateValue<number>" : "number";
    }

    if (isBooleanType(node)) {
      if (isPrimitiveConst(node)) {
        return `${node.const}`;
      }
      return forParameter
        ? "boolean | TaggedTemplateValue<boolean>"
        : "boolean";
    }

    // Reference types
    if (isRefType(node)) {
      return this.transformRefType(node, forParameter);
    }

    // Array types
    if (isArrayType(node)) {
      const elementType = this.transformType(node.elementType, forParameter);
      return `Array<${elementType}>`;
    }

    // Union types
    if (isOrType(node)) {
      const variants = node.or.map((v) => this.transformType(v, forParameter));
      return variants.join(" | ");
    }

    // Intersection types
    if (isAndType(node)) {
      const parts = node.and.map((p) => this.transformType(p, forParameter));
      return parts.join(" & ");
    }

    // Record types - key type should NOT have TaggedTemplateValue since
    // TypeScript Record keys can only be string | number | symbol
    if (isRecordType(node)) {
      const keyType = this.transformType(node.keyType, false);
      const valueType = this.transformType(node.valueType, forParameter);
      return `Record<${keyType}, ${valueType}>`;
    }

    // Object types - transform properties recursively
    // Any nested object can accept either a raw object OR a FluentBuilder that produces it
    if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Resolve to full qualified name if it's a namespace member
        const typeName = this.resolveTypeName(node.name);

        // Check if this named type extends AssetWrapper:
        // 1. Inline ObjectType with extends field directly pointing to AssetWrapper
        // 2. Transitive extension via registry (e.g., ListItem → ListItemBase → AssetWrapper)
        const inlineExtendsRef = node.extends?.ref.startsWith("AssetWrapper")
          ? node.extends
          : null;
        const extendsRef =
          inlineExtendsRef ?? this.context.getAssetWrapperExtendsRef(node.name);

        if (extendsRef) {
          return this.transformAssetWrapperExtension(
            typeName,
            node.name,
            extendsRef,
          );
        }

        // Named type - accept raw type, a builder that produces it, or a partial with nested builders
        return `${typeName} | FluentBuilder<${typeName}, BaseBuildContext> | FluentPartial<${typeName}, BaseBuildContext>`;
      }

      // Anonymous object - accept inline type, a builder that produces it, or a partial with nested builders
      const inlineType = this.generateInlineObjectType(node, forParameter);
      return `${inlineType} | FluentBuilder<${inlineType}, BaseBuildContext> | FluentPartial<${inlineType}, BaseBuildContext>`;
    }

    // Tuple types - transform to TypeScript tuple syntax [T1, T2, ...]
    if (isTupleType(node)) {
      const elements = node.elementTypes.map((member) => {
        const elementType = this.transformType(member.type, forParameter);
        return member.optional ? `${elementType}?` : elementType;
      });

      // Handle rest elements (additionalItems)
      // additionalItems is either false or a NodeType; truthy check suffices
      if (node.additionalItems) {
        const restType = this.transformType(node.additionalItems, forParameter);
        elements.push(`...${restType}[]`);
      }

      return `[${elements.join(", ")}]`;
    }

    // Handle other primitive types
    if (node.type === "null") return "null";
    if (node.type === "undefined") return "undefined";
    if (node.type === "any") return "any";
    if (node.type === "unknown") return "unknown";
    if (node.type === "never") return "never";
    if (node.type === "void") return "void";

    // Default fallback
    return "unknown";
  }

  /**
   * Transform a type for use in generic constraints and defaults.
   * Unlike transformType(), this returns raw type names without FluentBuilder unions,
   * since constraints define type bounds, not parameter types that accept builders.
   *
   * @param node - The type node to transform
   * @returns The raw TypeScript type string
   */
  transformTypeForConstraint(node: NodeType): string {
    if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);

      // Check if this is a namespaced type (e.g., "Validation.CrossfieldReference")
      const namespaced = parseNamespacedType(baseName);
      if (namespaced) {
        // Track the namespace for import and the member mapping
        this.context.trackNamespaceImport(namespaced.namespace);
        this.context.getNamespaceMemberMap().set(namespaced.member, baseName);
      } else if (baseName === "Asset" || node.ref.startsWith("Asset<")) {
        // Track Asset import when used in generic constraints
        this.context.setNeedsAssetImport(true);
      } else if (this.shouldTrackTypeForImport(baseName)) {
        this.context.trackReferencedType(baseName);
      }

      // Resolve to full qualified name if it's a namespace member
      const resolvedName = this.resolveTypeName(baseName);

      // Handle generic arguments
      if (node.genericArguments && node.genericArguments.length > 0) {
        const args = node.genericArguments.map((a) =>
          this.transformTypeForConstraint(a),
        );
        return `${resolvedName}<${args.join(", ")}>`;
      }

      // Preserve embedded generics if present in the ref string
      if (node.ref.includes("<")) {
        // Also resolve the base name in case it's a namespace member
        return (
          this.resolveTypeName(extractBaseName(node.ref)) +
          node.ref.substring(node.ref.indexOf("<"))
        );
      }

      return resolvedName;
    }

    if (isObjectType(node) && isNamedType(node)) {
      // Track Asset import if used in constraint
      if (node.name === "Asset") {
        this.context.setNeedsAssetImport(true);
      } else if (this.shouldTrackTypeForImport(node.name)) {
        this.context.trackReferencedType(node.name);
      }
      // Just the type name, no FluentBuilder union
      // Resolve to full qualified name if it's a namespace member
      return this.resolveTypeName(node.name);
    }

    if (isArrayType(node)) {
      const elementType = this.transformTypeForConstraint(node.elementType);
      return `Array<${elementType}>`;
    }

    if (isOrType(node)) {
      const variants = node.or.map((v) => this.transformTypeForConstraint(v));
      return variants.join(" | ");
    }

    if (isAndType(node)) {
      const parts = node.and.map((p) => this.transformTypeForConstraint(p));
      return parts.join(" & ");
    }

    // Tuple types - transform to TypeScript tuple syntax for constraints
    if (isTupleType(node)) {
      const elements = node.elementTypes.map((member) => {
        const elementType = this.transformTypeForConstraint(member.type);
        return member.optional ? `${elementType}?` : elementType;
      });

      // Handle rest elements (additionalItems)
      // additionalItems is either false or a NodeType; truthy check suffices
      if (node.additionalItems) {
        const restType = this.transformTypeForConstraint(node.additionalItems);
        elements.push(`...${restType}[]`);
      }

      return `[${elements.join(", ")}]`;
    }

    // For primitives, use standard transformation (no FluentBuilder needed anyway)
    return this.transformType(node, false);
  }

  /**
   * Transform a reference type to TypeScript.
   */
  private transformRefType(node: RefType, forParameter: boolean): string {
    const ref = node.ref;

    // AssetWrapper - transform to accept Asset or FluentBuilder
    // Preserves the generic type argument when present for better type safety
    if (ref.startsWith("AssetWrapper")) {
      this.context.setNeedsAssetImport(true);

      let innerType = "Asset";

      // Track whether we handled an intersection type (parts tracked separately)
      let isIntersectionType = false;

      // Check for structured generic arguments first
      if (node.genericArguments && node.genericArguments.length > 0) {
        const genericArg = node.genericArguments[0];
        // transformTypeForConstraint recursively tracks each part of intersection types
        const argType = this.transformTypeForConstraint(genericArg);

        // If it's a generic param (like AnyAsset), fall back to Asset
        innerType = this.context.getGenericParamSymbols().has(argType)
          ? "Asset"
          : argType;

        // Mark intersection types so we don't double-track the combined string
        isIntersectionType = isAndType(genericArg);
      } else if (ref.includes("<")) {
        // Handle embedded generics like "AssetWrapper<ImageAsset>" or "AssetWrapper<ImageAsset & Trackable>"
        const match = ref.match(/AssetWrapper<(.+)>/);
        if (match) {
          const extractedType = match[1].trim();

          // Check if the extracted type is an intersection (contains " & ")
          if (extractedType.includes(" & ")) {
            // Parse intersection parts and track each separately
            isIntersectionType = true;
            innerType = extractedType;

            const parts = extractedType.split(" & ").map((p) => p.trim());
            for (const part of parts) {
              const partName = extractBaseName(part);
              if (this.shouldTrackTypeForImport(partName)) {
                this.context.trackReferencedType(partName);
              }
            }
          } else {
            const baseName = extractBaseName(extractedType);
            innerType = this.context.getGenericParamSymbols().has(baseName)
              ? "Asset"
              : baseName;
          }
        }
      }

      // Track inner type for import if it's concrete and not Asset
      // Skip if it was an intersection type (parts already tracked above)
      if (!isIntersectionType && this.shouldTrackTypeForImport(innerType)) {
        this.context.trackReferencedType(innerType);
      }

      return `${innerType} | FluentBuilder<${innerType}, BaseBuildContext>`;
    }

    // Expression - allow TaggedTemplateValue
    if (ref === "Expression") {
      return forParameter ? "string | TaggedTemplateValue<string>" : "string";
    }

    // Binding - allow TaggedTemplateValue
    if (ref === "Binding") {
      return forParameter ? "string | TaggedTemplateValue<string>" : "string";
    }

    // Asset reference
    if (ref === "Asset" || ref.startsWith("Asset<")) {
      this.context.setNeedsAssetImport(true);
      return "Asset";
    }

    // Type that extends AssetWrapper (e.g., Header extends AssetWrapper<ImageAsset>)
    // Detected via registry-based transitive lookup
    {
      const refBaseName = extractBaseName(ref);
      const extendsRef = this.context.getAssetWrapperExtendsRef(refBaseName);
      if (extendsRef) {
        return this.transformAssetWrapperExtension(
          this.resolveTypeName(refBaseName),
          refBaseName,
          extendsRef,
        );
      }
    }

    // Other references - user-defined types that may be objects
    // Accept both raw type or FluentBuilder that produces it
    const baseName = extractBaseName(ref);
    // Resolve to full qualified name if it's a namespace member (e.g., "CrossfieldReference" -> "Validation.CrossfieldReference")
    const resolvedName = this.resolveTypeName(baseName);

    // Handle structured generic arguments
    if (node.genericArguments && node.genericArguments.length > 0) {
      const args = node.genericArguments.map((a) =>
        this.transformType(a, forParameter),
      );
      const fullType = `${resolvedName}<${args.join(", ")}>`;
      return `${fullType} | FluentBuilder<${fullType}, BaseBuildContext> | FluentPartial<${fullType}, BaseBuildContext>`;
    }

    // If ref contains embedded generics but genericArguments is empty, preserve them
    // This handles cases like "SimpleModifier<'format'>" where the type argument
    // is encoded in the ref string rather than in genericArguments array
    if (ref.includes("<")) {
      // Also resolve the base name in case it's a namespace member
      const resolvedRef =
        this.resolveTypeName(extractBaseName(ref)) +
        ref.substring(ref.indexOf("<"));
      return `${resolvedRef} | FluentBuilder<${resolvedRef}, BaseBuildContext> | FluentPartial<${resolvedRef}, BaseBuildContext>`;
    }

    return `${resolvedName} | FluentBuilder<${resolvedName}, BaseBuildContext> | FluentPartial<${resolvedName}, BaseBuildContext>`;
  }

  /**
   * Transform a type that extends AssetWrapper into a combined union.
   * Produces: InnerType | FluentBuilder<InnerType> | TypeName | FluentBuilder<TypeName> | FluentPartial<TypeName>
   */
  private transformAssetWrapperExtension(
    resolvedTypeName: string,
    rawTypeName: string,
    extendsRef: RefType,
  ): string {
    this.context.setNeedsAssetImport(true);

    // Determine the inner asset type from the AssetWrapper ancestor
    let innerType = "Asset";
    if (extendsRef.genericArguments && extendsRef.genericArguments.length > 0) {
      const genericArg = extendsRef.genericArguments[0];
      const argType = this.transformTypeForConstraint(genericArg);
      innerType = this.context.getGenericParamSymbols().has(argType)
        ? "Asset"
        : argType;
    } else if (extendsRef.ref.includes("<")) {
      const match = extendsRef.ref.match(/AssetWrapper<(.+)>/);
      if (match) {
        const extracted = extractBaseName(match[1].trim());
        innerType = this.context.getGenericParamSymbols().has(extracted)
          ? "Asset"
          : extracted;
      }
    }

    // Track inner type for import if it's concrete and not Asset
    if (innerType !== "Asset" && this.shouldTrackTypeForImport(innerType)) {
      this.context.trackReferencedType(innerType);
    }

    // Track the extending type itself for import
    if (this.shouldTrackTypeForImport(rawTypeName)) {
      this.context.trackReferencedType(rawTypeName);
    }

    return `${innerType} | FluentBuilder<${innerType}, BaseBuildContext> | ${resolvedTypeName} | FluentBuilder<${resolvedTypeName}, BaseBuildContext> | FluentPartial<${resolvedTypeName}, BaseBuildContext>`;
  }

  /**
   * Generate an inline object type for anonymous objects.
   */
  generateInlineObjectType(node: ObjectType, forParameter: boolean): string {
    const props = Object.entries(node.properties)
      .map(([propName, prop]) => {
        const propType = this.transformType(prop.node, forParameter);
        const optional = prop.required ? "" : "?";
        // Quote property names that contain special characters (like hyphens)
        const quotedName = this.needsQuoting(propName)
          ? `"${propName}"`
          : propName;
        return `${quotedName}${optional}: ${propType}`;
      })
      .join("; ");

    return `{ ${props} }`;
  }

  /**
   * Check if a property name needs to be quoted in TypeScript.
   * Property names with special characters like hyphens must be quoted.
   */
  private needsQuoting(name: string): boolean {
    // Valid unquoted property names match JavaScript identifier rules
    // Must start with letter, underscore, or dollar sign
    // Can contain letters, digits, underscores, or dollar signs
    return !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
  }

  /**
   * Get the full qualified name for a type if it's a namespace member.
   * For example, "CrossfieldReference" -> "Validation.CrossfieldReference"
   * if we've seen "Validation.CrossfieldReference" in the source.
   * Returns the original name if no namespace mapping exists.
   */
  private resolveTypeName(typeName: string): string {
    return this.context.getNamespaceMemberMap().get(typeName) ?? typeName;
  }
}
