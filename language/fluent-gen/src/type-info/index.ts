import { Project } from "ts-morph";
import * as path from "path";
import type { ExtractResult } from "./types.js";
import { InterfaceExtractor } from "./core/InterfaceExtractor.js";

export * from "./types.js";

/**
 * TypeScript interface information extractor optimized for fluent builder generation.
 *
 * This function analyzes a TypeScript interface and returns all the information needed
 * to generate fluent builder APIs.
 */
export function extractTypescriptInterfaceInfo({
  filePath,
  interfaceName,
}: {
  filePath: string;
  interfaceName: string;
}): ExtractResult {
  const project = new Project({
    useInMemoryFileSystem: false,
    compilerOptions: {
      target: 99, // ScriptTarget.ESNext
      module: 99, // ModuleKind.ESNext
      strict: true,
      declaration: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      moduleResolution: 100, // ModuleResolutionKind.Node16
    },
  });

  // Load the target file
  const absolutePath = path.resolve(filePath);
  let sourceFile;

  try {
    sourceFile = project.addSourceFileAtPath(absolutePath);
  } catch (error) {
    throw new Error(
      `Failed to load source file '${filePath}'. Make sure the file exists and is accessible. Error: ${error}`,
    );
  }

  // Create the interface extractor and perform extraction
  const extractor = new InterfaceExtractor(project, sourceFile);
  return extractor.extract(interfaceName);
}
