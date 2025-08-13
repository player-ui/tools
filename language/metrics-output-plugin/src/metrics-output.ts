import * as fs from "fs";
import * as path from "path";
import { merge as deepMerge } from "ts-deepmerge";
import { Diagnostic } from "vscode-languageserver-types";
import type {
  PlayerLanguageService,
  PlayerLanguageServicePlugin,
  DocumentContext,
} from "@player-tools/json-language-service";

/**
 * Function that will be called with diagnostics and document context
 * @param diagnostics - Array of diagnostics from validation
 * @param documentContext - Context of the current document
 * @returns Any value that will be included in the metrics output
 */
export type MetricFunction = (
  diagnostics: Diagnostic[],
  documentContext: DocumentContext,
) => unknown;

export type MetricValue =
  | Record<string, unknown>
  | number
  | string
  | boolean
  | MetricFunction;

type RootProps = Record<string, unknown>;

type FileMetrics = {
  stats: Record<string, unknown>;
  features?: Record<string, unknown>;
};

type MetricsReport = RootProps & { content: Record<string, FileMetrics> };

export interface MetricsOutputConfig {
  /** Directory where the output file will be written */
  outputDir?: string;

  /** Name of the JSON output file */
  fileName?: string;

  /**
   * Custom properties to include at the root level of the output
   */
  rootProperties?: RootProps | MetricFunction;

  /**
   * Content-specific stats
   */
  stats?: Record<string, MetricValue> | MetricFunction;

  /**
   * Content-specific features
   */
  features?: Record<string, MetricValue> | MetricFunction;
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

// Narrow ts-deepmerge’s generic return type to what's needed
const merge = deepMerge as <T>(...objects: Array<Partial<T>>) => T;

/**
 * A plugin that writes diagnostic results to a JSON file in a specified output directory.
 * NOTE: This plugin is designed for CLI usage only and should not be used in an IDE.
 */
export class MetricsOutput implements PlayerLanguageServicePlugin {
  name = "metrics-output-plugin";

  private outputDir: string;
  private fileName: string;
  private rootProperties: RootProps | MetricFunction;
  private stats: Record<string, MetricValue> | MetricFunction;
  private features: Record<string, MetricValue> | MetricFunction;

  // In-memory storage of all results
  private aggregatedResults: MetricsReport = {
    content: {},
  };

  private get outputFilePath(): string {
    return path.resolve(this.outputDir, `${this.fileName}.json`);
  }

  constructor(options: MetricsOutputConfig = {}) {
    this.outputDir = options.outputDir || process.cwd();

    // Handle file name, stripping .json extension if provided
    let fileName = options.fileName || "metrics";
    if (fileName.endsWith(".json")) {
      fileName = fileName.split(".")[0]; // Remove extension
    }
    this.fileName = fileName;
    this.rootProperties = options.rootProperties || {};
    this.stats = options.stats || {};
    this.features = options.features || {};

    // initialized at declaration
  }

  apply(service: PlayerLanguageService): void {
    // Hook into the validation end to capture diagnostics and write output
    service.hooks.onValidateEnd.tap(
      this.name,
      (
        diagnostics: Diagnostic[],
        { documentContext }: { documentContext: DocumentContext },
      ): Diagnostic[] => {
        // If metrics file exists, load and append to it
        if (fs.existsSync(this.outputFilePath)) {
          this.loadExistingMetrics();
        }

        this.generateFile(diagnostics, documentContext);

        return diagnostics;
      },
    );
  }

  private loadExistingMetrics(): void {
    try {
      const fileContent = fs.readFileSync(this.outputFilePath, "utf-8");
      const parsed: unknown = JSON.parse(fileContent);
      const existingMetrics: Partial<MetricsReport> =
        parsed && typeof parsed === "object"
          ? (parsed as Partial<MetricsReport>)
          : {};

      // Recursively merge existing metrics with current aggregated results
      this.aggregatedResults = merge<MetricsReport>(
        existingMetrics,
        this.aggregatedResults,
      );
    } catch (error) {
      // If we can't parse existing file, continue with current state
      console.warn(
        `Warning: Could not parse existing metrics file ${this.outputFilePath}. Continuing with current metrics.`,
      );
    }
  }

  // (rootProperties evaluation logic is inlined where used)

  /**
   * Evaluates a value, executing it if it's a function
   */
  private evaluateValue(
    value: MetricValue,
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): unknown {
    if (typeof value === "function") {
      try {
        return value(diagnostics, documentContext);
      } catch (error) {
        documentContext.log.error(`Error evaluating value: ${error}`);
        return { error: `Value evaluation failed: ${error}` };
      }
    }
    return value;
  }

  private generateMetrics(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): Record<string, unknown> {
    // If stats is a function, evaluate it directly
    if (typeof this.stats === "function") {
      try {
        const result = this.stats(diagnostics, documentContext);
        if (
          typeof result === "object" &&
          result !== null &&
          !Array.isArray(result)
        ) {
          return result as Record<string, unknown>;
        }
        return { dynamicStatsValue: result };
      } catch (error) {
        documentContext.log.error(`Error evaluating stats function: ${error}`);
        return { error: `Stats function evaluation failed: ${error}` };
      }
    }

    // Otherwise process each metric in the record
    const result: Record<string, unknown> = {};
    Object.entries(this.stats).forEach(([key, value]) => {
      result[key] = this.evaluateValue(value, diagnostics, documentContext);
    });

    return result;
  }

  private generateFeatures(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): Record<string, unknown> {
    // If features is a function, evaluate it directly
    if (typeof this.features === "function") {
      try {
        const result = this.features(diagnostics, documentContext);
        if (
          typeof result === "object" &&
          result !== null &&
          !Array.isArray(result)
        ) {
          return result as Record<string, unknown>;
        }
        return { dynamicFeaturesValue: result };
      } catch (error) {
        documentContext.log.error(
          `Error evaluating features function: ${error}`,
        );
        return { error: `Features function evaluation failed: ${error}` };
      }
    }

    // Otherwise process each feature in the record
    const result: Record<string, unknown> = {};
    Object.entries(this.features).forEach(([key, value]) => {
      result[key] = this.evaluateValue(value, diagnostics, documentContext);
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

    // Get the file path from the document URI and normalize it
    const filePath = normalizePath(documentContext.document.uri);

    // Generate metrics
    const stats = this.generateMetrics(diagnostics, documentContext);
    const features = this.generateFeatures(diagnostics, documentContext);

    // Build this file's entry
    const newEntry: FileMetrics = {
      stats,
      ...(Object.keys(features).length > 0 ? { features } : {}),
    };

    // Evaluate root properties with current diagnostics and context
    let rootProps: RootProps;
    if (typeof this.rootProperties === "function") {
      try {
        const result = this.rootProperties(diagnostics, documentContext);
        if (
          typeof result === "object" &&
          result !== null &&
          !Array.isArray(result)
        ) {
          rootProps = result as Record<string, unknown>;
        } else {
          rootProps = { dynamicRootValue: result };
        }
      } catch (error) {
        documentContext.log.error(`Error evaluating root properties: ${error}`);
        rootProps = { error: `Root properties evaluation failed: ${error}` };
      }
    } else {
      rootProps = this.rootProperties;
    }

    // Single deep merge of root properties and content for this file
    this.aggregatedResults = merge<MetricsReport>(this.aggregatedResults, {
      ...rootProps,
      content: { [filePath]: newEntry },
    });

    // Write ordered output: all root properties first, then content last
    const outputFilePath = path.join(fullOutputDir, `${this.fileName}.json`);
    const { content, ...root } = this.aggregatedResults;
    fs.writeFileSync(
      outputFilePath,
      JSON.stringify({ ...root, content }, null, 2),
      "utf-8",
    );

    return outputFilePath;
  }
}
