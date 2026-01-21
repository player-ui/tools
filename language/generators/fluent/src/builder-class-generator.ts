import type { NodeType, ObjectType } from "@player-tools/xlr";
import {
  toPascalCase,
  isPrimitiveConst,
  containsArrayType,
  extractGenericUsage,
} from "./utils";
import type { TypeTransformer } from "./type-transformer";

/**
 * Information about a builder class to generate.
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
 * Information about a property for code generation.
 */
interface PropertyInfo {
  propName: string;
  propType: NodeType;
  description: string;
}

/**
 * Generates builder class code from BuilderInfo.
 */
export class BuilderClassGenerator {
  private readonly typeTransformer: TypeTransformer;

  /** Track array properties for __arrayProperties__ */
  private arrayProperties = new Set<string>();

  constructor(typeTransformer: TypeTransformer) {
    this.typeTransformer = typeTransformer;
  }

  /**
   * Generate the builder class code.
   */
  generateBuilderClass(info: BuilderInfo): string {
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
export function ${factoryName}${genericPart}(initial?: FluentPartial<${name}${genericUsage}>): ${className}${genericUsage} {
  return new ${className}${genericUsage}(initial);
}`;

    return classCode.trim();
  }

  /**
   * Generate interface methods for the builder.
   */
  private generateInterfaceMethods(info: BuilderInfo): string {
    const { className, objectType, genericParams, isAsset } = info;
    const genericUsage = extractGenericUsage(genericParams);

    // Collect all properties to generate methods for
    const properties = this.collectPropertiesForMethods(objectType, isAsset);

    const methods = properties
      .map(({ propName, propType, description }) => {
        const methodName = `with${toPascalCase(propName)}`;
        const paramType = this.typeTransformer.transformType(propType, true);

        return `  /** ${description} */
  ${methodName}(value: ${paramType}): ${className}${genericUsage};`;
      })
      .join("\n");

    return `export interface ${className}Methods${genericParams ? `<${genericParams}>` : ""} {
${methods}
}`;
  }

  /**
   * Collect properties that need methods generated.
   */
  private collectPropertiesForMethods(
    objectType: ObjectType,
    isAsset: boolean,
  ): PropertyInfo[] {
    const properties: PropertyInfo[] = [];
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

  /**
   * Generate class methods for the builder.
   */
  private generateClassMethods(info: BuilderInfo): string {
    const { className, objectType, genericParams, isAsset } = info;
    const genericUsage = extractGenericUsage(genericParams);

    // Collect all properties to generate methods for
    const properties = this.collectPropertiesForMethods(objectType, isAsset);

    return properties
      .map(({ propName, propType, description }) => {
        const methodName = `with${toPascalCase(propName)}`;
        const paramType = this.typeTransformer.transformType(propType, true);

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

  /**
   * Generate default values object.
   */
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
}
