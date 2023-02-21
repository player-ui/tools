import type { Manifest } from '@player-tools/xlr';
import path from 'path';
import fs from 'fs';
import type { VisitorProps } from './types';

/** export all exported types in the file */
export function tagVisitor(args: VisitorProps): Manifest | undefined {
  const { sourceFiles, converter, outputDirectory } = args;

  const capabilities = new Map<string, Array<string>>();

  sourceFiles.forEach((sourceFile) => {
    const convertedTypes = converter.convertSourceFile(sourceFile);
    if (convertedTypes.data.types.length > 0) {
      convertedTypes.data.types.forEach((type) => {
        fs.writeFileSync(
          path.join(outputDirectory, `${type.name}.json`),
          JSON.stringify(type, undefined, 4)
        );

        const capability = type?.meta?.capability ?? 'unknown';
        if (!capabilities.has(capability)) {
          capabilities.set(capability, []);
        }

        capabilities.get(capability)?.push(type.name);
      });
    }
  });

  if (capabilities.size === 0) {
    return undefined;
  }

  const manifest: Manifest = {
    pluginName: 'Types',
    capabilities,
  };

  return manifest;
}
