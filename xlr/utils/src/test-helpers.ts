import * as ts from 'typescript';

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
export function setupTestEnv(sourceCode: string, mockFileName = 'filename.ts') {
  const sourceFile = ts.createSourceFile(
    mockFileName,
    sourceCode,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true
  );

  const outputs = [];

  const compilerHost = {
    getSourceFile(filename: any) {
      if (filename === mockFileName) {
        return sourceFile;
      }

      return undefined;
    },
    writeFile(name: any, text: any, writeByteOrderMark: any) {
      outputs.push({ name, text, writeByteOrderMark });
    },
    getDefaultLibFileName() {
      return 'lib.d.ts';
    },
    useCaseSensitiveFileNames() {
      return false;
    },
    getCanonicalFileName(filename: any) {
      return filename;
    },
    getCurrentDirectory() {
      return '';
    },
    getNewLine() {
      return '\n';
    },
    fileExists(fileName: string) {
      if (fileName === mockFileName) {
        return true;
      }

      return false;
    },
    readFile(fileName: string) {
      if (fileName === mockFileName) {
        return sourceCode;
      }

      return undefined;
    },
  };

  const program = ts.createProgram([mockFileName], {}, compilerHost);

  return { sf: sourceFile, tc: program.getTypeChecker() };
}
