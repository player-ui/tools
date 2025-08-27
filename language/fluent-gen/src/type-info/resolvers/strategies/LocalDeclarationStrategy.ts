import type { SourceFile } from "ts-morph";
import type {
  Declaration,
  ResolvedSymbol,
  ResolutionContext,
} from "../../types.js";
import type { ResolutionStrategy } from "./ResolutionStrategy.js";

export class LocalDeclarationStrategy implements ResolutionStrategy {
  name = "LocalDeclaration";

  canResolve(_context: ResolutionContext): boolean {
    // This strategy can always attempt to resolve
    return true;
  }

  resolve(context: ResolutionContext): ResolvedSymbol | null {
    const declaration = this.findDeclaration(
      context.symbolName,
      context.sourceFile,
    );

    if (!declaration) return null;

    return {
      declaration,
      target: {
        kind: "local",
        filePath: context.sourceFile.getFilePath(),
        name: context.symbolName,
      },
      isLocal: true,
    };
  }

  private findDeclaration(
    symbolName: string,
    sourceFile: SourceFile,
  ): Declaration | null {
    // Check interfaces
    const interfaceDecl = sourceFile
      .getInterfaces()
      .find((iface) => iface.getName() === symbolName);
    if (interfaceDecl) return interfaceDecl;

    // Check enums
    const enumDecl = sourceFile
      .getEnums()
      .find((enumDecl) => enumDecl.getName() === symbolName);
    if (enumDecl) return enumDecl;

    // Check type aliases
    const typeAlias = sourceFile
      .getTypeAliases()
      .find((alias) => alias.getName() === symbolName);
    if (typeAlias) return typeAlias;

    return null;
  }
}
