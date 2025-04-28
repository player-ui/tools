import { Flags } from "@oclif/core";
import ts from "typescript";
import fs from "fs";
import path from "path";
import globby from "globby";
import logSymbols from "log-symbols";
import { TsConverter } from "@player-tools/xlr-converters";
import type { Manifest } from "@player-tools/xlr";
import chalk from "chalk";
import { BaseCommand } from "../../utils/base-command";
import { pluginVisitor, fileVisitor } from "../../utils/xlr/visitors";
import { Mode, customPrimitives } from "../../utils/xlr/consts";

/**
 * Exports TS Interfaces/Types to XLR format
 */
export default class XLRCompile extends BaseCommand {
  static description = "Compiles typescript files to XLRs format";

  static flags = {
    ...BaseCommand.flags,
    input: Flags.string({
      char: "i",
      description: "An input directory to search for types to export",
      default: "./src",
    }),
    output: Flags.string({
      char: "o",
      description: "Output directory to write results to.",
      default: "./dist",
    }),
    mode: Flags.enum({
      char: "m",
      description:
        "Search strategy for types to export: plugin (default, looks for exported EnchancedPlayerPlugin classes) or type (all exported types)",
      options: ["plugin", "types"],
      default: "plugin",
    }),
  };

  private async getOptions() {
    const { flags } = await this.parse(XLRCompile);
    const config = await this.getPlayerConfig();

    const input = config.xlr?.input ?? flags.input;
    const output = config.xlr?.output ?? flags.output;
    const modeValue = config.xlr?.mode ?? flags.mode;
    return {
      inputPath: input,
      outputDir: path.join(output, "xlr"),
      mode: modeValue === "plugin" ? Mode.PLUGIN : Mode.TYPES,
    };
  }

  async run(): Promise<{
    /** the status code */
    exitCode: number;
  }> {
    const { inputPath, outputDir, mode } = await this.getOptions();
    const inputFiles = globby.sync([
      `${inputPath}/**/*.ts`,
      `${inputPath}/**/*.tsx`,
    ]);
    try {
      this.processTypes(inputFiles, outputDir, {}, mode);
    } catch (e: any) {
      console.log("");
      console.log(
        chalk.red(`${logSymbols.error} Error compiling XLRs: ${e.message}`),
      );
      console.log(chalk.red(`${e.stack}`));
      this.exit(1);
    }

    return { exitCode: 0 };
  }

  /** Serializes ES6 Maps */
  private replacer(key: any, value: any) {
    if (value instanceof Map) {
      return Object.fromEntries(value.entries());
    }

    return value;
  }

  /** Generate extension manifest/description files from an Enhanced Player Plugin */
  private processTypes(
    fileNames: string[],
    outputDirectory: string,
    options: ts.CompilerOptions,
    mode: Mode = Mode.PLUGIN,
  ): void {
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram(fileNames, options);
    fs.mkdirSync(outputDirectory, { recursive: true });

    // Get the checker, we will use it to find more about classes
    const checker = program.getTypeChecker();

    const converter = new TsConverter(checker, customPrimitives);

    let capabilities: Manifest | undefined;

    // Visit every sourceFile in the program
    program.getSourceFiles().forEach((sourceFile) => {
      if (!sourceFile.isDeclarationFile) {
        // Walk the tree to search for classes
        let generatedCapabilites;

        if (mode === Mode.PLUGIN) {
          generatedCapabilites = pluginVisitor({
            sourceFile,
            converter,
            checker,
            outputDirectory,
          });
        } else if (mode === Mode.TYPES) {
          generatedCapabilites = fileVisitor({
            sourceFile,
            converter,
            checker,
            outputDirectory,
          });
        } else {
          throw new Error(
            `Error: Option ${mode} not recognized. Valid options are: plugin or type`,
          );
        }

        if (generatedCapabilites) {
          generatedCapabilites = {
            ...generatedCapabilites,
          };
          if (customPrimitives) {
            generatedCapabilites = {
              ...generatedCapabilites,
              customPrimitives,
            };
          }

          capabilities = generatedCapabilites;
        }
      }
    });

    if (!capabilities) {
      throw new Error("Error: Unable to parse any XLRs in package");
    }

    // print out the manifest files
    const jsonManifest = JSON.stringify(capabilities, this.replacer, 4);
    fs.writeFileSync(path.join(outputDirectory, "manifest.json"), jsonManifest);

    const tsManifestFile = `${[...(capabilities.capabilities?.values() ?? [])]
      .flat(2)
      .map((capability) => {
        return `const ${capability} = require("./${capability}.json")`;
      })
      .join("\n")}

    module.exports = {
      "pluginName": "${capabilities.pluginName}",
      "capabilities": {
        ${[...(capabilities.capabilities?.entries() ?? [])]
          .map(([capabilityName, provides]) => {
            return `"${capabilityName}":[${provides.join(",")}],`;
          })
          .join("\n\t\t")}
      },
      "customPrimitives": [
        ${[capabilities.customPrimitives?.map((i) => `"${i}"`).join(",") ?? ""]}
      ]
    }
`;

    fs.writeFileSync(path.join(outputDirectory, "manifest.js"), tsManifestFile);
  }
}
