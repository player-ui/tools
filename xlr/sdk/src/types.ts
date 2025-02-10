import type { Node } from "jsonc-parser";
import { DiagnosticSeverity } from "vscode-languageserver-types";

export interface ValidationMessage {
  /** Error message text */
  message: string;

  /** JSONC node that the error originates from */
  node: Node;

  /** Rough categorization of the error type */
  type: "type" | "missing" | "unknown" | "value" | "unexpected";

  /** Expected types */
  expected?: string[] | string | number | boolean;

  /** Received types*/
  received?: string | number | boolean;

  /** Diagnostic log level */
  severity?: DiagnosticSeverity;
}

/** Support Export Formats */
export type ExportTypes = "TypeScript";
