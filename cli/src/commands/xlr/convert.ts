import { Flags } from "@oclif/core";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import type { ExportTypes } from "@player-tools/xlr-sdk";
import { XLRSDK } from "@player-tools/xlr-sdk";
import logSymbols from "log-symbols";
import { BaseCommand } from "../../utils/base-command";

const PlayerImportMap = new Map([
  [
    "@player-ui/types",
    ["Expression", "Asset", "Binding", "AssetWrapper", "Schema.DataType"],
  ],
]);

/**
 * Converts XLRs into a specific language
 */
export default class XLRConvert extends BaseCommand {
  static description = "Exports XLRs files to a specific language";

  static flags = {
    ...BaseCommand.flags,
    input: Flags.string({
      char: "i",
      description: "An input directory to search for types to export",
      default: "./dist",
    }),
    output: Flags.string({
      char: "o",
      description: "Output directory to write results to.",
    }),
    lang: Flags.enum({
      char: "l",
      description:
        "Search strategy for types to export: plugin (default, looks for exported EnchancedPlayerPlugin classes) or type (all exported types)",
      options: ["TypeScript"],
    }),
  };

  private async getOptions() {
    const { flags } = await this.parse(XLRConvert);

    const { input, output } = flags;

    if (!output) {
      throw new Error(`Need to specify location to export to`);
    }

    const language = flags.lang as ExportTypes;

    if (!language) {
      throw new Error(`Need to specifiy lanauge to export to`);
    }

    return {
      inputPath: input,
      outputDir: path.join(output, language),
      language,
    };
  }

  async run(): Promise<{
    /** the status code */
    exitCode: number;
  }> {
    const { inputPath, outputDir, language } = await this.getOptions();
    try {
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const sdk = new XLRSDK();
      sdk.loadDefinitionsFromDisk(inputPath);
      const files = sdk.exportRegistry(language, PlayerImportMap);
      files.forEach(([filename, fileContents]) => {
        fs.writeFileSync(path.join(outputDir, filename), fileContents, {});
      });
    } catch (e: any) {
      console.log("");
      console.log(
        chalk.red(`${logSymbols.error} Error exporting XLRs: ${e.message}`),
      );
      this.exit(1);
    }

    return { exitCode: 0 };
  }
}
