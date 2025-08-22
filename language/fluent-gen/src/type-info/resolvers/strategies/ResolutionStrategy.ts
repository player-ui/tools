import type { ResolvedSymbol, ResolutionContext } from "../../types.js";

/**
 * Base interface for symbol resolution strategies
 */
export interface ResolutionStrategy {
  name: string;
  canResolve(context: ResolutionContext): boolean;
  resolve(context: ResolutionContext): ResolvedSymbol | null;
}
