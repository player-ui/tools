#!/usr/bin/env node
/**
 * CLI entry point for fluent-generator
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  accessSync,
  constants,
} from "fs";
import { join } from "path";
import type { NamedType, ObjectType } from "@player-tools/xlr";
import { generateFluentBuilder } from "./generator";

interface Manifest {
  version: number;
  capabilities: {
    Assets?: string[];
    Views?: string[];
  };
}

interface CliArgs {
  input: string;
  output: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let input = "";
  let output = "./dist";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "-i" || arg === "--input") {
      input = args[++i] || "";
    } else if (arg === "-o" || arg === "--output") {
      output = args[++i] || "./dist";
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (!input) {
    console.error(
      "Error: Must supply an input directory with `-i` or `--input`",
    );
    printHelp();
    process.exit(1);
  }

  return { input, output };
}

function printHelp(): void {
  console.log(`
fluent-generator - Generate fluent builders from XLR types

Usage:
  fluent-generator -i <input-dir> -o <output-dir>

Options:
  -i, --input   Directory containing manifest.json and XLR JSON files (required)
  -o, --output  Directory to write generated builder files (default: ./dist)
  -h, --help    Show this help message
`);
}

function loadManifest(inputDir: string): Manifest {
  const manifestPath = join(inputDir, "manifest.json");
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }
  const content = readFileSync(manifestPath, "utf-8");
  return JSON.parse(content) as Manifest;
}

function loadXlrType(
  inputDir: string,
  typeName: string,
): NamedType<ObjectType> {
  const typePath = join(inputDir, `${typeName}.json`);
  if (!existsSync(typePath)) {
    throw new Error(`XLR type file not found: ${typePath}`);
  }
  const content = readFileSync(typePath, "utf-8");
  return JSON.parse(content) as NamedType<ObjectType>;
}

/**
 * Validates that the output directory can be created and is writable.
 * Creates the directory if it doesn't exist.
 */
function validateOutputDirectory(outputDir: string): void {
  if (!existsSync(outputDir)) {
    try {
      mkdirSync(outputDir, { recursive: true });
    } catch (error) {
      throw new Error(
        `Cannot create output directory "${outputDir}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  try {
    accessSync(outputDir, constants.W_OK);
  } catch {
    throw new Error(
      `Output directory "${outputDir}" is not writable. Check permissions.`,
    );
  }
}

function writeBuilderFile(
  outputDir: string,
  typeName: string,
  code: string,
): void {
  const fileName =
    typeName
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase()
      .replace(/^-/, "") + ".builder.ts";

  const filePath = join(outputDir, fileName);
  writeFileSync(filePath, code, "utf-8");
  console.log(`  Generated: ${fileName}`);
}

async function main(): Promise<void> {
  const { input, output } = parseArgs();

  console.log("━━━ Fluent Generator ━━━");
  console.log(`Input:  ${input}`);
  console.log(`Output: ${output}`);
  console.log();

  // Validate output directory is writable before processing
  validateOutputDirectory(output);

  console.log("Loading manifest...");
  const manifest = loadManifest(input);
  console.log(`Manifest version: ${manifest.version}`);
  console.log();

  const { Assets = [], Views = [] } = manifest.capabilities;
  const allTypes = [...Assets, ...Views];

  if (allTypes.length === 0) {
    console.log("No types found in manifest capabilities.");
    return;
  }

  console.log(`Processing ${allTypes.length} type(s)...`);
  console.log();

  let succeeded = 0;
  let failed = 0;

  for (const typeName of allTypes) {
    try {
      const xlrType = loadXlrType(input, typeName);
      const code = generateFluentBuilder(xlrType);
      writeBuilderFile(output, typeName, code);
      succeeded++;
    } catch (error) {
      console.error(
        `  Failed to generate ${typeName}: ${error instanceof Error ? error.message : String(error)}`,
      );
      failed++;
    }
  }

  console.log();
  console.log("━━━ Summary ━━━");
  console.log(
    `✔ Generation complete: ${succeeded} succeeded, ${failed} failed`,
  );

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
