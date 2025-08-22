import { Node, InterfaceDeclaration } from "ts-morph";
import type { PropertyInfo, Declaration } from "../../types.js";
import type { TypeAnalyzer } from "../TypeAnalyzer.js";
import {
  BaseDeclarationAnalysisStrategy,
  type DeclarationAnalysisContext,
} from "./DeclarationAnalysisStrategy.js";
import { PropertyFactory } from "../../factories/PropertyFactory.js";
import { extractJSDocFromNode } from "../../utils/jsdoc.js";
import { GenericContext } from "../../core/GenericContext.js";
import {
  getGenericTypeParameters,
  resolveGenericParametersToDefaults,
} from "../../utils/index.js";
import { logAnalysisWarning } from "../utils.js";

/** Strategy for analyzing interface declarations. */
export class InterfaceAnalysisStrategy extends BaseDeclarationAnalysisStrategy {
  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    super();
  }

  canHandle(declaration: Declaration): boolean {
    return Node.isInterfaceDeclaration(declaration);
  }

  analyze(context: DeclarationAnalysisContext): PropertyInfo | null {
    const declaration = context.declaration;
    if (!Node.isInterfaceDeclaration(declaration)) {
      return null;
    }

    try {
      this.addDependency(context, context.typeName);

      const properties = this.extractInterfaceProperties(declaration, context);
      const documentation = extractJSDocFromNode(declaration);

      return PropertyFactory.createObjectProperty({
        name: context.name,
        typeAsString: context.typeAsString,
        properties,
        options: context.options,
        ...(documentation && { documentation }),
      });
    } catch (error) {
      logAnalysisWarning(
        "InterfaceAnalysisStrategy",
        `Error analyzing interface: ${context.typeName}`,
        {
          error: error instanceof Error ? error.message : String(error),
          interfaceName: declaration.getName(),
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
    return "InterfaceAnalysisStrategy";
  }

  /**
   * Extract properties from an interface declaration.
   */
  private extractInterfaceProperties(
    interfaceDecl: InterfaceDeclaration,
    context: DeclarationAnalysisContext,
  ): PropertyInfo[] {
    const interfaceName = interfaceDecl.getName();

    // Prevent circular dependencies
    if (!context.extractorContext.enterCircularCheck(interfaceName)) {
      logAnalysisWarning(
        "InterfaceAnalysisStrategy",
        `Circular dependency detected for interface: ${interfaceName}`,
        { interfaceName },
      );
      return [];
    }

    try {
      // Build generic context - handle both explicit type arguments and default values
      let genericContext =
        context.options.genericContext ?? GenericContext.empty();

      const genericParams = getGenericTypeParameters(interfaceDecl);
      const substitutions = new Map();

      if (context.typeArgs && context.typeArgs.length > 0) {
        // Map provided type arguments to generic parameters
        for (
          let i = 0;
          i < Math.min(genericParams.length, context.typeArgs.length);
          i++
        ) {
          substitutions.set(genericParams[i], context.typeArgs[i]);
        }
      } else if (genericParams.length > 0) {
        // If no type arguments provided, but interface has generic parameters
        // resolve each parameter to its default value (or constraint)
        const defaultSubstitutions =
          resolveGenericParametersToDefaults(interfaceDecl);
        for (const [paramName, defaultType] of defaultSubstitutions) {
          substitutions.set(paramName, defaultType);
        }
      }

      // Apply substitutions if any were created
      if (substitutions.size > 0) {
        genericContext = genericContext.withSubstitutions(substitutions);
      }

      const properties: PropertyInfo[] = [];

      for (const property of interfaceDecl.getProperties()) {
        const propertyName = property.getName();
        const typeNode = property.getTypeNode();
        const isOptional = property.hasQuestionToken();

        if (typeNode) {
          const propertyInfo = this.typeAnalyzer.analyze({
            name: propertyName,
            typeNode,
            context: context.extractorContext,
            options: this.createChildAnalysisOptions(context, {
              isOptional,
              genericContext,
            }),
          });

          if (propertyInfo) {
            // Add JSDoc documentation if available
            const documentation = extractJSDocFromNode(property);
            if (documentation) {
              propertyInfo.documentation = documentation;
            }

            properties.push(propertyInfo);
          } else {
            // Create fallback for unresolved property types
            const fallback = PropertyFactory.createFallbackProperty({
              name: propertyName,
              typeAsString: typeNode.getText(),
              options: { isOptional },
            });
            properties.push(fallback);
          }
        }
      }

      return properties;
    } finally {
      context.extractorContext.exitCircularCheck(interfaceName);
    }
  }
}
