import { Node } from "ts-morph";
import type { PropertyInfo, Declaration } from "../../types.js";
import type { TypeAnalyzer } from "../TypeAnalyzer.js";
import { isUnionProperty, isObjectProperty } from "../../types.js";
import {
  BaseDeclarationAnalysisStrategy,
  type DeclarationAnalysisContext,
} from "./DeclarationAnalysisStrategy.js";
import { PropertyFactory } from "../../factories/PropertyFactory.js";
import { extractJSDocFromNode } from "../../utils/jsdoc.js";
import { GenericContext } from "../../core/GenericContext.js";
import { getGenericTypeParameters } from "../../utils/index.js";
import { logAnalysisWarning } from "../utils.js";

/** Strategy for analyzing type alias declarations. */
export class TypeAliasAnalysisStrategy extends BaseDeclarationAnalysisStrategy {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    super();
  }

  canHandle(declaration: Declaration): boolean {
    return Node.isTypeAliasDeclaration(declaration);
  }

  analyze(context: DeclarationAnalysisContext): PropertyInfo | null {
    const declaration = context.declaration;
    if (!Node.isTypeAliasDeclaration(declaration)) {
      return null;
    }

    try {
      this.addDependency(context, context.typeName);

      // Get the underlying type node
      const typeNode = declaration.getTypeNode();
      if (!typeNode) {
        logAnalysisWarning(
          "TypeAliasAnalysisStrategy",
          `Type alias has no type node: ${context.typeName}`,
          { aliasName: declaration.getName() },
        );
        return PropertyFactory.createFallbackProperty({
          name: context.name,
          typeAsString: context.typeAsString,
          options: context.options,
        });
      }

      // Build generic context if type arguments are provided
      let genericContext =
        context.options.genericContext ?? GenericContext.empty();
      if (context.typeArgs && context.typeArgs.length > 0) {
        const genericParams = getGenericTypeParameters(declaration);
        const substitutions = new Map();

        // Map generic parameters to their arguments
        for (
          let i = 0;
          i < Math.min(genericParams.length, context.typeArgs.length);
          i++
        ) {
          substitutions.set(genericParams[i], context.typeArgs[i]);
        }

        genericContext = genericContext.withSubstitutions(substitutions);
      }

      const analyzedProperty = this.typeAnalyzer.analyze({
        name: context.name,
        typeNode,
        context: context.extractorContext,
        options: {
          ...context.options,
          genericContext,
        },
      });

      if (!analyzedProperty) {
        return PropertyFactory.createFallbackProperty({
          name: context.name,
          typeAsString: context.typeAsString,
          options: context.options,
        });
      }

      const aliasDocumentation = extractJSDocFromNode(declaration);
      if (aliasDocumentation && !analyzedProperty.documentation) {
        analyzedProperty.documentation = aliasDocumentation;
      }

      return this.processAnalyzedProperty(analyzedProperty, context);
    } catch (error) {
      logAnalysisWarning(
        "TypeAliasAnalysisStrategy",
        `Error analyzing type alias: ${context.typeName}`,
        {
          error: error instanceof Error ? error.message : String(error),
          aliasName: declaration.getName(),
        },
      );

      return PropertyFactory.createFallbackProperty({
        name: context.name,
        typeAsString: context.typeAsString,
        options: context.options,
      });
    }
  }

  getName(): string {
    return "TypeAliasAnalysisStrategy";
  }

  /** Process the analyzed property based on its type. */
  private processAnalyzedProperty(
    analyzedProperty: PropertyInfo,
    context: DeclarationAnalysisContext,
  ): PropertyInfo {
    // For union types, we might want to convert them to object properties
    // depending on the specific use case
    if (isUnionProperty(analyzedProperty)) {
      return PropertyFactory.createObjectProperty({
        name: context.name,
        typeAsString: context.typeAsString,
        properties: analyzedProperty.elements || [],
        options: context.options,
        ...(analyzedProperty.documentation && {
          documentation: analyzedProperty.documentation,
        }),
      });
    }

    // For object types, ensure we preserve the original type string
    if (isObjectProperty(analyzedProperty)) {
      return PropertyFactory.createObjectProperty({
        name: context.name,
        typeAsString: context.typeAsString, // Use the alias name, not the resolved type
        properties: analyzedProperty.properties,
        options: context.options,
        ...(analyzedProperty.documentation && {
          documentation: analyzedProperty.documentation,
        }),
        ...(analyzedProperty.acceptsUnknownProperties && {
          acceptsUnknownProperties: analyzedProperty.acceptsUnknownProperties,
        }),
      });
    }

    // For primitive types (like type StringAlias = string), preserve the analyzed property
    // but update the name and type string to reflect the alias
    return {
      ...analyzedProperty,
      name: context.name,
      typeAsString: context.typeAsString,
      ...(context.options.isArray && { isArray: true }),
      ...(context.options.isOptional && { isOptional: true }),
    };
  }
}
