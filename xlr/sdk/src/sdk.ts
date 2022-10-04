import type {
  Manifest,
  NamedType,
  NodeType,
  TransformFunction,
  TSManifest,
} from '@player-tools/xlr';
import type { TopLevelDeclaration } from '@player-tools/xlr-utils';
import { fillInGenerics } from '@player-tools/xlr-utils';
import type { Node } from 'jsonc-parser';
import { TSWriter } from '@player-tools/xlr-converters';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

import type { XLRRegistry, Filters } from './registry';
import { BasicXLRRegistry } from './registry';
import type { ExportTypes } from './types';
import { XLRValidator } from './validator';

/**
 * Abstraction for interfacing with XLRs making it more approachable to use without understanding the inner workings of the types and how they are packaged
 */
export class XLRSDK {
  private registry: XLRRegistry;
  private validator: XLRValidator;
  private tsWriter: TSWriter;

  constructor(customRegistry?: XLRRegistry) {
    this.registry = customRegistry ?? new BasicXLRRegistry();
    this.validator = new XLRValidator(this.registry);
    this.tsWriter = new TSWriter();
  }

  public loadDefinitionsFromDisk(
    inputPath: string,
    filters?: Omit<Filters, 'pluginFilter'>,
    transforms?: Array<TransformFunction>
  ) {
    const manifest = JSON.parse(
      fs.readFileSync(path.join(inputPath, 'xlr', 'manifest.json')).toString(),
      (key: unknown, value: unknown) => {
        // Custom parser because JSON objects -> JS Objects, not maps
        if (typeof value === 'object' && value !== null) {
          if (key === 'capabilities') {
            return new Map(Object.entries(value));
          }
        }

        return value;
      }
    ) as Manifest;

    manifest.capabilities?.forEach((capabilityList, capabilityName) => {
      if (
        filters?.capabilityFilter &&
        capabilityName.match(filters?.capabilityFilter)
      )
        return;
      capabilityList.forEach((extensionName) => {
        if (!filters?.typeFilter || !extensionName.match(filters?.typeFilter)) {
          const cType: NamedType<NodeType> = JSON.parse(
            fs
              .readFileSync(
                path.join(inputPath, 'xlr', `${extensionName}.json`)
              )
              .toString()
          );
          transforms?.forEach((transform) => transform(cType, capabilityName));
          const resolvedType = fillInGenerics(cType) as NamedType<NodeType>;
          this.registry.add(resolvedType, manifest.pluginName, capabilityName);
        }
      });
    });
  }

  public async loadDefinitionsFromModule(
    inputPath: string,
    filters?: Omit<Filters, 'pluginFilter'>,
    transforms?: Array<TransformFunction>
  ) {
    const importManifest = await import(
      path.join(inputPath, 'xlr', 'manifest.js')
    );
    const manifest = importManifest.default as TSManifest;

    Object.keys(manifest.capabilities)?.forEach((capabilityName) => {
      if (
        filters?.capabilityFilter &&
        capabilityName.match(filters?.capabilityFilter)
      )
        return;
      const capabilityList = manifest.capabilities[capabilityName];
      capabilityList.forEach((extension) => {
        if (
          !filters?.typeFilter ||
          !extension.name.match(filters?.typeFilter)
        ) {
          transforms?.forEach((transform) =>
            transform(extension, extension.name)
          );
          const resolvedType = fillInGenerics(extension) as NamedType<NodeType>;
          this.registry.add(resolvedType, manifest.pluginName, extension.name);
        }
      });
    });
  }

  public getType(id: string) {
    return this.registry.get(id);
  }

  public hasType(id: string) {
    return this.registry.has(id);
  }

  public listTypes(filters?: Filters) {
    return this.registry.list(filters);
  }

  public validate(typeName: string, rootNode: Node) {
    const xlr = this.registry.get(typeName);
    if (!xlr) {
      throw new Error(
        `Type ${typeName} does not exist in registry, can't validate`
      );
    }

    return this.validator.validateType(rootNode, xlr);
  }

  /**
   * Exports the types loaded into the registry to the specified format
   *
   * @param exportType - what format to export as
   * @param importMap - a map of primitive packages to types exported from that package to add import statements
   * @param filters - filter out plugins/capabilities/types you don't want to export
   * @param transforms - transforms to apply to types before exporting them
   * @returns [filename, content][] - Tuples of filenames and content to write
   */
  public exportRegistry(
    exportType: ExportTypes,
    importMap: Map<string, string[]>,
    filters?: Filters,
    transforms?: Array<TransformFunction>
  ): [string, string][] {
    const typesToExport = this.registry.list(filters).map((type) => {
      transforms?.forEach((transformFunction) =>
        transformFunction(
          type,
          this.registry.info(type.name)?.capability as string
        )
      );
      return type;
    });

    if (exportType === 'TypeScript') {
      const outputString = this.exportToTypeScript(typesToExport, importMap);
      return [['out.d.ts', outputString]];
    }

    throw new Error(`Unknown export format ${exportType}`);
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
          /* decorators */ undefined,
          /* modifiers */ undefined,
          ts.factory.createImportClause(
            false,
            undefined,
            ts.factory.createNamedImports(
              applicableImports.map((i) =>
                ts.factory.createImportSpecifier(
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
}
