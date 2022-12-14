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

  /**
   * Loads definitions from a path on the filesystem
   *
   * @param inputPath - path to the directory to load (above the xlr folder)
   * @param filters - Any filters to apply when loading the types (a positive match will omit)
   * @param transforms - any transforms to apply to the types being loaded
   */
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
          const effectiveType =
            transforms?.reduce(
              (typeAccumulator: NamedType<NodeType>, transformFn) =>
                transformFn(
                  typeAccumulator,
                  capabilityName
                ) as NamedType<NodeType>,
              cType
            ) ?? cType;

          this.registry.add(effectiveType, manifest.pluginName, capabilityName);
        }
      });
    });
  }

  /**
   * Load definitions from a js/ts file in memory
   *
   * @param manifest - The imported XLR manifest module
   * @param filters - Any filters to apply when loading the types (a positive match will omit)
   * @param transforms - any transforms to apply to the types being loaded
   */
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
          const effectiveType =
            transforms?.reduce(
              (typeAccumulator: NamedType<NodeType>, transformFn) =>
                transformFn(
                  typeAccumulator,
                  capabilityName
                ) as NamedType<NodeType>,
              extension
            ) ?? extension;

          this.registry.add(effectiveType, manifest.pluginName, capabilityName);
        }
      });
    });
  }

  /**
   * Returns a Type that has been previously loaded
   *
   * @param id - Type to retrieve
   * @param options - `GetTypeOptions`
   * @returns `NamedType<NodeType>` | `undefined`
   */
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

  /**
   * Returns if a Type with `id` has been loaded into the DSK
   *
   * @param id - Type to retrieve
   * @returns `boolean`
   */
  public hasType(id: string) {
    return this.registry.has(id);
  }

  /**
   * Lists types that have been loaded into the SDK
   *
   * @param filters - Any filters to apply to the types returned (a positive match will omit)
   * @returns `Array<NamedTypes>`
   */
  public listTypes(filters?: Filters) {
    return this.registry.list(filters);
  }

  /**
   * Returns meta information around a registered type
   *
   * @param id - Name of Type to retrieve
   * @returns `TypeMetaData` | `undefined`
   */
  public getTypeInfo(id: string) {
    return this.registry.info(id);
  }

  /**
   * Validates if a JSONC Node follows the XLR Type registered under the `typeName` specified
   *
   * @param typeName - Registered XLR Type to use for validation
   * @param rootNode - Node to validate
   * @returns `Array<ValidationErrors>`
   */
  public validateByName(typeName: string, rootNode: Node) {
    const xlr = this.getType(typeName, { getRawType: true });
    if (!xlr) {
      throw new Error(
        `Type ${typeName} does not exist in registry, can't validate`
      );
    }

    return this.validator.validateType(rootNode, xlr);
  }

  /**
   * Validates if a JSONC Node follows the supplied XLR Type
   *
   * @param type - Type to validate against
   * @param rootNode - Node to validate
   * @returns `Array<ValidationErrors>`
   */
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
      const resolvedType = this.resolveType(type);
      const effectiveType =
        transforms?.reduce(
          (typeAccumulator: NamedType<NodeType>, transformFn) =>
            transformFn(
              typeAccumulator,
              this.registry.info(type.name)?.capability as string
            ) as NamedType<NodeType>,
          resolvedType
        ) ?? resolvedType;

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
