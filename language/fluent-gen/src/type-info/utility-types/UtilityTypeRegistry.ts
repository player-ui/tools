import type { TypeNode } from "ts-morph";
import type { PropertyInfo } from "../types.js";
import type { ExtractorContext } from "../core/ExtractorContext.js";
import type {
  AnalysisOptions,
  TypeAnalyzer,
} from "../analyzers/TypeAnalyzer.js";
import { UtilityTypeExpander } from "./UtilityTypeExpander.js";
import { PickExpander } from "./PickExpander.js";
import { OmitExpander } from "./OmitExpander.js";
import { PartialExpander } from "./PartialExpander.js";
import { RequiredExpander } from "./RequiredExpander.js";
import { RecordExpander } from "./RecordExpander.js";
import { NonNullableExpander } from "./NonNullableExpander.js";

/**
 * Registry for utility type expanders.
 * Manages all utility type handling in one place.
 */
export class UtilityTypeRegistry {
  private readonly expanders = new Map<string, UtilityTypeExpander>();

  constructor(private readonly typeAnalyzer: TypeAnalyzer) {
    this.registerDefaultExpanders();
  }

  /** Register the default utility type expanders. */
  private registerDefaultExpanders(): void {
    this.register(new PickExpander(this.typeAnalyzer));
    this.register(new OmitExpander(this.typeAnalyzer));
    this.register(new PartialExpander(this.typeAnalyzer));
    this.register(new RequiredExpander(this.typeAnalyzer));
    this.register(new RecordExpander(this.typeAnalyzer));
    this.register(new NonNullableExpander(this.typeAnalyzer));
  }

  /** Register a new utility type expander. */
  register(expander: UtilityTypeExpander): void {
    this.expanders.set(expander.getTypeName(), expander);
  }

  /** Expand a utility type with the given arguments. */
  expand({
    typeName,
    name,
    typeArgs,
    context,
    options,
  }: {
    typeName: string;
    name: string;
    typeArgs: TypeNode[];
    context: ExtractorContext;
    options?: AnalysisOptions;
  }): PropertyInfo | null {
    const expander = this.expanders.get(typeName);
    if (!expander) {
      return null;
    }

    return expander.expand({
      name,
      typeArgs,
      context,
      ...(options ? { options } : {}),
    });
  }

  /** Check if a type name is a registered utility type. */
  isUtilityType(typeName: string): boolean {
    return this.expanders.has(typeName);
  }

  /** Get all registered utility type names. */
  getRegisteredTypes(): string[] {
    return Array.from(this.expanders.keys());
  }

  /** Unregister a utility type expander (useful for testing). */
  unregister(typeName: string): boolean {
    return this.expanders.delete(typeName);
  }
}
