import * as fs from "fs";
import * as path from "path";
import { Diagnostic } from "vscode-languageserver-types";
import type {
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
  DocumentContext,
} from "@player-tools/json-language-service";

export type StatsValue =
  | Record<string, any>
  | number
  | string
  | boolean
  | ((diagnostics: Diagnostic[], documentContext: DocumentContext) => any);

export interface MetricsOutputConfig {
  /** Directory where the output file will be written */
  outputDir?: string;

  /** Name of the output file */
  fileName?: string;

  /** Custom properties to include at the root level of the output */
  rootProperties?: Record<string, any>;

  /** Content-specific stats */
  stats?: Record<string, StatsValue>;

  /** Content-specific features */
  features?: Record<string, any>;
}

export function extractDiagnostics<T>(
  pattern: RegExp,
  parser: (value: string) => T,
): (diagnostics: Diagnostic[]) => T | undefined {
  return (diagnostics: Diagnostic[]): T | undefined => {
    for (const diagnostic of diagnostics) {
      const match = diagnostic.message.match(pattern);
      if (match && match[1]) {
        try {
          return parser(match[1]);
        } catch (e) {
          console.warn(`Failed to parse diagnostic value: ${match[1]}`, e);
          return undefined;
        }
      }
    }
    return undefined;
  };
}

/**
 * A plugin that writes diagnostic results to a JSON file in a specified output directory
 */
export class MetricsOutput implements PlayerLanguageServicePlugin {
  name = "write-output-plugin";

  private outputDir: string;
  private fileName: string;
  private rootProperties: Record<string, any>;
  private stats: Record<string, StatsValue>;
  private features: Record<string, any>;

  // In-memory storage of all results
  private aggregatedResults: Record<string, any> = {};

  constructor(options: MetricsOutputConfig = {}) {
    this.outputDir = options.outputDir || "target";
    this.fileName = options.fileName || "output";
    this.rootProperties = options.rootProperties || {};
    this.stats = options.stats || {};
    this.features = options.features || {};

    // Initialize with root properties including timestamp
    this.aggregatedResults = {
      timestamp: new Date().toISOString(),
      ...this.rootProperties,
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
      ) => {
        this.generateFile(diagnostics, documentContext);
        return diagnostics;
      },
    );
  }

  /**
   * Process any value, executing it if it's a function
   */
  private processValue(
    value: any,
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): any {
    if (typeof value === "function") {
      try {
        return value(diagnostics, documentContext);
      } catch (error) {
        documentContext.log.error(`Error processing value: ${error}`);
        return { error: `Value processing failed: ${error}` };
      }
    }
    return value;
  }

  private generateMetrics(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    // Process each metric
    Object.entries(this.stats).forEach(([key, value]) => {
      result[key] = this.processValue(value, diagnostics, documentContext);
    });

    return result;
  }

  private generateFeatures(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    // Process each feature
    Object.entries(this.features).forEach(([key, value]) => {
      result[key] = this.processValue(value, diagnostics, documentContext);
    });

    return result;
  }

  private generateFile(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): string {
    // Ensure the output directory exists
    const fullOutputDir = path.resolve(process.cwd(), this.outputDir);
    fs.mkdirSync(fullOutputDir, { recursive: true });

    // Get the file path from the document URI
    const filePath = documentContext.document.uri;

    // Generate metrics
    const stats = this.generateMetrics(diagnostics, documentContext);
    const features = this.generateFeatures(diagnostics, documentContext);

    this.aggregatedResults.content[filePath] = {
      stats,
      features: Object.keys(features).length > 0 ? features : {},
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
