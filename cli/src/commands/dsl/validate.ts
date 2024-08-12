import glob from "globby";
import logSymbols from "log-symbols";
import { existsSync, readFileSync } from "fs";
import path from "path";
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
    severity: Flags.string({
      char: "s",
      description: "The severity of the validation",
      options: ["error", "warn"],
      default: "error",
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
      severity: flags.severity,
    };
  }

  private getTSConfig(filePath?: string): ts.CompilerOptions | undefined {
    const configFileLocation = ts.findConfigFile(
      filePath ?? ".",
      (fName: string) => {
        return existsSync(fName);
      }
    );

    if (!configFileLocation) {
      this.debug(`No TSConfig found`);
      return;
    }

    const configContent = ts.readConfigFile(configFileLocation, (p) => {
      return readFileSync(p, "utf-8");
    });

    if (configContent.error) {
      this.warn(
        ts.flattenDiagnosticMessageText(configContent.error.messageText, "\n")
      );

      return;
    }

    const basePath = path.dirname(configFileLocation);
    const parsedConfigContent = ts.parseJsonConfigFileContent(
      configContent.config,
      ts.sys,
      basePath
    );

    if (parsedConfigContent.errors.length > 0) {
      throw new Error(
        `Error while parsing tsconfig: ${parsedConfigContent.errors
          .map((d) => {
            return ts.flattenDiagnosticMessageText(d.messageText, "\n");
          })
          .join("\n\n")}`
      );
    }

    return parsedConfigContent.options;
  }

  async run(): Promise<void> {
    const { inputFiles, severity } = await this.getOptions();

    const files = await glob(
      convertToFileGlob(inputFiles, "**/*.(tsx|jsx|js|ts)"),
      {
        expandDirectories: true,
      }
    );

    const TSConfig = this.getTSConfig() ?? DEFAULT_COMPILER_OPTIONS;

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
      if (severity === "error") {
        this.exit(1);
      }
    } else {
      this.log(`${logSymbols.success} No TSX types or errors found.`);
    }
  }
}
