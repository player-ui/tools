import * as fs from "fs";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver-types";
import type {
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
  DocumentContext,
} from "@player-tools/json-language-service";

export interface MetricsOutputConfig {
  /** Directory where the output file will be written */
  outputDir?: string;

  /** Name of the JSON output file */
  fileName?: string;
}

/**
 * Normalizes a file path to use consistent separators and format
 */
function normalizePath(filePath: string): string {
  // Convert backslashes to forward slashes for consistency
  const normalized = filePath.replace(/\\/g, "/");

  // Remove file:// protocol if present
  return normalized.replace(/^file:\/\//, "");
}

/**
 * A plugin that writes diagnostic results to a JSON file in a specified output directory
 */
export class MetricsOutput implements PlayerLanguageServicePlugin {
  name = "metrics-output-plugin";

  private outputDir: string;
  private fileName: string;

  // In-memory storage of all results
  private aggregatedResults: Record<string, any> = {};

  constructor(options: MetricsOutputConfig = {}) {
    this.outputDir = options.outputDir || process.cwd();

    // Handle file name, stripping .json extension if provided
    let fileName = options.fileName || "metrics";
    if (fileName.endsWith(".json")) {
      fileName = fileName.split(".")[0]; // Remove extension
    }
    this.fileName = fileName;

    // Initialize with empty content
    this.aggregatedResults = {
      content: {},
    };
  }

  apply(service: PlayerLanguageService): void {
    // Hook into the validation end to capture diagnostics and write output
    service.hooks.onValidateEnd.tap(
      this.name,
      (
        diagnostics: Diagnostic[],
        { documentContext }: { documentContext: DocumentContext },
      ): Diagnostic[] => {
        this.generateFile(diagnostics, documentContext);
        return diagnostics;
      },
    );
  }

  private generateFile(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): string {
    // Ensure the output directory exists
    const fullOutputDir = path.resolve(process.cwd(), this.outputDir);
    fs.mkdirSync(fullOutputDir, { recursive: true });

    // Get the file path from the document URI and normalize it
    const filePath = normalizePath(documentContext.document.uri);

    // Create basic metrics
    const metrics = {
      diagnosticCount: diagnostics.length,
      errors: diagnostics.filter((d) => d.severity === 1).length,
      warnings: diagnostics.filter((d) => d.severity === 2).length,
      info: diagnostics.filter((d) => d.severity === 3).length,
      hints: diagnostics.filter((d) => d.severity === 4).length,
    };

    // Update content for this file
    this.aggregatedResults.content[filePath] = {
      metrics,
      timestamp: new Date().toISOString(),
    };

    // Write the aggregated results to a file
    const outputFilePath = path.join(fullOutputDir, `${this.fileName}.json`);
    fs.writeFileSync(
      outputFilePath,
      JSON.stringify(this.aggregatedResults, null, 2),
      "utf-8",
    );

    return outputFilePath;
  }
}
