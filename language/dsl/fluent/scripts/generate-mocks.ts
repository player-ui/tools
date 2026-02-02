import { writeFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join, dirname, basename, resolve } from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import { TsConverter } from "@player-tools/xlr-converters";
import type { NamedType, ObjectType } from "@player-tools/xlr";
import {
  generateFluentBuilder,
  type GeneratorConfig,
} from "@player-tools/fluent-generator";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const CUSTOM_PRIMITIVES = ["Asset", "AssetWrapper", "Binding", "Expression"];

// Non-Asset interfaces that should also have builders generated for testing
const ADDITIONAL_BUILDER_INTERFACES = new Set(["ChoiceItem"]);

function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "")
    .replace(/-asset$/, "");
}

function main(): void {
  // Support command-line arguments for Bazel: --types-dir=... --output-dir=...
  const args = process.argv.slice(2);
  let typesDir = join(SCRIPT_DIR, "../src/core/mocks/types");
  let outputDir = join(SCRIPT_DIR, "../src/core/mocks/generated");

  for (const arg of args) {
    if (arg.startsWith("--types-dir=")) {
      typesDir = resolve(arg.split("=")[1]);
    } else if (arg.startsWith("--output-dir=")) {
      outputDir = resolve(arg.split("=")[1]);
    }
  }

  console.log("━━━ Generating Mock Builders ━━━\n");
  console.log(`Types directory: ${typesDir}`);
  console.log(`Output directory: ${outputDir}\n`);

  // Ensure output directory exists
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Get type files
  const typeFiles = readdirSync(typesDir)
    .filter((f) => f.endsWith(".ts") && !f.startsWith("index"))
    .map((f) => join(typesDir, f));

  console.log(`Found ${typeFiles.length} type file(s)\n`);

  // Create TypeScript program
  const program = ts.createProgram(typeFiles, {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.NodeNext,
    strict: true,
    skipLibCheck: true,
  });

  const typeChecker = program.getTypeChecker();
  const converter = new TsConverter(typeChecker, CUSTOM_PRIMITIVES);

  // First pass: collect all types and their source files
  const typeToSourceFile = new Map<string, string>();
  // Also collect types by source file (for sameFileTypes)
  const sourceFileToTypes = new Map<string, Set<string>>();

  for (const filePath of typeFiles) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) continue;

    const result = converter.convertSourceFile(sourceFile);
    const sourceFileName = basename(filePath, ".ts");

    // Map all types from this file
    const typesInFile = new Set<string>();
    for (const t of result.data.types) {
      if ("name" in t) {
        typeToSourceFile.set(t.name, sourceFileName);
        typesInFile.add(t.name);
      }
    }
    sourceFileToTypes.set(sourceFileName, typesInFile);
  }

  const generatedBuilders: string[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const filePath of typeFiles) {
    const sourceFile = program.getSourceFile(filePath);
    if (!sourceFile) {
      console.error(`Failed to load: ${filePath}`);
      failed++;
      continue;
    }

    try {
      const result = converter.convertSourceFile(sourceFile);

      // Filter to Asset types and additional specified interfaces
      const typesToGenerate = result.data.types.filter(
        (t): t is NamedType<ObjectType> => {
          if (t.type !== "object") return false;
          const obj = t as NamedType<ObjectType>;
          // Include Asset types
          if (obj.extends?.ref.startsWith("Asset")) return true;
          // Include additional specified interfaces
          if ("name" in obj && ADDITIONAL_BUILDER_INTERFACES.has(obj.name))
            return true;
          return false;
        },
      );

      // Get the source file name for this file
      const currentSourceFileName = basename(filePath, ".ts");
      const sameFileTypes = sourceFileToTypes.get(currentSourceFileName);

      for (const typeToGen of typesToGenerate) {
        const config: GeneratorConfig = {
          fluentImportPath: "../../../gen/common.js",
          sameFileTypes,
          typeImportPathGenerator: (typeName: string) => {
            // Look up which file this type is from
            const sourceFileName = typeToSourceFile.get(typeName);
            if (sourceFileName) {
              return `../types/${sourceFileName}.js`;
            }
            // Fallback to kebab-case conversion
            return `../types/${toKebabCase(typeName)}.js`;
          },
        };

        const code = generateFluentBuilder(typeToGen, config);
        const fileName = `${toKebabCase(typeToGen.name)}.builder.ts`;
        const outputPath = join(outputDir, fileName);

        writeFileSync(outputPath, code, "utf-8");
        console.log(`✓ ${fileName}`);
        generatedBuilders.push(fileName.replace(".ts", ".js"));
        succeeded++;
      }
    } catch (error) {
      console.error(
        `✗ ${filePath}: ${error instanceof Error ? error.message : error}`,
      );
      failed++;
    }
  }

  // Generate index.ts
  const indexContent =
    generatedBuilders.map((f) => `export * from "./${f}";`).join("\n") + "\n";
  writeFileSync(join(outputDir, "index.ts"), indexContent, "utf-8");
  console.log(`✓ index.ts`);

  console.log(`\n━━━ Done: ${succeeded} succeeded, ${failed} failed ━━━`);

  if (failed > 0) {
    process.exit(1);
  }
}

main();
