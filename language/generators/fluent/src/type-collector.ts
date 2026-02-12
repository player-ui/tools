import type { NodeType, ObjectType, NamedType } from "@player-tools/xlr";
import { isGenericNamedType } from "@player-tools/xlr-utils";
import {
  isObjectType,
  isArrayType,
  isRefType,
  isOrType,
  isAndType,
  isNamedType,
  isBuiltinType,
  extractBaseName,
  parseNamespacedType,
  type TypeRegistry,
} from "./utils";

/**
 * Interface for tracking type references.
 * Implemented by the import generator to track types that need to be imported.
 */
export interface TypeTracker {
  trackReferencedType(typeName: string): void;
  trackNamespaceImport(namespaceName: string): void;
}

/**
 * Collects type references from XLR types for import generation.
 */
export class TypeCollector {
  private readonly typeTracker: TypeTracker;
  private readonly genericParamSymbols: Set<string>;
  private readonly mainTypeName: string;
  private readonly namespaceMemberMap: Map<string, string>;
  private readonly typeRegistry?: TypeRegistry;

  constructor(
    typeTracker: TypeTracker,
    genericParamSymbols: Set<string>,
    mainTypeName: string,
    namespaceMemberMap: Map<string, string>,
    typeRegistry?: TypeRegistry,
  ) {
    this.typeTracker = typeTracker;
    this.genericParamSymbols = genericParamSymbols;
    this.mainTypeName = mainTypeName;
    this.namespaceMemberMap = namespaceMemberMap;
    this.typeRegistry = typeRegistry;
  }

  /**
   * Collect generic parameter symbols (e.g., T, U) from the type definition.
   * These should not be imported as they are type parameters, not concrete types.
   *
   * Also handles the case where a non-generic type extends a generic base without
   * passing type arguments. In that scenario, XLR copies properties from the base
   * (including references to the base's generic params like `AnyAsset`) but does
   * NOT propagate `genericTokens` to the child type. We scan the type registry for
   * generic parameter symbols that should be excluded from imports.
   */
  collectGenericParamSymbols(namedType: NamedType<ObjectType>): void {
    if (isGenericNamedType(namedType)) {
      for (const token of namedType.genericTokens) {
        this.genericParamSymbols.add(token.symbol);
      }
    }

    // Scan the type registry for generic parameter symbols from other types.
    // When XLR copies properties from a generic base without resolving generics,
    // the property types still reference the base's generic parameter names
    // (e.g., `AnyAsset` from `FileInputAssetBase<AnyAsset>`). These names are
    // not concrete types and should not be imported. We collect them from all
    // registry types, excluding any that are themselves registered as concrete types.
    if (this.typeRegistry) {
      for (const registeredType of this.typeRegistry.values()) {
        if (isGenericNamedType(registeredType)) {
          for (const token of registeredType.genericTokens) {
            if (!this.typeRegistry.has(token.symbol)) {
              this.genericParamSymbols.add(token.symbol);
            }
          }
        }
      }
    }
  }

  /**
   * Collect type references from generic parameter constraints and defaults.
   * This ensures types used in generics like "T extends Foo = Bar<X>" have
   * Foo, Bar, and X added to referencedTypes for import generation.
   */
  collectTypesFromGenericTokens(namedType: NamedType<ObjectType>): void {
    if (!isGenericNamedType(namedType)) {
      return;
    }

    for (const token of namedType.genericTokens) {
      if (token.constraints) {
        this.collectTypeReferencesFromNode(token.constraints);
      }

      if (token.default) {
        this.collectTypeReferencesFromNode(token.default);
      }
    }
  }

  /**
   * Collect all referenced types from an object type for imports.
   */
  collectReferencedTypes(objType: ObjectType): void {
    for (const prop of Object.values(objType.properties)) {
      this.collectReferencedTypesFromNode(prop.node);
    }
  }

  /**
   * Collect referenced types from a node type.
   */
  collectReferencedTypesFromNode(node: NodeType): void {
    if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Named types are defined elsewhere - track for import
        // Skip built-in types and the type being generated
        if (
          node.name !== this.mainTypeName &&
          !isBuiltinType(node.name) &&
          !this.genericParamSymbols.has(node.name)
        ) {
          this.typeTracker.trackReferencedType(node.name);
        }
      } else {
        // Anonymous object - recurse into properties to collect type references
        for (const prop of Object.values(node.properties)) {
          this.collectReferencedTypesFromNode(prop.node);
        }
      }
    } else if (isArrayType(node)) {
      this.collectReferencedTypesFromNode(node.elementType);
    } else if (isOrType(node)) {
      for (const variant of node.or) {
        this.collectReferencedTypesFromNode(variant);
      }
    } else if (isAndType(node)) {
      for (const part of node.and) {
        this.collectReferencedTypesFromNode(part);
      }
    } else if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);

      // Check if this is a namespaced type (e.g., "Validation.CrossfieldReference")
      const namespaced = parseNamespacedType(baseName);
      if (namespaced) {
        // Track the namespace for import and the member mapping
        this.typeTracker.trackNamespaceImport(namespaced.namespace);
        this.namespaceMemberMap.set(namespaced.member, baseName);
      } else {
        // Track reference types that aren't built-in or generic params
        if (
          !isBuiltinType(baseName) &&
          !this.genericParamSymbols.has(baseName)
        ) {
          this.typeTracker.trackReferencedType(baseName);
        }
      }

      // Also process generic arguments, but skip type parameters of the referenced type
      if (node.genericArguments) {
        for (const arg of node.genericArguments) {
          // Skip if this argument appears to be a type parameter of the referenced type
          // e.g., in ref="Bar<AnyAsset>", skip "AnyAsset" since it's Bar's type param
          if (isRefType(arg)) {
            const argName = extractBaseName(arg.ref);
            if (this.isTypeParamOfRef(argName, node.ref)) {
              continue;
            }
          }
          this.collectReferencedTypesFromNode(arg);
        }
      }
    }
  }

  /**
   * Recursively collect type references from any NodeType.
   * This handles refs, arrays, unions, intersections, and objects.
   */
  private collectTypeReferencesFromNode(node: NodeType): void {
    if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);

      // Check if this is a namespaced type (e.g., "Validation.CrossfieldReference")
      const namespaced = parseNamespacedType(baseName);
      if (namespaced) {
        // Track the namespace for import and the member mapping
        this.typeTracker.trackNamespaceImport(namespaced.namespace);
        this.namespaceMemberMap.set(namespaced.member, baseName);
      } else if (
        !isBuiltinType(baseName) &&
        !this.genericParamSymbols.has(baseName)
      ) {
        // Skip built-in types and generic param symbols
        this.typeTracker.trackReferencedType(baseName);
      }

      // Also process generic arguments, but skip type parameters of the referenced type
      if (node.genericArguments) {
        for (const arg of node.genericArguments) {
          // Skip if this argument appears to be a type parameter of the referenced type
          // e.g., in ref="Bar<AnyAsset>", skip "AnyAsset" since it's Bar's type param
          if (isRefType(arg)) {
            const argName = extractBaseName(arg.ref);
            if (this.isTypeParamOfRef(argName, node.ref)) {
              continue;
            }
          }
          this.collectTypeReferencesFromNode(arg);
        }
      }
    } else if (isArrayType(node)) {
      this.collectTypeReferencesFromNode(node.elementType);
    } else if (isOrType(node)) {
      for (const variant of node.or) {
        this.collectTypeReferencesFromNode(variant);
      }
    } else if (isAndType(node)) {
      for (const part of node.and) {
        this.collectTypeReferencesFromNode(part);
      }
    } else if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Skip generic param symbols and built-in types in named types
        // Strip generic arguments for import purposes
        const importName = extractBaseName(node.name);
        if (
          !this.genericParamSymbols.has(importName) &&
          !isBuiltinType(importName)
        ) {
          // Use trackReferencedType to properly resolve import path
          this.typeTracker.trackReferencedType(importName);
        }
      }

      for (const prop of Object.values(node.properties)) {
        this.collectTypeReferencesFromNode(prop.node);
      }
    }
  }

  /**
   * Check if a type name appears to be a generic type parameter of the referenced type.
   * This detects cases like ref="Bar<AnyAsset>" where "AnyAsset" is Bar's type parameter,
   * not a concrete type to import.
   *
   * @param argName - The name of the type argument being checked
   * @param parentRef - The parent ref string that contains the generic usage
   * @returns true if argName appears to be a type parameter in parentRef
   */
  private isTypeParamOfRef(argName: string, parentRef: string): boolean {
    // Extract the generic parameters portion from the ref string
    // e.g., "Bar<AnyAsset>" -> "AnyAsset", "Map<K, V>" -> "K, V"
    const genericMatch = parentRef.match(/<(.+)>/);
    if (!genericMatch) {
      return false;
    }

    const genericPart = genericMatch[1];

    // Split by comma while respecting nested generics
    // and check if argName matches any parameter
    let depth = 0;
    let current = "";
    const params: string[] = [];

    for (const char of genericPart) {
      if (char === "<") {
        depth++;
        current += char;
      } else if (char === ">") {
        depth--;
        current += char;
      } else if (char === "," && depth === 0) {
        params.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      params.push(current.trim());
    }

    // Check if argName matches any parameter exactly or is the base of a constrained param
    return params.some(
      (param) => param === argName || param.startsWith(`${argName} `),
    );
  }
}
