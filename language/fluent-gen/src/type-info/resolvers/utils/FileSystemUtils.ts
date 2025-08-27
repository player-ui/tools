import * as path from "path";
import * as fs from "fs";

export class FileSystemUtils {
  /** Resolve a relative import path to an absolute TypeScript file path */
  static resolveRelativeImport(
    moduleSpecifier: string,
    fromFile: string,
  ): string {
    let resolvedPath = path.resolve(path.dirname(fromFile), moduleSpecifier);

    // Handle .js/.mjs extensions in imports (ESM TypeScript)
    if (resolvedPath.match(/\.(js|mjs)$/)) {
      resolvedPath = resolvedPath.replace(/\.(js|mjs)$/, ".ts");
    }
    // Handle .jsx extension
    else if (resolvedPath.endsWith(".jsx")) {
      resolvedPath = resolvedPath.replace(/\.jsx$/, ".tsx");
    }
    // Add .ts extension if no extension present
    else if (!resolvedPath.match(/\.(ts|tsx)$/)) {
      // Try .ts first, then .tsx
      if (fs.existsSync(`${resolvedPath}.ts`)) {
        resolvedPath += ".ts";
      } else if (fs.existsSync(`${resolvedPath}.tsx`)) {
        resolvedPath += ".tsx";
      } else {
        // Default to .ts
        resolvedPath += ".ts";
      }
    }

    return resolvedPath;
  }

  /** Find the nearest node_modules directory from a starting path */
  static findNodeModules(startPath: string): string | null {
    let currentDir = path.dirname(startPath);

    while (currentDir !== path.dirname(currentDir)) {
      const nodeModulesPath = path.join(currentDir, "node_modules");
      if (fs.existsSync(nodeModulesPath)) {
        return nodeModulesPath;
      }
      currentDir = path.dirname(currentDir);
    }

    return null;
  }

  /** Read and parse a package.json file safely */
  static readPackageJson(packagePath: string): Record<string, unknown> | null {
    try {
      const packageJsonPath = path.join(packagePath, "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const content = fs.readFileSync(packageJsonPath, "utf-8");
        return JSON.parse(content);
      }
    } catch (error) {
      // Log but don't throw - this is expected for some packages
      console.debug(`Failed to read package.json at ${packagePath}:`, error);
    }
    return null;
  }

  /** Check if a file exists */
  static fileExists(filePath: string): boolean {
    try {
      return fs.existsSync(filePath);
    } catch {
      return false;
    }
  }
}
