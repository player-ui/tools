import ts from "typescript";
import * as tsvfs from "@typescript/vfs";

export interface SetupReturnType {
  /**
   * Virtual source file containing the passed in text
   */
  sf: ts.SourceFile;
  /**
   * Type checker for the virtual program
   */
  tc: ts.TypeChecker;
}

/**
 * Setups a virtual TS environment for tests
 */
export function setupTestEnv(
  sourceCode: string,
  mockFileName = "filename.ts",
): SetupReturnType {
  const fsMap = tsvfs.createDefaultMapFromNodeModules({}, ts);
  fsMap.set(mockFileName, sourceCode);

  const system = tsvfs.createSystem(fsMap);
  const host = tsvfs.createVirtualCompilerHost(system, {}, ts);

  const program = ts.createProgram({
    rootNames: [...fsMap.keys()],
    options: {},
    host: host.compilerHost,
  });

  return {
    sf: host.compilerHost.getSourceFile(
      mockFileName,
      ts.ScriptTarget.ES5,
    ) as ts.SourceFile,
    tc: program.getTypeChecker(),
  };
}
