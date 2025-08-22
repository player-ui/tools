import * as path from "path";
import { Project, SourceFile } from "ts-morph";
import type { ResolvedSymbol, ModuleResolutionOptions } from "../../types.js";
import { FileSystemUtils } from "../utils/FileSystemUtils.js";
import { LocalDeclarationStrategy } from "../strategies/LocalDeclarationStrategy.js";

export class ExternalModuleResolver {
  private readonly localStrategy = new LocalDeclarationStrategy();

  constructor(private readonly project: Project) {}

  /**
   * Resolve a symbol from an external module
   */
  resolve(options: ModuleResolutionOptions): ResolvedSymbol | null {
    const declarationPath = this.findModuleDeclarationFile(
      options.moduleSpecifier,
      options.sourceFile,
    );

    if (!declarationPath) {
      console.debug(
        `Could not find declaration file for module: ${options.moduleSpecifier}`,
      );
      return null;
    }

    try {
      const externalFile = this.project.addSourceFileAtPath(declarationPath);

      // First, try direct declaration
      const directResult = this.localStrategy.resolve({
        symbolName: options.symbolName,
        sourceFile: externalFile,
      });

      if (directResult) {
        return {
          ...directResult,
          target: { kind: "module", name: options.moduleSpecifier },
          isLocal: false,
        };
      }

      // Then check for re-exports
      return this.findReexportedSymbol(
        options.symbolName,
        externalFile,
        options.moduleSpecifier,
      );
    } catch (error) {
      console.warn(
        `Failed to resolve external symbol ${options.symbolName} from ${options.moduleSpecifier}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Find the TypeScript declaration file for a module
   */
  private findModuleDeclarationFile(
    moduleSpecifier: string,
    sourceFile: SourceFile,
  ): string | null {
    const nodeModules = FileSystemUtils.findNodeModules(
      sourceFile.getFilePath(),
    );

    if (!nodeModules) return null;

    const modulePath = path.join(nodeModules, moduleSpecifier);

    // Try package.json first
    const packageJson = FileSystemUtils.readPackageJson(modulePath);
    if (packageJson) {
      const typesPath = (packageJson.types || packageJson.typings) as string;
      if (typesPath) {
        const resolvedPath = path.resolve(modulePath, typesPath);
        if (FileSystemUtils.fileExists(resolvedPath)) {
          return resolvedPath;
        }
      }
    }

    // Try common declaration file locations
    const candidates = [
      path.join(modulePath, "index.d.ts"),
      path.join(modulePath, "dist", "index.d.ts"),
      path.join(modulePath, "lib", "index.d.ts"),
      path.join(modulePath, "types", "index.d.ts"),
      `${modulePath}.d.ts`,
    ];

    for (const candidate of candidates) {
      if (FileSystemUtils.fileExists(candidate)) {
        return candidate;
      }
    }

    return null;
  }

  /**
   * Find a symbol that's re-exported from another module
   */
  private findReexportedSymbol(
    symbolName: string,
    externalFile: SourceFile,
    originalModule: string,
  ): ResolvedSymbol | null {
    for (const exportDecl of externalFile.getExportDeclarations()) {
      const moduleSpec = exportDecl.getModuleSpecifier();
      if (!moduleSpec) continue;

      const namedExports = exportDecl.getNamedExports();
      const hasSymbol = namedExports.some(
        (exp) => exp.getName() === symbolName,
      );

      if (!hasSymbol) continue;

      const reexportPath = moduleSpec.getLiteralValue();

      try {
        // Recursively resolve the re-export
        const resolvedPath = reexportPath.startsWith(".")
          ? FileSystemUtils.resolveRelativeImport(
              reexportPath,
              externalFile.getFilePath(),
            )
          : this.findModuleDeclarationFile(reexportPath, externalFile);

        if (!resolvedPath) continue;

        const reexportFile = this.project.addSourceFileAtPath(resolvedPath);
        const result = this.localStrategy.resolve({
          symbolName,
          sourceFile: reexportFile,
        });

        if (result) {
          return {
            ...result,
            target: { kind: "module", name: originalModule },
            isLocal: false,
          };
        }
      } catch (error) {
        console.debug(`Failed to resolve re-export: ${reexportPath}`, error);
      }
    }

    return null;
  }
}
