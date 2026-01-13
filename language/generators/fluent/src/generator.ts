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
  isComplexObjectType,
  getAssetTypeFromExtends,
  containsArrayType,
  extractGenericUsage,
} from "./utils";

/**
 * Configuration for the generator
 */
export interface GeneratorConfig {
  /** Import path for fluent utilities (default: "@player-tools/fluent") */
  fluentImportPath?: string;
  /** Import path for player-ui types (default: "@player-ui/types") */
  typesImportPath?: string;
  /** Function to generate the type import path */
  typeImportPathGenerator?: (typeName: string) => string;
}

/**
 * Information about a builder class to generate
 */
interface BuilderInfo {
  name: string;
  className: string;
  factoryName: string;
  objectType: ObjectType;
  assetType?: string;
  genericParams?: string;
  isAsset: boolean;
}

/**
 * Generates fluent builder TypeScript code from XLR types
 */
export class FluentBuilderGenerator {
  private readonly namedType: NamedType<ObjectType>;
  private readonly outputDir: string;
  private readonly config: GeneratorConfig;

  /** Track nested types that need their own builders */
  private nestedBuilders = new Map<string, ObjectType>();

  /** Track array properties for __arrayProperties__ */
  private arrayProperties = new Set<string>();

  /** Track all type references that need to be imported from the source type file */
  private referencedTypes = new Set<string>();

  /** Track whether Asset type is needed for imports */
  private needsAssetImport = false;

  constructor(
    namedType: NamedType<ObjectType>,
    outputDir: string,
    config: GeneratorConfig = {},
  ) {
    this.namedType = namedType;
    this.outputDir = outputDir;
    this.config = config;
  }

  /**
   * Generate the builder code
   */
  generate(): string {
    const mainBuilder = this.createBuilderInfo(this.namedType);

    // Collect all nested types that need builders
    this.collectNestedTypes(this.namedType);

    // Generate nested builder classes first (this sets needsAssetImport flag)
    const nestedBuilderCode = Array.from(this.nestedBuilders.entries())
      .map(([name, objType]) => {
        const info: BuilderInfo = {
          name,
          className: toBuilderClassName(name),
          factoryName: toFactoryName(name),
          objectType: objType,
          isAsset: false,
        };
        return this.generateBuilderClass(info);
      })
      .join("\n\n");

    // Generate main builder class (this also sets needsAssetImport flag)
    const mainBuilderCode = this.generateBuilderClass(mainBuilder);

    // Generate imports after builder code so we know what imports are needed
    const imports = this.generateImports(mainBuilder);

    return [imports, nestedBuilderCode, mainBuilderCode]
      .filter(Boolean)
      .join("\n\n");
  }

  private createBuilderInfo(namedType: NamedType<ObjectType>): BuilderInfo {
    const assetType = getAssetTypeFromExtends(namedType);
    const isAsset = !!assetType;

    let genericParams: string | undefined;
    if (isGenericNamedType(namedType)) {
      genericParams = namedType.genericTokens
        .map((t) => {
          let param = t.symbol;
          if (t.constraints) {
            param += ` extends ${this.transformType(t.constraints)}`;
          }
          if (t.default) {
            param += ` = ${this.transformType(t.default)}`;
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

    // Collect all types to import from the same source file
    // This includes: main type, nested builder types, and other referenced types
    const typesToImport = new Set<string>([mainBuilder.name]);

    // Add all nested builder types
    Array.from(this.nestedBuilders.keys()).forEach((name) => {
      typesToImport.add(name);
    });

    // Add all referenced types
    Array.from(this.referencedTypes).forEach((name) => {
      typesToImport.add(name);
    });

    const typeImportStatement = `import type { ${Array.from(typesToImport).join(", ")} } from "${typeImportPath}";`;

    // Get import paths from config or use defaults
    const typesImportPath = this.config.typesImportPath ?? "@player-ui/types";
    const fluentImportPath =
      this.config.fluentImportPath ?? "@player-tools/fluent";

    // Build import lines
    const lines = [typeImportStatement];

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

  private collectNestedTypes(objType: ObjectType): void {
    for (const [propName, prop] of Object.entries(objType.properties)) {
      this.collectNestedTypesFromNode(prop.node, propName);
    }
  }

  private collectNestedTypesFromNode(node: NodeType, parentName: string): void {
    if (isObjectType(node)) {
      if (isNamedType(node) && isComplexObjectType(node)) {
        this.nestedBuilders.set(node.name, node);
        this.collectNestedTypes(node);
      } else if (!isNamedType(node) && isComplexObjectType(node)) {
        // Anonymous complex object - generate a builder for it
        const name = toPascalCase(parentName);
        this.nestedBuilders.set(name, node);
        this.collectNestedTypes(node);
      } else if (isNamedType(node)) {
        // Simple named type - just track for import
        this.referencedTypes.add(node.name);
      }
    } else if (isArrayType(node)) {
      this.collectNestedTypesFromNode(node.elementType, parentName);
    } else if (isOrType(node)) {
      for (const variant of node.or) {
        this.collectNestedTypesFromNode(variant, parentName);
      }
    } else if (isAndType(node)) {
      for (const part of node.and) {
        this.collectNestedTypesFromNode(part, parentName);
      }
    } else if (isRefType(node)) {
      // Track reference types that aren't built-in Player types
      const baseName = node.ref.split("<")[0];
      const builtInTypes = [
        "Asset",
        "AssetWrapper",
        "Binding",
        "Expression",
        "Array",
        "Record",
      ];
      if (!builtInTypes.includes(baseName)) {
        this.referencedTypes.add(baseName);
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

    // Add inherited Asset properties for asset types
    if (isAsset) {
      // Add id property - all assets have an id
      properties.push({
        propName: "id",
        propType: { type: "string" },
        description: "A unique identifier for this asset",
      });
    }

    // Add properties from the object type
    for (const [propName, prop] of Object.entries(objectType.properties)) {
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
    if (isObjectType(node)) {
      if (isNamedType(node)) {
        // Named type - reference it or its builder
        if (isComplexObjectType(node)) {
          return `${node.name} | FluentBuilder<${node.name}, BaseBuildContext>`;
        }
        return node.name;
      }

      // Anonymous object - generate inline type with transformed properties
      return this.generateInlineObjectType(node, forParameter);
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

    // Other references - check if we have a builder for them
    const baseName = ref.split("<")[0];
    if (this.nestedBuilders.has(baseName)) {
      return `${baseName} | FluentBuilder<${baseName}, BaseBuildContext>`;
    }

    // Handle generic arguments
    if (node.genericArguments && node.genericArguments.length > 0) {
      const args = node.genericArguments.map((a) =>
        this.transformType(a, forParameter),
      );
      return `${baseName}<${args.join(", ")}>`;
    }

    return baseName;
  }

  private generateInlineObjectType(
    node: ObjectType,
    forParameter: boolean,
  ): string {
    const props = Object.entries(node.properties)
      .map(([propName, prop]) => {
        const propType = this.transformType(prop.node, forParameter);
        const optional = prop.required ? "" : "?";
        return `${propName}${optional}: ${propType}`;
      })
      .join("; ");

    return `{ ${props} }`;
  }
}

/**
 * Generate fluent builder code from a NamedType<ObjectType>
 */
export function generateFluentBuilder(
  namedType: NamedType<ObjectType>,
  outputDir: string,
  config: GeneratorConfig = {},
): string {
  const generator = new FluentBuilderGenerator(namedType, outputDir, config);
  return generator.generate();
}
