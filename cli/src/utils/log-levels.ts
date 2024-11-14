import { DiagnosticSeverity } from "vscode-languageserver-types";

export const LogLevelsMap = {
  error: DiagnosticSeverity.Error,
  warn: DiagnosticSeverity.Warning,
  info: DiagnosticSeverity.Information,
  trace: DiagnosticSeverity.Hint,
};

export type LogLevelsType = keyof typeof LogLevelsMap;

export const LogLevels = Object.keys(LogLevelsMap);

function isValidLogLevel(level: string): level is LogLevelsType {
  return LogLevels.includes(level);
}

export function stringToLogLevel(level: string): DiagnosticSeverity {
  return isValidLogLevel(level)
    ? LogLevelsMap[level]
    : DiagnosticSeverity.Warning;
}
