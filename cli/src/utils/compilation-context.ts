import type {
  DSLCompiler,
  CompilerReturn,
  SerializeContext,
} from '@player-tools/dsl';
import { isDefaultCompilerContentType } from '@player-tools/dsl';
import { AsyncSeriesBailHook } from 'tapable-ts';

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
     * @returns string with the content type.
     */
    identifyContentType: new AsyncSeriesBailHook<[string, any], string>(),

    /**
     * Function for returning the compile content given an specific type or condition
     *
     * @param context - Settings for the content to be compiled, such as type
     * @param content - The contents in the file
     * @param fileName - The relative name of the file
     * @returns CompilerReturn object instance or undefined
     */
    compileContent: new AsyncSeriesBailHook<
      [SerializeContext, any, string],
      CompilerReturn
    >(),
  };

  /** A DSL compiler instance */
  public dslCompiler: DSLCompiler;

  constructor(dslCompiler: DSLCompiler) {
    this.dslCompiler = dslCompiler;

    this.hooks.compileContent.tap('default', async ({ type }, content) => {
      if (isDefaultCompilerContentType(type)) {
        return this.dslCompiler.serialize(content, { type });
      }
    });
  }
}
