import type { Manifest } from "@player-tools/xlr";
import path from "path";
import fs from "fs";
import type { VisitorProps } from "./types";
/** export all exported types in the file */
export function fileVisitor(args: VisitorProps): Manifest | undefined {
  const { sourceFile, converter, outputDirectory } = args;
  const convertedTypes = converter.convertSourceFile(sourceFile);

  if (convertedTypes.data.types.length === 0) {
    return undefined;
  }

  const capabilities: Manifest = {
    pluginName: "Types",
  };

  convertedTypes.data.types.forEach((type) => {
    fs.writeFileSync(
      path.join(outputDirectory, `${type.name}.json`),
      JSON.stringify(type, undefined, 4),
    );
  });
  capabilities.capabilities = new Map([
    ["Types", convertedTypes.convertedTypes],
  ]);

  return capabilities;
}
