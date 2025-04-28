import { Flags } from "@oclif/core";
import glob from "globby";
import { promises as fs } from "fs";
import { TextDocument } from "vscode-languageserver-textdocument";
import { DiagnosticSeverity } from "vscode-languageserver-types";
import { BaseCommand } from "../../utils/base-command";
import { validationRenderer } from "../../utils/diag-renderer";
import { convertToFileGlob } from "../../utils/fs";
import { createTaskRunner } from "../../utils/task-runner";
import { stringToLogLevel } from "../../utils/log-levels";

/** A command to validate JSON content */
export default class Validate extends BaseCommand {
  static description = "Validate Player JSON content";

  static flags = {
    ...BaseCommand.flags,
    files: Flags.string({
      char: "f",
      description: "A list of files or globs to validate",
      multiple: true,
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
    const { flags } = await this.parse(Validate);
    const config = await this.getPlayerConfig();

    const files =
      flags.files && flags.files.length > 0 ? flags.files : config.json?.src;

    const { exp } = flags;

    if (!files) {
      throw new Error("JSON validation requires a file list");
    }

    return {
      files: Array.isArray(files) ? files : [files],
      exp,
      severity: flags.severity,
      loglevel: flags.loglevel,
    };
  }

  async run(): Promise<{
    /** the status code */
    exitCode: number;
  }> {
    const {
      files: inputFiles,
      exp,
      severity,
      loglevel,
    } = await this.getOptions();
    const expandedFilesList = convertToFileGlob(inputFiles, "**/*.json");
    this.debug("Searching for files using: %o", expandedFilesList);
    const files = await glob(expandedFilesList, {
      expandDirectories: true,
    });

    this.debug("Found %i files to process", files.length);

    const results = {
      exitCode: 0,
    };
    const lsp = await this.createLanguageService(exp);

    const taskRunner = createTaskRunner({
      renderer: validationRenderer,
      tasks: files.map((f) => ({
        data: {
          file: f,
        },
        run: async () => {
          const contents = await fs.readFile(f, "utf-8");

          const validations =
            (await lsp.validateTextDocument(
              TextDocument.create(`file://${f}`, "json", 1, contents),
            )) ?? [];

          return validations;
        },
      })),
      loglevel: stringToLogLevel(loglevel),
    });

    const taskResults = await taskRunner.run();

    if (severity !== "error") {
      taskResults.forEach((t) => {
        if (
          t.error ||
          t.output.some((d) => d.severity === DiagnosticSeverity.Error)
        ) {
          results.exitCode = 100;
        }
      });
    }

    this.debug("finished");
    this.exit(results.exitCode);

    return results;
  }
}
