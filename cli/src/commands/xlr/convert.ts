import { Flags } from '@oclif/core';
import path from 'path';
import fs from 'fs';
import ts from 'typescript';
import chalk from 'chalk';
import type { ExportTypes } from '@player-tools/xlr-sdk';
import { XLRSDK } from '@player-tools/xlr-sdk';
import logSymbols from 'log-symbols';
import type { NamedType } from '@player-tools/xlr';
import type { TopLevelDeclaration } from '@player-tools/xlr-utils';
import { TSWriter } from '@player-tools/xlr-converters';
import { BaseCommand } from '../../utils/base-command';

const PlayerImportMap = new Map([
  [
    '@player-ui/types',
    ['Expression', 'Asset', 'Binding', 'AssetWrapper', 'Schema.DataType'],
  ],
]);

/**
 * Converts XLRs into a specific language
 */
export default class XLRConvert extends BaseCommand {
  static description = 'Exports XLRs files to a specific language';

  static flags = {
    ...BaseCommand.flags,
    input: Flags.string({
      char: 'i',
      description: 'An input directory to search for types to export',
      default: './dist',
    }),
    output: Flags.string({
      char: 'o',
      description: 'Output directory to write results to.',
    }),
    lang: Flags.enum({
      char: 'l',
      description:
        'Search strategy for types to export: plugin (default, looks for exported EnchancedPlayerPlugin classes) or type (all exported types)',
      options: ['TypeScript'],
    }),
  };

  private tsWriter = new TSWriter();

  private async getOptions() {
    const { flags } = await this.parse(XLRConvert);

    const { input, output } = flags;

    if (!output) {
      throw new Error(`Need to specify location to export to`);
    }

    const language = flags.lang as ExportTypes;

    if (!language) {
      throw new Error(`Need to specify language to export to`);
    }

    return {
      inputPath: input,
      outputDir: path.join(output, language),
      language,
    };
  }

  private exportToTypeScript(
    typesToExport: NamedType[],
    importMap: Map<string, string[]>
  ): string {
    const referencedImports: Set<string> = new Set();
    const exportedTypes: Map<string, TopLevelDeclaration> = new Map();
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    let resultFile = ts.createSourceFile(
      'output.d.ts',
      '',
      ts.ScriptTarget.ES2017,
      false, // setParentNodes
      ts.ScriptKind.TS
    );

    typesToExport.forEach((typeNode) => {
      const { type, referencedTypes, additionalTypes } =
        this.tsWriter.convertNamedType(typeNode);
      exportedTypes.set(typeNode.name, type);
      additionalTypes?.forEach((additionalType, name) =>
        exportedTypes.set(name, additionalType)
      );
      referencedTypes?.forEach((referencedType) =>
        referencedImports.add(referencedType)
      );
    });

    const typesToPrint: Array<string> = [];

    exportedTypes.forEach((type) =>
      typesToPrint.push(
        printer.printNode(ts.EmitHint.Unspecified, type, resultFile)
      )
    );

    importMap.forEach((imports, packageName) => {
      const applicableImports = imports.filter((i) => referencedImports.has(i));
      resultFile = ts.factory.updateSourceFile(resultFile, [
        ts.factory.createImportDeclaration(
          /* modifiers */ undefined,
          ts.factory.createImportClause(
            false,
            undefined,
            ts.factory.createNamedImports(
              applicableImports.map((i) =>
                ts.factory.createImportSpecifier(
                  false,
                  undefined,
                  ts.factory.createIdentifier(i)
                )
              )
            )
          ),
          ts.factory.createStringLiteral(packageName)
        ),
        ...resultFile.statements,
      ]);
    });

    const headerText = printer.printFile(resultFile);
    const nodeText = typesToPrint.join('\n');
    return `${headerText}\n${nodeText}`;
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
      const types = sdk.exportRegistry();
      let writtenFiles;
      if (language === 'TypeScript') {
        const outputString = this.exportToTypeScript(types, PlayerImportMap);
        writtenFiles = [['out.d.ts', outputString]];
      } else {
        throw new Error(`Unknown export format ${language}`);
      }

      writtenFiles.forEach(([filename, fileContents]) => {
        fs.writeFileSync(path.join(outputDir, filename), fileContents, {});
      });
    } catch (e: any) {
      console.log('');
      console.log(
        chalk.red(`${logSymbols.error} Error exporting XLRs: ${e.message}`)
      );
      return { exitCode: 1 };
    }

    return { exitCode: 0 };
  }
}
