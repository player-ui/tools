import type { DSLCompiler, SerializeContext } from "@player-tools/dsl";
import { isDefaultCompilerContentType } from "@player-tools/dsl";
import { AsyncSeriesBailHook } from "tapable-ts";

export interface identifyContentReturn {
  /** The identified type the content should be compiled as */
  type: string;
  /** The file extension the content should be written as */
  extension: string;
}

export interface compileContentArgs extends Omit<SerializeContext, "type"> {
  type: string;
}

export interface compilationResult {
  /** the JSON value of the source */
  value: string;

  /** The sourcemap of the content */
  sourceMap?: string;
}

/**
 *
 */
export class CompilationContext {
  /** Hooks to wrap the context of the compilation */
  public hooks = {
    /**
     * Function for determining a specific or desired content type given on the file contents or other conditions
     *
     * @param fileName - The relative name of the file
     * @param content - The contents in the file
     * @returns content type and extension
     */
    identifyContentType: new AsyncSeriesBailHook<
      [string, any],
      identifyContentReturn
    >(),

    /**
     * Function for returning the compile content given an specific type or condition
     *
     * @param context - Settings for the content to be compiled, such as type
     * @param content - The contents in the file
     * @param fileName - The relative name of the file
     * @returns CompilerReturn object instance or undefined
     */
    compileContent: new AsyncSeriesBailHook<
      [compileContentArgs, any, string],
      compilationResult
    >(),

    /**
     * Function for determining if a file should be skipped during compilation
     *
     * @param fileName - The relative name of the file
     * @returns true if the file should be skipped, false or undefined otherwise
     */
    skipCompilation: new AsyncSeriesBailHook<[string], boolean>(),
  };

  /** A DSL compiler instance */
  public dslCompiler: DSLCompiler;

  constructor(dslCompiler: DSLCompiler) {
    this.dslCompiler = dslCompiler;

    this.hooks.compileContent.tap("default", async ({ type }, content) => {
      if (isDefaultCompilerContentType(type)) {
        const compilationResults = await this.dslCompiler.serialize(content, {
          type,
        });

        if (compilationResults) {
          return {
            value: JSON.stringify(compilationResults.value, null, 2),
            sourceMap: compilationResults.sourceMap,
          };
        }
      }
    });
  }
}
