import { test, expect, describe, beforeEach } from 'vitest';
import { CommonExpressions } from '@player-tools/static-xlrs';
import { symbolDisplayToString } from '@player-tools/xlr-utils';
import { ExpressionLanguageService } from '../service';

describe('language-service', () => {
  let service: ExpressionLanguageService;

  beforeEach(() => {
    service = new ExpressionLanguageService({ plugins: [CommonExpressions] });
  });

  test('should auto-complete expressions', () => {
    const completions = service.getCompletionsAtPosition(
      {
        text: 't',
      } as any,
      {
        line: 0,
        character: 1,
      }
    );

    expect(completions).toMatchInlineSnapshot(`
      {
        "entries": [
          {
            "insertText": "trim()",
            "isRecommended": true,
            "kind": "function",
            "name": "trim",
            "sortText": "trim",
          },
          {
            "insertText": "titleCase()",
            "isRecommended": true,
            "kind": "function",
            "name": "titleCase",
            "sortText": "titleCase",
          },
        ],
        "isGlobalCompletion": false,
        "isMemberCompletion": false,
        "isNewIdentifierLocation": true,
      }
    `);
  });

  describe('validations', () => {
    test('ships expression validations when no plugins are registered', () => {
      service.setConfig({
        plugins: [],
      });

      const diagnostics = service.getSemanticDiagnostics({
        text: 'trim()',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`[]`);
    });

    test('should validate number of expression arguments', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'trim()',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 4,
            "messageText": "Expected 1 argument(s), got 0",
            "start": 0,
          },
        ]
      `);
    });

    test('validate basic args', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'containsAny({ "foo": "bar"}, "123")',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 15,
            "messageText": "Expected type 'string' but got 'object'",
            "start": 12,
          },
        ]
      `);
    });

    test('validate nested args', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'containsAny("123", containsAny(123, "123"))',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 3,
            "messageText": "Expected type 'string' but got 'number'",
            "start": 31,
          },
        ]
      `);
    });

    test('working args', () => {
      const diagnostics = service.getSemanticDiagnostics({
        text: 'containsAny("123", "123")',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`[]`);
    });

    test('should validate typos', () => {
      const diagnostics = service.getSyntacticDiagnostics({
        text: 'containsAny("123',
        node: {
          getSourceFile: () => null,
        },
      } as any);

      expect(diagnostics).toMatchInlineSnapshot(`
        [
          {
            "category": 1,
            "code": 1,
            "file": null,
            "length": 16,
            "messageText": "Unclosed quote after \\"123\\" at character 16",
            "start": 0,
          },
        ]
      `);
    });
  });

  describe('quick info', () => {
    test('should get quick info for expression', () => {
      const info = service.getQuickInfoAtPosition(
        {
          text: 'trim()',
          node: {
            getSourceFile: () => null,
          },
        } as any,
        {
          line: 0,
          character: 0,
        }
      );

      expect(
        symbolDisplayToString(info?.displayParts as ts.SymbolDisplayPart[])
      ).toMatchInlineSnapshot(`"function trim(arg: unknown): unknown"`);
    });
  });
});
