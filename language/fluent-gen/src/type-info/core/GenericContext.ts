import type { TypeNode } from "ts-morph";

/**
 * Manages generic type parameter substitutions during type analysis.
 *
 * This class tracks mappings between generic type parameters (like 'T')
 * and their concrete type substitutions (like 'AnyTextAsset').
 */
export class GenericContext {
  private substitutions = new Map<string, TypeNode>();

  constructor(substitutions?: Map<string, TypeNode>) {
    if (substitutions) {
      this.substitutions = new Map(substitutions);
    }
  }

  /** Add a generic type parameter substitution. */
  addSubstitution(parameterName: string, typeNode: TypeNode): void {
    this.substitutions.set(parameterName, typeNode);
  }

  /** Get the substitution for a generic type parameter. */
  getSubstitution(parameterName: string): TypeNode | undefined {
    return this.substitutions.get(parameterName);
  }

  /** Check if a type parameter has a substitution. */
  hasSubstitution(parameterName: string): boolean {
    return this.substitutions.has(parameterName);
  }

  /** Create a new context with additional substitutions. */
  withSubstitutions(
    additionalSubstitutions: Map<string, TypeNode>,
  ): GenericContext {
    const newSubstitutions = new Map(this.substitutions);
    for (const [key, value] of additionalSubstitutions) {
      newSubstitutions.set(key, value);
    }
    return new GenericContext(newSubstitutions);
  }

  /** Get all current substitutions for debugging. */
  getAllSubstitutions(): Map<string, string> {
    const result = new Map<string, string>();
    for (const [key, typeNode] of this.substitutions) {
      result.set(key, typeNode.getText());
    }
    return result;
  }

  /** Create an empty generic context. */
  static empty(): GenericContext {
    return new GenericContext();
  }
}
