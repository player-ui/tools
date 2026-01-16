import type {
  NodeType,
  ObjectType,
  RefType,
  NamedType,
} from "@player-tools/xlr";
import { isGenericNamedType } from "@player-tools/xlr-utils";
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
  isPrimitiveConst,
  toPascalCase,
  toFactoryName,
  toBuilderClassName,
  getAssetTypeFromExtends,
  containsArrayType,
  extractGenericUsage,
  isBuiltinType,
} from "./utils";

/**
 * Configuration for the generator
 */
export interface GeneratorConfig {
  /** Import path for fluent utilities (default: "@player-tools/fluent") */
  fluentImportPath?: string;
  /** Import path for player-ui types (default: "@player-ui/types") */
  typesImportPath?: string;
  /** Function to generate the type import path for a given type name */
  typeImportPathGenerator?: (typeName: string) => string;
  /**
   * Set of type names that are defined in the same source file as the main type.
   * Types not in this set will be imported from their own source files using typeImportPathGenerator.
   */
  sameFileTypes?: Set<string>;
  /**
   * Explicitly maps type names to their package names for external imports.
   * Types in this map will be imported from the specified package (e.g., "@player-tools/types").
   * This takes precedence over typeImportPathGenerator for the specified types.
   */
  externalTypes?: Map<string, string>;
}

/**
 * Information about a builder class to generate.
 * Exported for consumers who need to extend or introspect the generator.
 */
export interface BuilderInfo {
  /** Original type name from XLR */
  name: string;
  /** Generated class name (e.g., "TextAssetBuilder") */
  className: string;
  /** Factory function name (e.g., "text") */
  factoryName: string;
  /** The XLR ObjectType being generated */
  objectType: ObjectType;
  /** Asset type string if this is an Asset (e.g., "text") */
  assetType?: string;
  /** Generic parameters declaration if type is generic */
  genericParams?: string;
  /** Whether this type extends Asset */
  isAsset: boolean;
}

/**
 * Extracts the base type name from a ref string, handling nested generics.
 * @example
 * extractBaseName("MyType") // "MyType"
 * extractBaseName("MyType<T>") // "MyType"
 * extractBaseName("Map<string, Array<T>>") // "Map"
 */
function extractBaseName(ref: string): string {
  const bracketIndex = ref.indexOf("<");
  return bracketIndex === -1 ? ref : ref.substring(0, bracketIndex);
}

/**
 * Generates fluent builder TypeScript code from XLR types
 */
export class FluentBuilderGenerator {
  private readonly namedType: NamedType<ObjectType>;
  private readonly config: GeneratorConfig;

  /** Track array properties for __arrayProperties__ */
  private arrayProperties = new Set<string>();

  /** Track all type references that need to be imported, grouped by source file */
  private referencedTypesBySource = new Map<string, Set<string>>();

  /** Track types that should be imported from the main type's source file */
  private referencedTypes = new Set<string>();

  /** Track whether Asset type is needed for imports */
  private needsAssetImport = false;

  /** Track generic parameter symbols (e.g., T, U) that should not be imported */
  private genericParamSymbols = new Set<string>();

  constructor(namedType: NamedType<ObjectType>, config: GeneratorConfig = {}) {
    this.namedType = namedType;
    this.config = config;
  }

  /**
   * Generate the builder code
   */
  generate(): string {
    const mainBuilder = this.createBuilderInfo(this.namedType);

    // Collect generic parameter symbols first so we can exclude them from imports
    this.collectGenericParamSymbols(this.namedType);

    // Collect types from generic constraints/defaults for import generation
    this.collectTypesFromGenericTokens(this.namedType);

    // Collect all referenced types for imports (no nested builders are generated)
    this.collectReferencedTypes(this.namedType);

    // Generate main builder class (this also sets needsAssetImport flag)
    const mainBuilderCode = this.generateBuilderClass(mainBuilder);

    // Generate imports after builder code so we know what imports are needed
    const imports = this.generateImports(mainBuilder);

    return [imports, mainBuilderCode].filter(Boolean).join("\n\n");
  }

  private createBuilderInfo(namedType: NamedType<ObjectType>): BuilderInfo {
    const assetType = getAssetTypeFromExtends(namedType);
    const isAsset = !!assetType;

    let genericParams: string | undefined;
    if (isGenericNamedType(namedType)) {
      // Deduplicate generic parameters by symbol name
      // This handles cases where a type extends another generic type without
      // passing type arguments, causing XLR to collect parameters from both
      const seenParams = new Set<string>();
      genericParams = namedType.genericTokens
        .filter((t) => {
          if (seenParams.has(t.symbol)) {
            return false;
          }
          seenParams.add(t.symbol);
          return true;
        })
        .map((t) => {
          let param = t.symbol;
          if (t.constraints) {
            // Use raw type names for constraints (no FluentBuilder union)
            // since constraints define type bounds, not parameter types
            param += ` extends ${this.transformTypeForConstraint(t.constraints)}`;
          }
          if (t.default) {
            // Use raw type names for defaults as well
            param += ` = ${this.transformTypeForConstraint(t.default)}`;
          }
          return param;
        })
        .join(", ");
    }

    return {
      name: namedType.name,
      className: toBuilderClassName(namedType.name),
      factoryName: toFactoryName(namedType.name),
      objectType: namedType,
      assetType,
      genericParams,
      isAsset,
    };
  }

  private generateImports(mainBuilder: BuilderInfo): string {
    // Import the main type - use custom generator if provided
    const typeImportPath = this.config.typeImportPathGenerator
      ? this.config.typeImportPathGenerator(mainBuilder.name)
      : `../types/${this.getTypeFileName(mainBuilder.name)}`;

    // Collect all types to import from the main source file
    // This includes: main type and referenced types from same file
    const typesToImport = new Set<string>([mainBuilder.name]);

    // Add referenced types that are in the same source file
    Array.from(this.referencedTypes).forEach((name) => {
      typesToImport.add(name);
    });

    // Get import paths from config or use defaults
    const typesImportPath = this.config.typesImportPath ?? "@player-ui/types";
    const fluentImportPath =
      this.config.fluentImportPath ?? "@player-tools/fluent";

    // Build import lines
    const lines: string[] = [];

    // Main type import
    const typeImportStatement = `import type { ${Array.from(typesToImport).join(", ")} } from "${typeImportPath}";`;
    lines.push(typeImportStatement);

    // Generate imports for types from other source files
    for (const [importPath, types] of this.referencedTypesBySource) {
      const typeNames = Array.from(types).join(", ");
      lines.push(`import type { ${typeNames} } from "${importPath}";`);
    }

    // Only import Asset if it's used
    if (this.needsAssetImport) {
      lines.push(`import type { Asset } from "${typesImportPath}";`);
    }

    lines.push(
      `import { type FluentBuilder, type BaseBuildContext, FluentBuilderBase, createInspectMethod, type TaggedTemplateValue } from "${fluentImportPath}";`,
    );

    return lines.join("\n");
  }

  private getTypeFileName(typeName: string): string {
    // Convert PascalCase to kebab-case for file name
    return typeName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "")
      .replace(/asset$/, "");
  }

  private collectReferencedTypes(objType: ObjectType): void {
    for (const prop of Object.values(objType.properties)) {
      this.collectReferencedTypesFromNode(prop.node);
    }
  }

  private collectReferencedTypesFromNode(node: NodeType): void {
    if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Named types are defined elsewhere - track for import
        // Skip built-in types and the type being generated
        if (
          node.name !== this.namedType.name &&
          !isBuiltinType(node.name) &&
          !this.genericParamSymbols.has(node.name)
        ) {
          this.trackReferencedType(node.name);
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
      // Track reference types that aren't built-in or generic params
      const baseName = extractBaseName(node.ref);
      if (!isBuiltinType(baseName) && !this.genericParamSymbols.has(baseName)) {
        this.trackReferencedType(baseName);
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
   * Track a referenced type for import generation.
   * Priority: externalTypes > sameFileTypes > typeImportPathGenerator
   * Types are categorized into:
   * - referencedTypes: same file as main type
   * - referencedTypesBySource: grouped by import path (local files or packages)
   */
  private trackReferencedType(typeName: string): void {
    const { sameFileTypes, externalTypes, typeImportPathGenerator } =
      this.config;

    // Check if it's an explicitly configured external type
    if (externalTypes?.has(typeName)) {
      const packageName = externalTypes.get(typeName)!;
      if (!this.referencedTypesBySource.has(packageName)) {
        this.referencedTypesBySource.set(packageName, new Set());
      }
      this.referencedTypesBySource.get(packageName)!.add(typeName);
      return;
    }

    // If sameFileTypes is provided, check if this type is from the same file
    if (sameFileTypes) {
      if (sameFileTypes.has(typeName)) {
        this.referencedTypes.add(typeName);
      } else if (typeImportPathGenerator) {
        // Type is from a different file - group it by its import path
        const importPath = typeImportPathGenerator(typeName);
        if (!this.referencedTypesBySource.has(importPath)) {
          this.referencedTypesBySource.set(importPath, new Set());
        }
        this.referencedTypesBySource.get(importPath)!.add(typeName);
      } else {
        // No typeImportPathGenerator, assume same file
        this.referencedTypes.add(typeName);
      }
    } else {
      // No sameFileTypes provided, assume all types are in the same file (legacy behavior)
      this.referencedTypes.add(typeName);
    }
  }

  /**
   * Collect generic parameter symbols (e.g., T, U) from the type definition.
   * These should not be imported as they are type parameters, not concrete types.
   */
  private collectGenericParamSymbols(namedType: NamedType<ObjectType>): void {
    if (!isGenericNamedType(namedType)) {
      return;
    }

    for (const token of namedType.genericTokens) {
      this.genericParamSymbols.add(token.symbol);
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

  /**
   * Collect type references from generic parameter constraints and defaults.
   * This ensures types used in generics like "T extends Foo = Bar<X>" have
   * Foo, Bar, and X added to referencedTypes for import generation.
   */
  private collectTypesFromGenericTokens(
    namedType: NamedType<ObjectType>,
  ): void {
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
   * Recursively collect type references from any NodeType.
   * This handles refs, arrays, unions, intersections, and objects.
   */
  private collectTypeReferencesFromNode(node: NodeType): void {
    if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);
      // Skip built-in types and generic param symbols
      if (!isBuiltinType(baseName) && !this.genericParamSymbols.has(baseName)) {
        this.trackReferencedType(baseName);
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
        if (
          !this.genericParamSymbols.has(node.name) &&
          !isBuiltinType(node.name)
        ) {
          this.referencedTypes.add(node.name);
        }
      }

      for (const prop of Object.values(node.properties)) {
        this.collectTypeReferencesFromNode(prop.node);
      }
    }
  }

  private generateBuilderClass(info: BuilderInfo): string {
    const {
      name,
      className,
      factoryName,
      objectType,
      assetType,
      genericParams,
    } = info;

    // Reset array properties for this builder
    this.arrayProperties.clear();

    const genericPart = genericParams ? `<${genericParams}>` : "";
    const genericUsage = extractGenericUsage(genericParams);

    // Generate interface methods
    const interfaceCode = this.generateInterfaceMethods(info);

    // Generate class methods
    const classMethods = this.generateClassMethods(info);

    // Generate defaults
    const defaults = this.generateDefaults(objectType, assetType);

    // Generate array properties metadata
    const arrayPropsCode =
      this.arrayProperties.size > 0
        ? `  private static readonly __arrayProperties__: ReadonlySet<string> = new Set([${Array.from(
            this.arrayProperties,
          )
            .map((p) => `"${p}"`)
            .join(", ")}]);\n`
        : "";

    // Build the class
    const classCode = `
${interfaceCode}

/**
 * A builder for ${name}
 */
export class ${className}${genericPart} extends FluentBuilderBase<${name}${genericUsage}> implements ${className}Methods${genericUsage}, FluentBuilder<${name}${genericUsage}, BaseBuildContext> {
  private static readonly defaults: Record<string, unknown> = ${defaults};
${arrayPropsCode}
${classMethods}

  /**
   * Builds the final ${name} object
   * @param context - Optional build context for nested builders
   */
  build(context?: BaseBuildContext): ${name}${genericUsage} {
    return this.buildWithDefaults(${className}.defaults, context);
  }

  [Symbol.for("nodejs.util.inspect.custom")](): string {
    return createInspectMethod("${className}", this.values);
  }
}

/**
 * Creates a new ${name} builder
 * @param initial Optional initial values
 * @returns A fluent builder for ${name}
 */
export function ${factoryName}${genericPart}(initial?: Partial<${name}${genericUsage}>): ${className}${genericUsage} {
  return new ${className}${genericUsage}(initial);
}`;

    return classCode.trim();
  }

  private generateInterfaceMethods(info: BuilderInfo): string {
    const { className, objectType, genericParams, isAsset } = info;
    const genericUsage = extractGenericUsage(genericParams);

    // Collect all properties to generate methods for
    const properties = this.collectPropertiesForMethods(objectType, isAsset);

    const methods = properties
      .map(({ propName, propType, description }) => {
        const methodName = `with${toPascalCase(propName)}`;
        const paramType = this.transformType(propType, true);

        return `  /** ${description} */
  ${methodName}(value: ${paramType}): ${className}${genericUsage};`;
      })
      .join("\n");

    return `export interface ${className}Methods${genericParams ? `<${genericParams}>` : ""} {
${methods}
}`;
  }

  private collectPropertiesForMethods(
    objectType: ObjectType,
    isAsset: boolean,
  ): Array<{ propName: string; propType: NodeType; description: string }> {
    const properties: Array<{
      propName: string;
      propType: NodeType;
      description: string;
    }> = [];
    const seenProps = new Set<string>();

    // Add inherited Asset properties for asset types
    // Skip if the type explicitly declares the property (explicit takes precedence)
    if (isAsset && !("id" in objectType.properties)) {
      // Add id property - all assets have an id
      properties.push({
        propName: "id",
        propType: { type: "string" },
        description: "A unique identifier for this asset",
      });
      seenProps.add("id");
    }

    // Add properties from the object type
    for (const [propName, prop] of Object.entries(objectType.properties)) {
      // Skip if we've already seen this property (deduplication)
      if (seenProps.has(propName)) {
        continue;
      }
      seenProps.add(propName);
      properties.push({
        propName,
        propType: prop.node,
        description: prop.node.description || `Sets the ${propName} property`,
      });
    }

    return properties;
  }

  private generateClassMethods(info: BuilderInfo): string {
    const { className, objectType, genericParams, isAsset } = info;
    const genericUsage = extractGenericUsage(genericParams);

    // Collect all properties to generate methods for
    const properties = this.collectPropertiesForMethods(objectType, isAsset);

    return properties
      .map(({ propName, propType, description }) => {
        const methodName = `with${toPascalCase(propName)}`;
        const paramType = this.transformType(propType, true);

        // Track array properties (including union types that contain arrays)
        if (containsArrayType(propType)) {
          this.arrayProperties.add(propName);
        }

        return `  /** ${description} */
  ${methodName}(value: ${paramType}): ${className}${genericUsage} {
    return this.set("${propName}", value);
  }`;
      })
      .join("\n\n");
  }

  private generateDefaults(objectType: ObjectType, assetType?: string): string {
    const defaults: Record<string, unknown> = {};

    // Add asset type default if this is an asset
    if (assetType) {
      defaults["type"] = assetType;
    }

    // Add default ID for assets (types that extend Asset)
    if (objectType.extends?.ref.startsWith("Asset")) {
      defaults["id"] = "";
    }
    // Also add default ID for non-Asset types that have an 'id' property
    // This enables ID auto-generation for nested object types
    else if ("id" in objectType.properties) {
      defaults["id"] = "";
    }

    // Add const defaults from properties
    for (const [propName, prop] of Object.entries(objectType.properties)) {
      if (isPrimitiveConst(prop.node)) {
        defaults[propName] = prop.node.const;
      }
    }

    return JSON.stringify(defaults);
  }

  /**
   * Transform a type for use in generic constraints and defaults.
   * Unlike transformType(), this returns raw type names without FluentBuilder unions,
   * since constraints define type bounds, not parameter types that accept builders.
   *
   * @param node - The type node to transform
   * @returns The raw TypeScript type string
   */
  private transformTypeForConstraint(node: NodeType): string {
    if (isRefType(node)) {
      const baseName = extractBaseName(node.ref);

      // Handle generic arguments
      if (node.genericArguments && node.genericArguments.length > 0) {
        const args = node.genericArguments.map((a) =>
          this.transformTypeForConstraint(a),
        );
        return `${baseName}<${args.join(", ")}>`;
      }

      // Preserve embedded generics if present in the ref string
      if (node.ref.includes("<")) {
        return node.ref;
      }

      return baseName;
    }

    if (isObjectType(node) && isNamedType(node)) {
      // Just the type name, no FluentBuilder union
      return node.name;
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

    // For primitives, use standard transformation (no FluentBuilder needed anyway)
    return this.transformType(node, false);
  }

  /**
   * Transform an XLR type to a TypeScript type string
   * This is the core recursive transformation that adds TaggedTemplateValue support
   */
  private transformType(node: NodeType, forParameter = false): string {
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
        // Named type - accept raw type or a builder that produces it
        return `${node.name} | FluentBuilder<${node.name}, BaseBuildContext>`;
      }

      // Anonymous object - accept inline type or a builder that produces it
      const inlineType = this.generateInlineObjectType(node, forParameter);
      return `${inlineType} | FluentBuilder<${inlineType}, BaseBuildContext>`;
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

  private transformRefType(node: RefType, forParameter: boolean): string {
    const ref = node.ref;

    // AssetWrapper - transform to accept Asset or FluentBuilder
    if (ref.startsWith("AssetWrapper")) {
      this.needsAssetImport = true;
      return "Asset | FluentBuilder<Asset, BaseBuildContext>";
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
      this.needsAssetImport = true;
      return "Asset";
    }

    // Other references - user-defined types that may be objects
    // Accept both raw type or FluentBuilder that produces it
    const baseName = extractBaseName(ref);

    // Handle structured generic arguments
    if (node.genericArguments && node.genericArguments.length > 0) {
      const args = node.genericArguments.map((a) =>
        this.transformType(a, forParameter),
      );
      const fullType = `${baseName}<${args.join(", ")}>`;
      return `${fullType} | FluentBuilder<${fullType}, BaseBuildContext>`;
    }

    // If ref contains embedded generics but genericArguments is empty, preserve them
    // This handles cases like "SimpleModifier<'format'>" where the type argument
    // is encoded in the ref string rather than in genericArguments array
    if (ref.includes("<")) {
      return `${ref} | FluentBuilder<${ref}, BaseBuildContext>`;
    }

    return `${baseName} | FluentBuilder<${baseName}, BaseBuildContext>`;
  }

  private generateInlineObjectType(
    node: ObjectType,
    forParameter: boolean,
  ): string {
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
}

/**
 * Generate fluent builder code from a NamedType<ObjectType>
 * @param namedType - The XLR NamedType to generate a builder for
 * @param config - Optional generator configuration
 * @returns Generated TypeScript code for the fluent builder
 */
export function generateFluentBuilder(
  namedType: NamedType<ObjectType>,
  config: GeneratorConfig = {},
): string {
  const generator = new FluentBuilderGenerator(namedType, config);
  return generator.generate();
}
