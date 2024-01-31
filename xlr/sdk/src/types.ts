import type { Node } from "jsonc-parser";

export interface ValidationError {
  /** Error message text */
  message: string;

  /** JSONC node that the error originates from */
  node: Node;

  /** Rough categorization of the error type */
  type: "type" | "missing" | "unknown" | "value" | "unexpected";
}

/** Support Export Formats */
export type ExportTypes = "TypeScript";
