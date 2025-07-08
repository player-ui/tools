import * as fs from "fs";
import * as path from "path";
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
export type MetricFunction = (...args: any[]) => any;

export type MetricValue =
  | Record<string, any>
  | number
  | string
  | boolean
  | MetricFunction;

export interface MetricsOutputConfig {
  /** Directory where the output file will be written */
  outputDir?: string;

  /** Name of the JSON output file */
  fileName?: string;

  /**
   * Custom properties to include at the root level of the output
   */
  rootProperties?: Record<string, any> | MetricFunction;

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
 * Extracts data from diagnostic messages using a pattern
 */
export function extractFromDiagnostics<T>(
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
 * Extracts data from diagnostics
 */
export function extractByData(
  data: string | symbol,
  diagnostics: Diagnostic[],
  parser?: (diagnostic: Diagnostic) => any,
): Record<string, any> {
  const filteredDiagnostics = diagnostics.filter(
    (diagnostic) => diagnostic.data === data,
  );
  if (filteredDiagnostics.length === 0) {
    return {};
  }

  // Default parser that attempts to parse the message as JSON or returns the raw message
  const defaultParser = (diagnostic: Diagnostic): any => {
    try {
      if (diagnostic.message) {
        return JSON.parse(diagnostic.message);
      }
      return diagnostic.message || {};
    } catch (e) {
      return diagnostic.message || {};
    }
  };

  const actualParser = parser || defaultParser;

  // Collect all information from the specified source
  const result: Record<string, any> = {};
  for (const diagnostic of filteredDiagnostics) {
    try {
      const extractedData = actualParser(diagnostic);

      if (typeof extractedData === "object" && extractedData !== null) {
        // If object, merge with existing data
        Object.assign(result, extractedData);
      } else {
        // Otherwise store as separate entries
        const key = `entry_${Object.keys(result).length}`;
        result[key] = extractedData;
      }
    } catch (e) {
      console.warn(
        `Failed to process diagnostic from data ${String(data)}:`,
        e,
      );
    }
  }

  return result; // Always returns an object, even if empty
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
  private rootProperties: Record<string, any> | MetricFunction;
  private stats: Record<string, MetricValue> | MetricFunction;
  private features: Record<string, MetricValue> | MetricFunction;

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
    this.rootProperties = options.rootProperties || {};
    this.stats = options.stats || {};
    this.features = options.features || {};

    // Initialize with root properties
    this.aggregatedResults = {
      ...this.evaluateRootProperties([], {
        log: console,
        document: { uri: "" } as any,
        PlayerContent: {} as any,
      }),
      content: {},
    };

    // Load existing data if available
    this.loadExistingData();
  }

  /**
   * Loads existing data from the output file if it exists
   */
  private loadExistingData(): void {
    const fullOutputDir = path.resolve(process.cwd(), this.outputDir);
    const outputFilePath = path.join(fullOutputDir, `${this.fileName}.json`);

    if (fs.existsSync(outputFilePath)) {
      try {
        const fileContent = fs.readFileSync(outputFilePath, "utf-8");
        const existingData = JSON.parse(fileContent);

        // Preserve the existing content
        if (existingData.content) {
          this.aggregatedResults.content = existingData.content;
        }

        // Get current root properties
        const currentRootProps = this.evaluateRootProperties([], {
          log: console,
          document: { uri: "" } as any,
          PlayerContent: {} as any,
        });

        // Preserve other root properties but keep our rootProperties
        Object.keys(existingData).forEach((key) => {
          if (
            key !== "content" &&
            !Object.keys(currentRootProps).includes(key)
          ) {
            this.aggregatedResults[key] = existingData[key];
          }
        });
      } catch (error) {
        console.warn(`Failed to load existing metrics file: ${error}`);
      }
    }
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

  /**
   * Evaluates root properties, executing it if it's a function
   */
  private evaluateRootProperties(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): Record<string, any> {
    if (typeof this.rootProperties === "function") {
      try {
        const result = this.rootProperties(diagnostics, documentContext);
        if (typeof result === "object" && result !== null) {
          return result;
        }
        return { dynamicRootValue: result };
      } catch (error) {
        documentContext.log.error(`Error evaluating root properties: ${error}`);
        return { error: `Root properties evaluation failed: ${error}` };
      }
    }
    return this.rootProperties;
  }

  /**
   * Evaluates a value, executing it if it's a function
   */
  private evaluateValue(
    value: MetricValue,
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ) {
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
  ): Record<string, any> {
    // If stats is a function, evaluate it directly
    if (typeof this.stats === "function") {
      try {
        const result = this.stats(diagnostics, documentContext);
        if (typeof result === "object" && result !== null) {
          return result;
        }
        return { dynamicStatsValue: result };
      } catch (error) {
        documentContext.log.error(`Error evaluating stats function: ${error}`);
        return { error: `Stats function evaluation failed: ${error}` };
      }
    }

    // Otherwise process each metric in the record
    const result: Record<string, any> = {};
    Object.entries(this.stats).forEach(([key, value]) => {
      result[key] = this.evaluateValue(value, diagnostics, documentContext);
    });

    return result;
  }

  private generateFeatures(
    diagnostics: Diagnostic[],
    documentContext: DocumentContext,
  ): Record<string, any> {
    // If features is a function, evaluate it directly
    if (typeof this.features === "function") {
      try {
        const result = this.features(diagnostics, documentContext);
        if (typeof result === "object" && result !== null) {
          return result;
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
    const result: Record<string, any> = {};
    Object.entries(this.features).forEach(([key, value]) => {
      result[key] = this.evaluateValue(value, diagnostics, documentContext);
    });

    return result;
  }

  /**
   * Reads the current content of the output file
   */
  private readCurrentFile(): Record<string, any> {
    const fullOutputDir = path.resolve(process.cwd(), this.outputDir);
    const outputFilePath = path.join(fullOutputDir, `${this.fileName}.json`);

    if (fs.existsSync(outputFilePath)) {
      try {
        const fileContent = fs.readFileSync(outputFilePath, "utf-8");
        return JSON.parse(fileContent);
      } catch (error) {
        console.warn(`Failed to read existing metrics file: ${error}`);
      }
    }
    return {};
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

    // Create content entry with stats and conditionally add features only if not empty
    const contentEntry: Record<string, any> = { stats };

    // Only add features if there are any
    if (Object.keys(features).length > 0) {
      contentEntry.features = features;
    }

    // Get the current file content
    const currentFileContent = this.readCurrentFile();

    // Evaluate root properties with current diagnostics and context
    const currentRootProps = this.evaluateRootProperties(
      diagnostics,
      documentContext,
    );

    // Create a new result object that merges existing content with new updates
    const updatedResults = {
      // Keep root properties from this instance, potentially dynamically generated
      ...currentRootProps,

      // Preserve any other root properties from the current file
      ...Object.entries(currentFileContent)
        .filter(
          ([key]) =>
            key !== "content" && !Object.keys(currentRootProps).includes(key),
        )
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),

      // Merge content, preserving existing entries and updating the current one
      content: {
        ...(currentFileContent.content || {}),
        [filePath]: contentEntry,
      },
    };

    // Write the updated results to a file
    const outputFilePath = path.join(fullOutputDir, `${this.fileName}.json`);
    fs.writeFileSync(
      outputFilePath,
      JSON.stringify(updatedResults, null, 2),
      "utf-8",
    );

    return outputFilePath;
  }
}
