import type {
  PropertyInfo,
  ObjectProperty,
  EnumProperty,
  StringProperty,
  NumberProperty,
  BooleanProperty,
  UnknownProperty,
} from "../types.js";
import type { AnalysisOptions } from "../analyzers/TypeAnalyzer.js";

/** Factory for creating consistent property objects with proper typing and options handling. */
export class PropertyFactory {
  /** Create an object property with consistent structure. */
  static createObjectProperty(config: {
    name: string;
    typeAsString: string;
    properties: PropertyInfo[];
    options?: AnalysisOptions;
    documentation?: string;
    acceptsUnknownProperties?: boolean;
  }): ObjectProperty {
    return {
      kind: "non-terminal",
      type: "object",
      name: config.name,
      typeAsString: config.typeAsString,
      properties: config.properties,
      ...(config.options?.isArray && { isArray: true }),
      ...(config.options?.isOptional && { isOptional: true }),
      ...(config.documentation && { documentation: config.documentation }),
      ...(config.acceptsUnknownProperties && {
        acceptsUnknownProperties: true,
      }),
    };
  }

  /** Create an enum property with proper validation. */
  static createEnumProperty(config: {
    name: string;
    enumName: string;
    values: (string | number)[];
    options?: AnalysisOptions;
    documentation?: string;
  }): EnumProperty {
    if (config.values.length === 0) {
      throw new Error(`Enum ${config.enumName} has no values`);
    }

    return {
      kind: "terminal",
      type: "enum",
      name: config.name,
      typeAsString: config.enumName,
      values: config.values,
      ...(config.options?.isArray && { isArray: true }),
      ...(config.options?.isOptional && { isOptional: true }),
      ...(config.documentation && { documentation: config.documentation }),
    };
  }

  /** Create a string property with optional literal value. */
  static createStringProperty(config: {
    name: string;
    typeAsString?: string;
    value?: string;
    options?: AnalysisOptions;
    documentation?: string;
  }): StringProperty {
    return {
      kind: "terminal",
      type: "string",
      name: config.name,
      typeAsString: config.typeAsString ?? "string",
      ...(config.value !== undefined && { value: config.value }),
      ...(config.options?.isArray && { isArray: true }),
      ...(config.options?.isOptional && { isOptional: true }),
      ...(config.documentation && { documentation: config.documentation }),
    };
  }

  /** Create a number property with optional literal value. */
  static createNumberProperty(config: {
    name: string;
    typeAsString?: string;
    value?: number;
    options?: AnalysisOptions;
    documentation?: string;
  }): NumberProperty {
    return {
      kind: "terminal",
      type: "number",
      name: config.name,
      typeAsString: config.typeAsString ?? "number",
      ...(config.value !== undefined && { value: config.value }),
      ...(config.options?.isArray && { isArray: true }),
      ...(config.options?.isOptional && { isOptional: true }),
      ...(config.documentation && { documentation: config.documentation }),
    };
  }

  /** Create a boolean property with optional literal value. */
  static createBooleanProperty(config: {
    name: string;
    typeAsString?: string;
    value?: boolean;
    options?: AnalysisOptions;
    documentation?: string;
  }): BooleanProperty {
    return {
      kind: "terminal",
      type: "boolean",
      name: config.name,
      typeAsString: config.typeAsString ?? "boolean",
      ...(config.value !== undefined && { value: config.value }),
      ...(config.options?.isArray && { isArray: true }),
      ...(config.options?.isOptional && { isOptional: true }),
      ...(config.documentation && { documentation: config.documentation }),
    };
  }

  /** Create an unknown property for unresolvable types. */
  static createUnknownProperty(config: {
    name: string;
    typeAsString: string;
    options?: AnalysisOptions;
    documentation?: string;
  }): UnknownProperty {
    return {
      kind: "terminal",
      type: "unknown",
      name: config.name,
      typeAsString: config.typeAsString,
      ...(config.options?.isArray && { isArray: true }),
      ...(config.options?.isOptional && { isOptional: true }),
      ...(config.documentation && { documentation: config.documentation }),
    };
  }

  /** Create a fallback property when type analysis fails. */
  static createFallbackProperty(config: {
    name: string;
    typeAsString: string;
    options?: AnalysisOptions;
  }): StringProperty {
    return this.createStringProperty({
      name: config.name,
      typeAsString: config.typeAsString,
      ...(config.options && { options: config.options }),
      documentation: `Fallback property for unresolved type: ${config.typeAsString}`,
    });
  }

  /** Apply analysis options to an existing property. */
  static applyOptions<T extends PropertyInfo>(
    property: T,
    options?: AnalysisOptions,
  ): T {
    if (!options) {
      return property;
    }

    return {
      ...property,
      ...(options.isArray && { isArray: true }),
      ...(options.isOptional && { isOptional: true }),
    };
  }
}
