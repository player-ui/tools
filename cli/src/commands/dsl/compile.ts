import { Flags } from "@oclif/core";
import glob from "globby";
import path from "path";
import { promises as fs } from "fs";
import mkdirp from "mkdirp";
import logSymbols from "log-symbols";
import figures from "figures";
import chalk from "chalk";
import type { CompilationResult } from "@player-tools/dsl";
import { fingerprintContent as fallbackFingerprint } from "@player-tools/dsl";
import { BaseCommand } from "../../utils/base-command";
import { convertToFileGlob, normalizePath } from "../../utils/fs";
import type { CompletedTask } from "../../utils/task-runner";
import { registerForPaths } from "../../utils/babel-register";
import Validate from "../json/validate";
import ValidateTSTypes from "./validate";

type TaskResult = Array<Omit<CompletedTask<CompilationResult, any>, "run">>;

/** A command to compile player DSL content into JSON */
export default class DSLCompile extends BaseCommand {
  static description = "Compile Player DSL files into JSON";

  static flags = {
    ...BaseCommand.flags,
    input: Flags.string({
      char: "i",
      description:
        "An input directory to compile.\nAny jsx/ts/tsx files will be loaded via babel-require automatically.",
    }),
    output: Flags.string({
      char: "o",
      description: "Output directory to write results to.",
    }),
    "skip-validation": Flags.boolean({
      description: "Option to skip validating the generated JSON",
    }),
    exp: Flags.boolean({
      description: "Use experimental language features",
      default: false,
    }),
    severity: Flags.string({
      char: "s",
      description: "The severity of validation issues",
      options: ["error", "warn"],
      default: "error",
    }),
  };

  private async getOptions() {
    const { flags } = await this.parse(DSLCompile);
    const config = await this.getPlayerConfig();

    const input = flags.input ?? config.dsl?.src;
    const { exp } = flags;

    if (!input) {
      throw new Error(`Input files are required for DSL compilation`);
    }

    return {
      input,
      output: flags.output ?? config.dsl?.outDir ?? "_out",
      skipValidation:
        flags["skip-validation"] ?? config.dsl?.skipValidation ?? false,
      exp,
      severity: flags.severity,
      loglevel: flags.loglevel,
    };
  }

  async run(): Promise<{
    /** the status code */
    exitCode: number;
  }> {
    const { input, output, skipValidation, exp, severity, loglevel } =
      await this.getOptions();

    const files = await glob(
      convertToFileGlob([input], "**/*.(tsx|jsx|js|ts)"),
      {
        expandDirectories: true,
      },
    );

    const results = {
      exitCode: 0,
    };

    registerForPaths();

    this.debug("Found %i files to process", files.length);

    if (!skipValidation) {
      await ValidateTSTypes.run(["-f", input, "-s", severity]);
    }

    const context = await this.createCompilerContext();

    /** Compile a file from the DSL format into JSON */
    const compileFile = async (
      file: string,
    ): Promise<CompilationResult | undefined> => {
      // Check if any plugin wants to skip this file
      const shouldSkipCompilation =
        await context.hooks.skipCompilation.call(file);

      if (shouldSkipCompilation) {
        this.log(
          `${logSymbols.info} Skipping compilation for %s`,
          normalizePath(file),
        );
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const requiredModule = require(path.resolve(file));
      const defaultExport = requiredModule.default;

      if (!defaultExport) {
        return;
      }

      const preProcessedValue =
        await context.dslCompiler.hooks.preProcessFlow.call(defaultExport);
      const { type: contentType, extension: ext } =
        (await context.hooks.identifyContentType.call(
          file,
          preProcessedValue,
        )) || {
          type: fallbackFingerprint(preProcessedValue, file) || "unknown",
          extension: ".json",
        };

      let relativePath = path.relative(input, file);
      if (!relativePath) {
        relativePath = path.basename(file);
      }

      const outputFile = path.join(
        output,
        path.format({
          ...path.parse(relativePath),
          base: undefined,
          ext,
        }),
      );

      this.log(
        `${logSymbols.info} Compiling %s ${figures.arrowRight} %s as type %s`,
        normalizePath(file),
        normalizePath(outputFile),
        contentType,
      );

      const compileResult = await context.hooks.compileContent.call(
        { type: contentType },
        preProcessedValue,
        file,
      );

      if (compileResult) {
        await mkdirp(path.dirname(outputFile));
        await fs.writeFile(outputFile, compileResult.value);
        if (compileResult.sourceMap) {
          await fs.writeFile(`${outputFile}.map`, compileResult.sourceMap);
        }

        return {
          contentType,
          outputFile,
          inputFile: file,
        };
      } else {
        this.log(
          `${logSymbols.error} Error compiling %s, no result was returned by compiler`,
          normalizePath(file),
        );
        throw new Error(`Error compiling file ${normalizePath(file)}`);
      }
    };

    const compilerResults: TaskResult = [];

    // This has to be done serially b/c of the way React logs messages to console.error
    // Otherwise the errors in console will be randomly interspersed between update messages
    for (let fIndex = 0; fIndex < files.length; fIndex += 1) {
      const file = files[fIndex];
      try {
        const result = await compileFile(file);
        compilerResults.push({
          output: result,
          state: "completed",
        });
      } catch (e: any) {
        results.exitCode = 100;
        this.log("");
        this.log(
          chalk.red(`${logSymbols.error} Error compiling ${file}: ${e.stack}`),
        );
        compilerResults.push({
          state: "completed",
          error: e,
        });
      }
    }

    await context.dslCompiler.hooks.onEnd.call({ output });

    if (!skipValidation) {
      console.log("");
      const hasOutput = compilerResults.some(
        (r) => r.output?.contentType === "flow",
      );
      if (hasOutput) {
        await Validate.run([
          "-f",
          ...compilerResults
            .filter((r) => r.output?.contentType === "flow")
            .map((result) => {
              return result.output?.outputFile ?? "";
            }),
          ...(exp ? ["--exp"] : []),
          "-s",
          severity,
          "-v",
          loglevel,
        ]);
      } else {
        console.log("No output to validate");
      }
    }

    this.exit(results.exitCode);
    return results;
  }
}
