import type { SourceFile } from "ts-morph";
import type { ResolvedSymbol } from "../../types.ts";

export class SymbolCache {
  private cache = new Map<string, ResolvedSymbol | null>();

  /** Generate a cache key for a symbol in a specific file context */
  private generateKey(symbolName: string, filePath: string): string {
    return `${filePath}:${symbolName}`;
  }

  /** Get a cached symbol resolution result */
  get(
    symbolName: string,
    sourceFile: SourceFile,
  ): ResolvedSymbol | null | undefined {
    const key = this.generateKey(symbolName, sourceFile.getFilePath());
    const result = this.cache.get(key);

    return result;
  }

  /** Cache a symbol resolution result */
  set(
    symbolName: string,
    sourceFile: SourceFile,
    result: ResolvedSymbol | null,
  ): void {
    const key = this.generateKey(symbolName, sourceFile.getFilePath());
    this.cache.set(key, result);
  }

  /** Clear all cached entries */
  clear(): void {
    this.cache.clear();
  }
}
