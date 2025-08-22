import type { TypeNode } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  TypeAnalysisStrategy,
  AnalysisOptions,
  TypeAnalyzer,
} from "./TypeAnalyzer.js";
import { SymbolResolver } from "../resolvers/SymbolResolver.js";
import { ExternalTypeResolver } from "../resolvers/ExternalTypeResolver.js";
import { TypeGuards } from "../utils/TypeGuards.js";
import { PropertyFactory } from "../factories/PropertyFactory.js";
import { getTypeParameterConstraintOrDefault } from "../utils/index.js";
import { logAnalysisWarning } from "./utils.js";
import {
  InterfaceAnalysisStrategy,
  TypeAliasAnalysisStrategy,
  EnumAnalysisStrategy,
} from "./strategies/index.js";
import type {
  DeclarationAnalysisStrategy,
  DeclarationAnalysisContext,
} from "./strategies/DeclarationAnalysisStrategy.js";

/** Type reference analyzer leveraging strategy pattern for different declaration types. */
export class ReferenceAnalyzer implements TypeAnalysisStrategy {
  private readonly declarationStrategies: DeclarationAnalysisStrategy[];

  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    this.declarationStrategies = [
      new InterfaceAnalysisStrategy(typeAnalyzer),
      new TypeAliasAnalysisStrategy(typeAnalyzer),
      new EnumAnalysisStrategy(),
    ];
  }

  canHandle(typeNode: TypeNode): boolean {
    return TypeGuards.isTypeReference(typeNode);
  }

  analyze({
    name,
    typeNode,
    context,
    options = {},
  }: {
    name: string;
    typeNode: TypeNode;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    if (!TypeGuards.isTypeReference(typeNode)) {
      return null;
    }

    try {
      const symbolResolver = new SymbolResolver(context);
      const externalResolver = new ExternalTypeResolver(context.getProject());

      const typeAsString = typeNode.getText();
      const typeName = TypeGuards.getTypeName(typeNode);
      const typeArgs = TypeGuards.getTypeArguments(typeNode);

      return this.analyzeTypeReference({
        name,
        typeNode,
        context,
        options,
        typeAsString,
        typeName,
        typeArgs,
        symbolResolver,
        externalResolver,
      });
    } catch (error) {
      logAnalysisWarning(
        "ReferenceAnalyzer",
        `Error analyzing type reference: ${name}`,
        {
          error: error instanceof Error ? error.message : String(error),
          typeText: typeNode.getText(),
        },
      );

      return PropertyFactory.createFallbackProperty({
        name,
        typeAsString: typeNode.getText(),
        options,
      });
    }
  }

  /**
   * Main type reference analysis method.
   */
  private analyzeTypeReference({
    name,
    typeNode,
    context,
    options,
    typeAsString,
    typeName,
    typeArgs,
    symbolResolver,
    externalResolver,
  }: {
    name: string;
    typeNode: TypeNode;
    context: ExtractorContext;
    options: AnalysisOptions;
    typeAsString: string;
    typeName: string;
    typeArgs: TypeNode[];
    symbolResolver: SymbolResolver;
    externalResolver: ExternalTypeResolver;
  }): PropertyInfo | null {
    // 1. Check for generic type parameter substitution first
    if (options.genericContext?.hasSubstitution(typeName)) {
      return this.handleGenericSubstitution({
        name,
        typeName,
        context,
        options,
      });
    }

    // 2. Handle utility types (Pick, Omit, etc.)
    const utilityTypeRegistry = this.typeAnalyzer.getUtilityTypeRegistry();
    if (utilityTypeRegistry.isUtilityType(typeName)) {
      return utilityTypeRegistry.expand({
        typeName,
        name,
        typeArgs,
        context,
        options,
      });
    }

    // 3. Try to resolve as local type
    const localResolution = this.resolveLocalType({
      name,
      typeName,
      typeAsString,
      typeNode,
      typeArgs,
      context,
      options,
      symbolResolver,
    });
    if (localResolution) {
      return localResolution;
    }

    // 4. Try to resolve as external type
    const externalResult = externalResolver.resolve({
      typeName,
      name,
      context,
      options,
    });
    if (externalResult.resolved) {
      return externalResult.property;
    }

    // 5. Try generic constraint resolution as last resort
    if (TypeGuards.looksLikeGenericParameter(typeName)) {
      const constraintResolution = this.resolveGenericConstraint({
        typeName,
        name,
        context,
        options,
        symbolResolver,
      });
      if (constraintResolution) {
        return constraintResolution;
      }
    }

    // 6. Return null if nothing resolved (will trigger fallback in parent)
    logAnalysisWarning(
      "ReferenceAnalyzer",
      `Could not resolve type reference: ${typeName}`,
      { typeName, typeAsString },
    );

    return null;
  }

  /** Handle generic type parameter substitution. */
  private handleGenericSubstitution(config: {
    name: string;
    typeName: string;
    context: ExtractorContext;
    options: AnalysisOptions;
  }): PropertyInfo | null {
    const substitution = config.options.genericContext?.getSubstitution(
      config.typeName,
    );
    if (!substitution) {
      return null;
    }

    return this.typeAnalyzer.analyze({
      name: config.name,
      typeNode: substitution,
      context: config.context,
      options: {
        ...config.options,
        // Keep the generic context in case the substitution has its own generics
        ...(config.options.genericContext && {
          genericContext: config.options.genericContext,
        }),
      },
    });
  }

  /** Resolve a local type using the symbol resolver and declaration strategies. */
  private resolveLocalType(config: {
    name: string;
    typeName: string;
    typeAsString: string;
    typeNode: TypeNode;
    typeArgs: TypeNode[];
    context: ExtractorContext;
    options: AnalysisOptions;
    symbolResolver: SymbolResolver;
  }): PropertyInfo | null {
    const resolvedSymbol = config.symbolResolver.resolve(config.typeName);
    if (!resolvedSymbol) {
      return null;
    }

    // Find appropriate strategy for this declaration type
    const strategy = this.declarationStrategies.find((s) =>
      s.canHandle(resolvedSymbol.declaration),
    );

    if (!strategy) {
      logAnalysisWarning(
        "ReferenceAnalyzer",
        `No strategy found for declaration type: ${resolvedSymbol.declaration.getKindName()}`,
        {
          typeName: config.typeName,
          declarationKind: resolvedSymbol.declaration.getKindName(),
        },
      );
      return null;
    }

    // Create analysis context for the strategy
    const analysisContext: DeclarationAnalysisContext = {
      name: config.name,
      typeNode: config.typeNode,
      declaration: resolvedSymbol.declaration,
      typeArgs: config.typeArgs,
      typeName: config.typeName,
      typeAsString: config.typeAsString,
      extractorContext: config.context,
      options: config.options,
    };

    return strategy.analyze(analysisContext);
  }

  /** Try to resolve a generic type parameter using constraints. */
  private resolveGenericConstraint(config: {
    typeName: string;
    name: string;
    context: ExtractorContext;
    options: AnalysisOptions;
    symbolResolver: SymbolResolver;
  }): PropertyInfo | null {
    // Get the current interface being analyzed
    const currentInterface = config.context.getCurrentInterface();
    if (!currentInterface) {
      return null;
    }

    // Look for the type parameter constraint
    const constraintType = getTypeParameterConstraintOrDefault(
      currentInterface,
      config.typeName,
    );
    if (!constraintType) {
      return null;
    }

    try {
      // Try to resolve the constraint type
      const constraintTypeName = constraintType.getText();
      const resolvedConstraint =
        config.symbolResolver.resolve(constraintTypeName);

      if (!resolvedConstraint) {
        return null;
      }

      // Add dependency for the constraint type
      config.context.addDependency({
        target: resolvedConstraint.target,
        dependency: constraintTypeName,
      });

      // Find strategy for the constraint declaration
      const strategy = this.declarationStrategies.find((s) =>
        s.canHandle(resolvedConstraint.declaration),
      );

      if (!strategy) {
        return null;
      }

      // Analyze using the constraint type but preserve the original property name
      const analysisContext: DeclarationAnalysisContext = {
        name: config.name, // Use original property name
        typeNode: constraintType,
        declaration: resolvedConstraint.declaration,
        typeName: constraintTypeName,
        typeAsString: constraintTypeName,
        extractorContext: config.context,
        options: config.options,
      };

      return strategy.analyze(analysisContext);
    } catch (error) {
      logAnalysisWarning(
        "ReferenceAnalyzer",
        `Error resolving generic constraint for: ${config.typeName}`,
        {
          error: error instanceof Error ? error.message : String(error),
          typeName: config.typeName,
        },
      );
      return null;
    }
  }
}
