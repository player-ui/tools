import type { TypeNode } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import { PrimitiveAnalyzer } from "./PrimitiveAnalyzer.js";
import { ArrayAnalyzer } from "./ArrayAnalyzer.js";
import { UnionAnalyzer } from "./UnionAnalyzer.js";
import { IntersectionAnalyzer } from "./IntersectionAnalyzer.js";
import { ObjectAnalyzer } from "./ObjectAnalyzer.js";
import { ReferenceAnalyzer } from "./ReferenceAnalyzer.js";
import { TupleAnalyzer } from "./TupleAnalyzer.js";
import { UtilityTypeRegistry } from "../utility-types/UtilityTypeRegistry.js";
import { logAnalysisWarning } from "./utils.js";
import { GenericContext } from "../core/GenericContext.js";
import { PropertyFactory } from "../factories/PropertyFactory.js";

/** Options for type analysis behavior. */
export interface AnalysisOptions {
  /** Whether this property is optional */
  isOptional?: boolean;
  /** Whether this is an array element type */
  isArray?: boolean;
  /** Maximum depth for nested type expansion */
  maxDepth?: number;
  /** Current depth (used internally for recursion control) */
  currentDepth?: number;
  /** Generic type parameter context for substitutions */
  genericContext?: GenericContext;
}

/** Strategy interface for different type analysis approaches. */
export interface TypeAnalysisStrategy {
  /** Check if this strategy can handle the given type node. */
  canHandle(typeNode: TypeNode): boolean;

  /** Analyze the type node and return property information. */
  analyze(args: {
    name: string;
    typeNode: TypeNode;
    context: ExtractorContext;
    options?: AnalysisOptions;
  }): PropertyInfo | null;
}

/**
 * Main type analyzer that uses strategy pattern to delegate analysis
 * to specialized analyzers based on the type node.
 */
export class TypeAnalyzer {
  private readonly strategies: TypeAnalysisStrategy[];
  private readonly utilityTypeRegistry: UtilityTypeRegistry;

  constructor() {
    // Initialize utility type registry first
    this.utilityTypeRegistry = new UtilityTypeRegistry(this);

    // Register strategies in order of precedence
    this.strategies = [
      new ArrayAnalyzer(this), // Handle arrays first (including Array<T> syntax)
      new TupleAnalyzer(this), // Handle tuples before other types
      new UnionAnalyzer(this), // Handle unions before references
      new IntersectionAnalyzer(this), // Handle intersections before references
      new PrimitiveAnalyzer(), // Handle primitives and literals
      new ObjectAnalyzer(this), // Handle inline object types
      new ReferenceAnalyzer(this), // Handle type references last (catch-all)
    ];
  }

  /** Analyze a type node using the appropriate strategy. */
  analyze({
    name,
    typeNode,
    context,
    options = {},
  }: {
    name: string;
    typeNode: TypeNode;
    context: ExtractorContext;
    options?: AnalysisOptions;
  }): PropertyInfo | null {
    // Apply depth limiting to prevent infinite recursion
    const currentDepth = options.currentDepth ?? 0;
    const maxDepth = options.maxDepth ?? 10;

    if (currentDepth >= maxDepth) {
      logAnalysisWarning(
        "TypeAnalyzer",
        `Maximum analysis depth (${maxDepth}) reached for property: ${name}`,
        { typeText: typeNode.getText(), currentDepth, maxDepth },
      );
      return this.createFallbackProperty(name, typeNode, options);
    }

    // Try each strategy in order
    for (const strategy of this.strategies) {
      if (strategy.canHandle(typeNode)) {
        const result = strategy.analyze({
          name,
          typeNode,
          context,
          options: {
            ...options,
            currentDepth: currentDepth + 1,
            // Preserve generic context through recursive calls
            ...(options.genericContext && {
              genericContext: options.genericContext,
            }),
          },
        });

        if (result) {
          return result;
        }
      }
    }

    // If no strategy handled the type, create a fallback
    return this.createFallbackProperty(name, typeNode, options);
  }

  /** Create a fallback property when no strategy can handle the type. */
  private createFallbackProperty(
    name: string,
    typeNode: TypeNode,
    options: AnalysisOptions = {},
  ): PropertyInfo {
    const typeAsString = typeNode.getText();

    logAnalysisWarning(
      "TypeAnalyzer",
      `Creating fallback property for unhandled type`,
      { name, typeAsString, availableStrategies: this.getStrategies() },
    );

    return PropertyFactory.createStringProperty({ name, options });
  }

  /**
   * Get the utility type registry instance.
   */
  getUtilityTypeRegistry(): UtilityTypeRegistry {
    return this.utilityTypeRegistry;
  }

  /**
   * Get information about all registered strategies (for debugging).
   */
  getStrategies(): string[] {
    return this.strategies.map((strategy) => strategy.constructor.name);
  }
}
