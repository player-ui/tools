/** Structured analysis error reporting. */
export interface AnalysisError {
  analyzer: string;
  property: string;
  typeText: string;
  reason: string;
  context?: Record<string, unknown>;
}

/** Logs analysis warnings with consistent formatting and optional context. */
export function logAnalysisWarning(
  analyzer: string,
  message: string,
  context?: Record<string, unknown>,
): void {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[${analyzer}] ${message}`, context ? context : "");
  }
}

/** Logs analysis errors with structured information. */
export function logAnalysisError(error: AnalysisError): void {
  if (process.env.NODE_ENV === "development") {
    console.error(
      `[${error.analyzer}] Failed to analyze property "${error.property}" (${error.typeText}): ${error.reason}`,
      error.context,
    );
  }
}

/** Safely executes an analysis function with error handling. */
export function safeAnalyze<T>({
  analyzer,
  property,
  typeText,
  propertyFn,
  fallback,
}: {
  analyzer: string;
  property: string;
  typeText: string;
  propertyFn: () => T;
  fallback: T;
}): T {
  try {
    return propertyFn();
  } catch (error) {
    logAnalysisError({
      analyzer,
      property,
      typeText,
      reason: error instanceof Error ? error.message : "Unknown error",
      context: { error },
    });
    return fallback;
  }
}
