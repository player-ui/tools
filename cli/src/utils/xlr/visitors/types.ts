import type { TsConverter } from "@player-tools/xlr-converters";
import type ts from "typescript";

export interface VisitorProps {
  /** The source file to process */
  sourceFile: ts.SourceFile;

  /** An instance of a typescript type checker */
  checker: ts.TypeChecker;

  /**  An instance of a XLR converter */
  converter: TsConverter;

  /** Where to write converted XLRs to */
  outputDirectory: string;
}
