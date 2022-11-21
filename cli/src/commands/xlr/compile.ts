import { Flags } from '@oclif/core';
import ts from 'typescript';
import fs from 'fs';
import path from 'path';
import globby from 'globby';
import logSymbols from 'log-symbols';
import { TsConverter } from '@player-tools/xlr-converters';
import type { Manifest } from '@player-tools/xlr';
import { isNodeExported } from '@player-tools/xlr-utils';
import chalk from 'chalk';
import { BaseCommand } from '../../utils/base-command';

const PLAYER_PLUGIN_INTERFACE_NAME = 'ExtendedPlayerPlugin';
const customPrimitives = [
  'Expression',
  'Asset',
  'Binding',
  'AssetWrapper',
  'Schema.DataType',
];

enum Mode {
  PLUGIN = 'plugin',
  TYPES = 'types',
}

/**
 * Exports TS Interfaces/Types to XLR format
 */
export default class XLRCompile extends BaseCommand {
  static description = 'Compiles typescript files to XLRs format';

  static flags = {
    ...BaseCommand.flags,
    input: Flags.string({
      char: 'i',
      description: 'An input directory to search for types to export',
      default: './src',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output directory to write results to.',
      default: './dist',
    }),
    mode: Flags.enum({
      char: 'm',
      description:
        'Search strategy for types to export: plugin (default, looks for exported EnchancedPlayerPlugin classes) or type (all exported types)',
      options: ['plugin', 'types'],
      default: 'plugin',
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
      outputDir: path.join(output, 'xlr'),
      mode: modeValue === 'plugin' ? Mode.PLUGIN : Mode.TYPES,
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
      this.processPlugin(inputFiles, outputDir, {}, mode);
    } catch (e: any) {
      console.log('');
      console.log(
        chalk.red(`${logSymbols.error} Error compiling XLRs: ${e.message}`)
      );
      console.log(chalk.red(`${e.stack}`));
      return {
        exitCode: 1,
      };
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
  private processPlugin(
    fileNames: string[],
    outputDir: string,
    options: ts.CompilerOptions,
    mode: Mode = Mode.PLUGIN
  ): void {
    // Build a program using the set of root file names in fileNames
    const program = ts.createProgram(fileNames, options);
    fs.mkdirSync(outputDir, { recursive: true });

    // Get the checker, we will use it to find more about classes
    const checker = program.getTypeChecker();
    const capabilities: Manifest = {
      pluginName: 'Unknown Plugin',
    };

    const converter = new TsConverter(checker, customPrimitives);

    /** visit nodes finding exported classes */
    function pluginVisitor(node: ts.Node) {
      // Only consider exported nodes
      if (!isNodeExported(node)) {
        return;
      }

      // Plugins are classes so filter those
      if (ts.isClassDeclaration(node) && node.name) {
        const symbol = checker.getSymbolAtLocation(node.name);
        if (symbol) {
          // look at what they implement
          node.heritageClauses?.forEach((heritage) => {
            capabilities.pluginName =
              node.name?.text || capabilities.pluginName;
            heritage.types.forEach((hInterface) => {
              // check if heritage is right one
              if (
                hInterface.expression.getText() !== PLAYER_PLUGIN_INTERFACE_NAME
              ) {
                return;
              }

              const provides: Map<string, Array<string>> = new Map();
              const typeArgs = hInterface.typeArguments;

              const pluginDec = checker.getTypeAtLocation(hInterface).symbol
                ?.declarations?.[0] as ts.InterfaceDeclaration | undefined;
              // process type parameters to figure out what capabilities are provided
              pluginDec?.typeParameters?.forEach((param, index) => {
                const capabilityType = param.name.getText();
                if (index < (typeArgs?.length ?? 0)) {
                  const exportedCapabilities = typeArgs?.[index] as ts.TypeNode;
                  // if its an array process each type
                  if (ts.isTupleTypeNode(exportedCapabilities)) {
                    const capabilityNames = exportedCapabilities.elements.map(
                      (element) => {
                        if (ts.isTypeReferenceNode(element)) {
                          const referenceSymbol = checker.getSymbolAtLocation(
                            element.typeName
                          );
                          const alias = referenceSymbol
                            ? checker.getAliasedSymbol(referenceSymbol)
                            : undefined;
                          const varDecl = alias?.declarations?.[0];
                          if (
                            varDecl &&
                            (ts.isInterfaceDeclaration(varDecl) ||
                              ts.isTypeAliasDeclaration(varDecl))
                          ) {
                            const capabilityDescription =
                              converter.convertDeclaration(varDecl);
                            const capabilityName =
                              capabilityDescription?.name ?? 'error';
                            fs.writeFileSync(
                              path.join(outputDir, `${capabilityName}.json`),
                              JSON.stringify(
                                capabilityDescription,
                                undefined,
                                4
                              )
                            );
                            return capabilityName;
                          }
                        }

                        throw new Error(
                          `Can't export non reference type ${element.getText()}`
                        );
                      }
                    );

                    provides.set(capabilityType, capabilityNames);
                  } else if (ts.isTypeReferenceNode(exportedCapabilities)) {
                    const capabilityName =
                      exportedCapabilities.typeName.getText();
                    const capabilityDescription =
                      converter.convertTsTypeNode(exportedCapabilities);
                    fs.writeFileSync(
                      path.join(outputDir, `${capabilityName}.json`),
                      JSON.stringify(capabilityDescription, undefined, 4)
                    );
                    provides.set(capabilityType, [capabilityName]);
                  } else {
                    throw new Error(`Can't figure out type ${capabilityType}`);
                  }
                }
              });
              capabilities.capabilities = provides;
            });
          });
        }
      }
    }

    /** export all exported types in the file */
    function fileVisitor(file: ts.SourceFile) {
      const convertedTypes = converter.convertSourceFile(file);
      convertedTypes.data.types.forEach((type) => {
        fs.writeFileSync(
          path.join(outputDir, `${type.name}.json`),
          JSON.stringify(type, undefined, 4)
        );
      });
      capabilities.capabilities = new Map([
        ['Types', convertedTypes.convertedTypes],
      ]);
    }

    // Visit every sourceFile in the program
    program.getSourceFiles().forEach((sourceFile) => {
      if (!sourceFile.isDeclarationFile) {
        // Walk the tree to search for classes
        if (mode === Mode.PLUGIN) {
          ts.forEachChild(sourceFile, pluginVisitor);
        } else if (mode === Mode.TYPES) {
          capabilities.pluginName = 'Types';
          fileVisitor(sourceFile);
        } else {
          throw new Error(
            `Error: Option ${mode} not recognized. Valid options are: plugin or type`
          );
        }
      }
    });

    // print out the manifest files
    const jsonManifest = JSON.stringify(capabilities, this.replacer, 4);
    fs.writeFileSync(path.join(outputDir, 'manifest.json'), jsonManifest);

    const tsManifestFile = `${[...(capabilities.capabilities?.values() ?? [])]
      .flat(2)
      .map((capability) => {
        return `const ${capability} = require('./${capability}.json')`;
      })
      .join('\n')}

module.exports = {
  "pluginName": "${capabilities.pluginName}",
  "capabilities": {
    ${[...(capabilities.capabilities?.entries() ?? [])]
      .map(([capabilityName, provides]) => {
        return `"${capabilityName}":[${provides.join(',')}],`;
      })
      .join('\n\t\t')}
  }
}
`;

    fs.writeFileSync(path.join(outputDir, 'manifest.js'), tsManifestFile);
  }
}
