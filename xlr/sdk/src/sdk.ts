import type {
  Manifest,
  NamedType,
  NodeType,
  ObjectType,
  TransformFunction,
  TSManifest,
} from '@player-tools/xlr';
import type { TopLevelDeclaration } from '@player-tools/xlr-utils';
import {
  computeEffectiveObject,
  resolveReferenceNode,
} from '@player-tools/xlr-utils';
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
import { simpleTransformGenerator } from './utils';

export interface GetTypeOptions {
  /** Resolves `extends` fields in objects */
  getRawType?: boolean;
}

/**
 * Abstraction for interfacing with XLRs making it more approachable to use without understanding the inner workings of the types and how they are packaged
 */
export class XLRSDK {
  private registry: XLRRegistry;
  private validator: XLRValidator;
  private tsWriter: TSWriter;

  constructor(customRegistry?: XLRRegistry) {
    this.registry = customRegistry ?? new BasicXLRRegistry();
    this.validator = new XLRValidator(this.getType.bind(this));
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
          let effectiveType = cType;

          transforms?.forEach((transformFunction) => {
            effectiveType = transformFunction(
              effectiveType,
              capabilityName
            ) as NamedType;
          });
          this.registry.add(effectiveType, manifest.pluginName, capabilityName);
        }
      });
    });
  }

  public async loadDefinitionsFromModule(
    manifest: TSManifest,
    filters?: Omit<Filters, 'pluginFilter'>,
    transforms?: Array<TransformFunction>
  ) {
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
          let effectiveType = extension;
          transforms?.forEach((transformFunction) => {
            effectiveType = transformFunction(
              effectiveType,
              capabilityName
            ) as NamedType;
          });

          this.registry.add(effectiveType, manifest.pluginName, capabilityName);
        }
      });
    });
  }

  public getType(
    id: string,
    options?: GetTypeOptions
  ): NamedType<NodeType> | undefined {
    let type = this.registry.get(id);
    if (options?.getRawType === true || !type) {
      return type;
    }

    type = this.resolveType(type);

    return fillInGenerics(type) as NamedType;
  }

  public hasType(id: string) {
    return this.registry.has(id);
  }

  public listTypes(filters?: Filters) {
    return this.registry.list(filters);
  }

  public getTypeInfo(id: string) {
    return this.registry.info(id);
  }

  public validateByName(typeName: string, rootNode: Node) {
    const xlr = this.getType(typeName, { getRawType: true });
    if (!xlr) {
      throw new Error(
        `Type ${typeName} does not exist in registry, can't validate`
      );
    }

    return this.validator.validateType(rootNode, xlr);
  }

  public validateByType(type: NodeType, rootNode: Node) {
    return this.validator.validateType(rootNode, type);
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
      let effectiveType = type;
      effectiveType = this.resolveType(type);
      transforms?.forEach((transformFunction) => {
        effectiveType = transformFunction(
          effectiveType,
          this.registry.info(type.name)?.capability as string
        ) as NamedType;
      });
      return effectiveType;
    });

    if (exportType === 'TypeScript') {
      const outputString = this.exportToTypeScript(typesToExport, importMap);
      return [['out.d.ts', outputString]];
    }

    throw new Error(`Unknown export format ${exportType}`);
  }

  private resolveType(type: NodeType) {
    return simpleTransformGenerator('object', 'any', (objectNode) => {
      if (objectNode.extends) {
        const refName = objectNode.extends.ref.split('<')[0];
        let extendedType = this.getType(refName, { getRawType: true });
        if (!extendedType) {
          throw new Error(
            `Error resolving ${objectNode.name}: can't find extended type ${refName}`
          );
        }

        extendedType = resolveReferenceNode(
          objectNode.extends,
          extendedType as NamedType<ObjectType>
        ) as NamedType;
        return {
          ...computeEffectiveObject(
            extendedType as ObjectType,
            objectNode as ObjectType,
            false
          ),
          name: objectNode.name,
          description: objectNode.description,
        };
      }

      return objectNode;
    })(type, 'any') as NamedType;
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
}
