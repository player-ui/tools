import { printParseErrorCode } from "jsonc-parser";
import {
  Diagnostic,
  Range,
  DiagnosticSeverity,
} from "vscode-languageserver-types";

import type { ParseError } from "jsonc-parser";
import type { TextDocument } from "vscode-languageserver-textdocument";

enum ParseErrorCode {
  InvalidSymbol = 1,
  InvalidNumberFormat = 2,
  PropertyNameExpected = 3,
  ValueExpected = 4,
  ColonExpected = 5,
  CommaExpected = 6,
  CloseBraceExpected = 7,
  CloseBracketExpected = 8,
  EndOfFileExpected = 9,
  InvalidCommentToken = 10,
  UnexpectedEndOfComment = 11,
  UnexpectedEndOfString = 12,
  UnexpectedEndOfNumber = 13,
  InvalidUnicode = 14,
  InvalidEscapeCharacter = 15,
  InvalidCharacter = 16,
}

/** Just what the function says */
export function prettyPrintParseErrorCode(code: ParseErrorCode): string {
  switch (code) {
    case ParseErrorCode.CommaExpected:
      return `Expected comma`;
    case ParseErrorCode.ColonExpected:
      return `Expected colon`;
    case ParseErrorCode.PropertyNameExpected:
      return `Expected property name`;
    case ParseErrorCode.ValueExpected:
      return `Expected value`;
    case ParseErrorCode.CloseBraceExpected:
      return `Expected }`;
    case ParseErrorCode.EndOfFileExpected:
      return `Expected end of file`;
    case ParseErrorCode.CloseBracketExpected:
      return `Expected ]`;
    case ParseErrorCode.UnexpectedEndOfString:
      return `Expected "`;
    default:
      return printParseErrorCode(code as any);
  }
}

/** Convert any JSON parsing errors to LSP diagnostics */
export function convertErrorsToDiags(
  document: TextDocument,
  errors: Array<ParseError>
): Array<Diagnostic> {
  return errors.map((parseError) => {
    return Diagnostic.create(
      Range.create(
        document.positionAt(parseError.offset),
        document.positionAt(parseError.offset + parseError.length)
      ),
      prettyPrintParseErrorCode(parseError.error as any as ParseErrorCode),
      DiagnosticSeverity.Error
    );
  });
}
