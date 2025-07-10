import { Diagnostic } from "vscode-languageserver-types";

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
          const result = parser(match[1]);
          // Check if result is NaN (only relevant for numeric parsers)
          if (typeof result === "number" && isNaN(result)) {
            console.warn(`Failed to parse diagnostic value: ${match[1]}`);
            return undefined;
          }
          return result;
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
