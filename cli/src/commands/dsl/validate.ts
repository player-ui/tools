import glob from "globby";
import logSymbols from "log-symbols";
import { promises as fs } from "fs";
import * as ts from "typescript";
import { Flags } from "@oclif/core";
import { BaseCommand } from "../../utils/base-command";
import { convertToFileGlob } from "../../utils/fs";
import { DEFAULT_COMPILER_OPTIONS } from "../../utils/compiler-options";
/** A command thay runs TS typechecker against source ts and tsx files */
export default class Validate extends BaseCommand {
  static description = "Validate TSX files before they get compiled";

  static flags = {
    ...BaseCommand.flags,
    files: Flags.string({
      char: "f",
      description: "A list of files or globs to validate",
      multiple: true,
    }),
  };

  private async getOptions() {
    const { flags } = await this.parse(Validate);
    const config = await this.getPlayerConfig();

    const files =
      flags.files && flags.files.length > 0 ? flags.files : config.dsl?.src;

    if (!files) {
      throw new Error("DSL TSC typechecking requires a file list");
    }

    return {
      inputFiles: Array.isArray(files) ? files : [files],
    };
  }

  private async getTSConfig(
    filePath?: string,
    compilerOptions: ts.CompilerOptions = {}
  ): Promise<ts.CompilerOptions | undefined> {
    let TSEnvConfig, configFile;

    const EnvTSConfigPath = filePath
      ? filePath
      : glob.sync("./tsconfig.json")[0];

    this.log(`Loading TypeScript config from path ${EnvTSConfigPath}`);

    try {
      configFile = await fs.readFile(EnvTSConfigPath);
    } catch (e) {
      this.warn(
        "Error reading TypeScript configuration file, falling back to internal defaults"
      );
      return;
    }

    const compilerConfigObject =
      configFile && JSON.parse(configFile.toString());

    const configCompilerOpts = compilerConfigObject?.compilerOptions || {};

    if (compilerConfigObject.extends) {
      TSEnvConfig = await this.getTSConfig(compilerConfigObject.extends, {
        ...compilerOptions,
        ...configCompilerOpts,
      });
    } else {
      TSEnvConfig = {
        ...compilerOptions,
        ...configCompilerOpts,
      };
    }

    if (TSEnvConfig && Object.keys(TSEnvConfig).length > 0) {
      if (!compilerConfigObject.extends)
        this.debug(
          `Final effective config: ${JSON.stringify(TSEnvConfig, null, 4)}`
        );

      return TSEnvConfig;
    }

    this.log(
      `No local TypeScript compiler configuration could be found, falling back to internal defaults`
    );
  }

  async run(): Promise<void> {
    const { inputFiles } = await this.getOptions();

    const files = await glob(
      convertToFileGlob(inputFiles, "**/*.(tsx|jsx|js|ts)"),
      {
        expandDirectories: true,
      }
    );

    const TSConfig = (await this.getTSConfig()) ?? DEFAULT_COMPILER_OPTIONS;

    const program = ts.createProgram(files, TSConfig);

    const allDiagnostics = ts.getPreEmitDiagnostics(program);

    let diagnosticsCount = 0;

    const groupedDiagnostics = allDiagnostics.reduce(
      (
        acc: {
          [key: string]: any[];
        },
        diagnostic
      ) => {
        const fileName = diagnostic.file?.fileName;
        if (fileName && files.includes(fileName)) {
          if (!acc[fileName]) {
            acc[fileName] = [];
          }

          acc[fileName].push(diagnostic);
          diagnosticsCount += 1;
        }

        return acc;
      },
      {}
    );

    const fileNameList = Object.keys(groupedDiagnostics);

    fileNameList.forEach((diagnosticGroup) => {
      this.log(`${diagnosticGroup}`);
      groupedDiagnostics[diagnosticGroup].forEach((diagnostic) => {
        if (diagnostic.file) {
          const { line, character } = ts.getLineAndCharacterOfPosition(
            diagnostic.file,
            diagnostic.start!
          );
          const message = ts.flattenDiagnosticMessageText(
            diagnostic.messageText,
            "\n"
          );

          this.log(
            `  ${logSymbols.error} (${line + 1},${character + 1}): ${message}`
          );
        } else {
          this.log(
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
          );
        }
      });
    });

    if (fileNameList.length) {
      this.log(
        `${diagnosticsCount} type or syntax errors found in 
        ${fileNameList.length} 
        file${fileNameList.length > 1 ? "s" : ""}, exiting program`
      );
      this.exit(1);
    } else {
      this.log(`${logSymbols.success} No TSX types or errors found.`);
    }
  }
}
